// src/pages/accounts/User/components/searchScopes.tsx

import type { ReactNode } from 'react';

export type SearchScope =
  | 'all'
  | 'posts'
  | 'products'
  | 'stories'
  | 'businesses';

export type ScopeDef = {
  key: SearchScope;
  label: string;
  /** Value sent to the backend (e.g. `?kind=post`). */
  param: string;
  icon: ReactNode;
};

const IconAll = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconPost = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z" />
    <path d="M8 9h8" />
    <path d="M8 13h6" />
  </svg>
);

const IconProduct = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7l-8-4-8 4 8 4 8-4z" />
    <path d="M4 7v10l8 4 8-4V7" />
    <path d="M12 11v10" />
  </svg>
);

const IconStory = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconBusiness = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l1.5-5h15L21 9" />
    <path d="M4 9v11h16V9" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

export const SEARCH_SCOPES: ScopeDef[] = [
  { key: 'all',        label: 'All',        param: 'all',      icon: IconAll },
  { key: 'posts',      label: 'Posts',      param: 'post',     icon: IconPost },
  { key: 'products',   label: 'Products',   param: 'product',  icon: IconProduct },
  { key: 'stories',    label: 'Stories',    param: 'story',    icon: IconStory },
  { key: 'businesses', label: 'Businesses', param: 'business', icon: IconBusiness },
];

export function getScope(key: SearchScope): ScopeDef {
  return SEARCH_SCOPES.find((s) => s.key === key) ?? SEARCH_SCOPES[0];
}