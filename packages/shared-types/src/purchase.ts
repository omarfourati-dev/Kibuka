export type PurchaseType = 'single' | 'week_bundle' | 'monthly' | 'yearly';
export type BookSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';
export type BookSubscriptionPlan = 'monthly' | 'yearly';

export interface Purchase {
  id: string;
  userId: string;
  bookId: string;
  purchaseType: PurchaseType;
  amount: number;
  currency: 'EUR';
  createdAt: string;
}

export interface BookSubscription {
  id: string;
  userId: string;
  plan: BookSubscriptionPlan;
  status: BookSubscriptionStatus;
  currentPeriodEnd: string; // ISO 8601
  cancelAtPeriodEnd: boolean;
}

export interface PricingPlan {
  id: BookSubscriptionPlan | 'single' | 'week_bundle';
  name: string;
  price: number;
  currency: 'EUR';
  interval?: 'month' | 'year';
  features: string[];
  isPopular?: boolean;
  savings?: string;
}
