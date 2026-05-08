export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';

export interface Space {
  id: string;
  name: string;
  slug: string;
  plan: PlanType;
  ownerId: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}
