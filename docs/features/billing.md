# Billing (Stripe)

**Feature flag:** `ENABLE_BILLING=false`

Enable billing only after configuring Stripe products and prices. Activating billing without complete configuration will result in broken subscription flows.

---

## Subscription Plans

Plans correspond to Stripe Products. Each product has a monthly price and an optional annual price.

| Plan         | Stripe Product                 | Features                         |
| ------------ | ------------------------------ | -------------------------------- |
| `free`       | No Stripe product needed       | Basic features, no billing       |
| `pro`        | `STRIPE_PRO_PRODUCT_ID`        | RAG, larger limits               |
| `enterprise` | `STRIPE_ENTERPRISE_PRODUCT_ID` | All features, custom limits, SLA |

Plan metadata is synced from Stripe to the `space_plans` table on each subscription event.

---

## Subscription Lifecycle

```
         ┌─────────────┐
         │  trialing   │  New subscription with trial period
         └──────┬──────┘
                │  trial ends or card charged successfully
                ▼
         ┌─────────────┐
         │   active    │  Regular billing, all features enabled
         └──────┬──────┘
                │  payment fails
                ▼
         ┌─────────────┐
         │  past_due   │  Grace period, dunning emails sent via ARQ
         └──────┬──────┘
                │  payment recovered      │  grace period expires
                ▼                         ▼
         ┌─────────────┐          ┌─────────────┐
         │   active    │          │  canceled   │  Features downgraded
         └─────────────┘          └─────────────┘
```

State transitions are driven exclusively by Stripe webhook events. The application never changes subscription state directly.

---

## Webhook Processing

### Security: Signature Verification

Every incoming webhook request is verified using `stripe.Webhook.construct_event()`:

```python
event = stripe.Webhook.construct_event(
    payload=await request.body(),
    sig_header=request.headers["stripe-signature"],
    secret=settings.STRIPE_WEBHOOK_SECRET,
)
```

Requests that fail signature verification return `400` immediately. The webhook secret (`STRIPE_WEBHOOK_SECRET`) is obtained from the Stripe Dashboard's webhook endpoint configuration.

### Idempotent Processing via ARQ

Webhook handlers never perform business logic inline. The handler:

1. Verifies the Stripe signature
2. Saves the raw event JSON to the `stripe_events` table with the Stripe event ID
3. Enqueues an ARQ job: `process_stripe_event_job(stripe_event_id)`
4. Returns `200 OK` to Stripe immediately

The ARQ job performs all business logic. If the job fails and retries, the `stripe_events` table is checked first — if the event has already been processed (`processed_at IS NOT NULL`), the job exits early. This guarantees idempotency even if Stripe delivers the same event multiple times.

### Handled Event Types

| Stripe Event                    | Action                                              |
| ------------------------------- | --------------------------------------------------- |
| `customer.subscription.created` | Create space, set plan to trialing/active           |
| `customer.subscription.updated` | Update plan, sync feature flags                     |
| `customer.subscription.deleted` | Set plan to canceled, downgrade features            |
| `invoice.payment_succeeded`     | Mark subscription active, record payment            |
| `invoice.payment_failed`        | Set subscription to past_due, enqueue dunning email |
| `checkout.session.completed`    | Link Stripe customer to space                       |

---

## Checkout Flow

### New Subscription

1. User clicks "Upgrade to Pro" in the frontend
2. Frontend calls `POST /api/v1/billing/checkout-session`
3. Backend creates a Stripe Checkout Session with the correct price ID and `space_id` in metadata
4. Frontend redirects to `session.url` (Stripe-hosted checkout)
5. User completes payment on Stripe
6. Stripe sends `checkout.session.completed` webhook
7. ARQ job links the Stripe customer to the space

### Customer Portal

For plan changes, cancellations, and payment method updates:

1. Frontend calls `POST /api/v1/billing/portal-session`
2. Backend creates a Stripe Customer Portal session
3. Frontend redirects to `session.url`

---

## Idempotency Keys

All backend-initiated Stripe API calls (creating checkout sessions, refunds, etc.) include an idempotency key:

```python
stripe.checkout.Session.create(
    ...,
    idempotency_key=f"checkout-{space_id}-{timestamp}",
)
```

---

## Environment Variables

| Variable                     | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| `ENABLE_BILLING`             | `true` to enable billing                           |
| `STRIPE_SECRET_KEY`          | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET`      | Webhook signing secret from Stripe Dashboard       |
| `STRIPE_PRO_PRICE_ID`        | Price ID for the Pro monthly plan                  |
| `STRIPE_ENTERPRISE_PRICE_ID` | Price ID for the Enterprise monthly plan           |
| `STRIPE_PUBLISHABLE_KEY`     | Publishable key for frontend Stripe.js             |
| `BILLING_TRIAL_DAYS`         | Trial period in days. Default: `14`                |
