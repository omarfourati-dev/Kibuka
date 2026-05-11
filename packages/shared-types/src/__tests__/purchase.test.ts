import { describe, it, expect } from 'vitest';
import type { Purchase, BookSubscription, PricingPlan, PurchaseType, BookSubscriptionStatus, BookSubscriptionPlan } from '../purchase';

describe('Purchase types', () => {
  it('Purchase type has required fields', () => {
    const p: Purchase = {
      id: 'p1',
      userId: 'u1',
      bookId: 'b1',
      purchaseType: 'single',
      amount: 1.99,
      currency: 'EUR',
      createdAt: '2026-05-09T10:00:00Z',
    };
    expect(p.currency).toBe('EUR');
    expect(p.amount).toBe(1.99);
  });

  it('BookSubscriptionStatus values are valid', () => {
    const statuses: BookSubscriptionStatus[] = ['trialing', 'active', 'past_due', 'canceled'];
    expect(statuses).toContain('active');
    expect(statuses).toContain('canceled');
  });

  it('BookSubscription type has all required fields', () => {
    const sub: BookSubscription = {
      id: 's1',
      userId: 'u1',
      plan: 'monthly',
      status: 'active',
      currentPeriodEnd: '2026-06-09T00:00:00Z',
      cancelAtPeriodEnd: false,
    };
    expect(sub.plan).toBe('monthly');
    expect(sub.cancelAtPeriodEnd).toBe(false);
  });

  it('PricingPlan has all required fields including optional', () => {
    const plan: PricingPlan = {
      id: 'monthly',
      name: 'Monatlich',
      price: 4.99,
      currency: 'EUR',
      interval: 'month',
      features: ['Alle Bücher', 'Offline-Modus'],
      isPopular: true,
      savings: '2 Monate gratis',
    };
    expect(plan.price).toBe(4.99);
    expect(plan.features).toHaveLength(2);
    expect(plan.isPopular).toBe(true);
  });

  it('PurchaseType covers all valid types', () => {
    const types: PurchaseType[] = ['single', 'week_bundle', 'monthly', 'yearly'];
    expect(types).toHaveLength(4);
  });

  it('BookSubscriptionPlan covers monthly and yearly', () => {
    const plans: BookSubscriptionPlan[] = ['monthly', 'yearly'];
    expect(plans).toHaveLength(2);
  });
});
