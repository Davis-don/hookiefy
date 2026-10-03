// src/features/businesses/data/businessTypes.ts

export type BusinessCategory = 'goods' | 'services';

export type BusinessTypeGroup = {
  key: string;
  /** Generalised label shown as the tile title. */
  label: string;
  /** Value saved to the backend. Same as label. */
  value: string;
  /** Icon shown on the tile. */
  icon: string;
  /** Which category this belongs to. */
  applies: BusinessCategory[];
};

export const BUSINESS_TYPE_GROUPS: BusinessTypeGroup[] = [
  // ── Goods ──────────────────────────────────────────────
  { key: 'food',          label: 'Food & Beverage',            value: 'Food & Beverage',            icon: '🍽️', applies: ['goods'] },
  { key: 'retail',        label: 'Retail & Wholesale',         value: 'Retail & Wholesale',         icon: '🛍️', applies: ['goods'] },
  { key: 'manufacturing', label: 'Manufacturing & Production', value: 'Manufacturing & Production', icon: '🏭', applies: ['goods'] },
  { key: 'crafts',        label: 'Crafts & Artisans',          value: 'Crafts & Artisans',          icon: '🎨', applies: ['goods'] },
  { key: 'agriculture',   label: 'Agriculture & Livestock',    value: 'Agriculture & Livestock',    icon: '🌾', applies: ['goods','services'] },
  { key: 'vehicle',       label: 'Vehicle & Automotive',       value: 'Vehicle & Automotive',       icon: '🚗', applies: ['goods','services'] },

  // ── Services ───────────────────────────────────────────
  { key: 'construction',  label: 'Construction & Trades',      value: 'Construction & Trades',      icon: '🔧', applies: ['services'] },
  { key: 'tech',          label: 'Software & Technology',      value: 'Software & Technology',      icon: '💻', applies: ['services'] },
  { key: 'home',          label: 'Home & Personal Services',   value: 'Home & Personal Services',   icon: '🏠', applies: ['services'] },
  { key: 'professional',  label: 'Professional Services',      value: 'Professional Services',      icon: '💼', applies: ['services'] },
  { key: 'fashion',       label: 'Fashion & Beauty',           value: 'Fashion & Beauty',           icon: '✂️', applies: ['services'] },
  { key: 'health',        label: 'Health & Wellness',          value: 'Health & Wellness',          icon: '🏥', applies: ['services'] },
  { key: 'education',     label: 'Education & Training',       value: 'Education & Training',       icon: '📚', applies: ['services'] },
  { key: 'transport',     label: 'Transport & Logistics',      value: 'Transport & Logistics',      icon: '🚚', applies: ['services'] },
  { key: 'hospitality',   label: 'Hospitality & Tourism',      value: 'Hospitality & Tourism',      icon: '🏨', applies: ['services'] },
  { key: 'entertainment', label: 'Entertainment & Media',      value: 'Entertainment & Media',      icon: '🎬', applies: ['services'] },
  { key: 'finance',       label: 'Finance & Insurance',        value: 'Finance & Insurance',        icon: '💰', applies: ['services'] },
  { key: 'community',     label: 'Community & Social',         value: 'Community & Social',         icon: '🤝', applies: ['services'] },
  { key: 'utilities',     label: 'Utilities & Services',       value: 'Utilities & Services',       icon: '💡', applies: ['services'] },

  // ── Catch-all ──────────────────────────────────────────
  { key: 'other',         label: 'Other',                      value: 'Other',                      icon: '✨', applies: ['goods','services'] },
];

export function groupsForCategory(
  category: BusinessCategory | ''
): BusinessTypeGroup[] {
  if (!category) return [];
  return BUSINESS_TYPE_GROUPS.filter((g) => g.applies.includes(category));
}