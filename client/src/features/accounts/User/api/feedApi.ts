// src/features/feed/api/feedApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================
// TYPES
// ============================================================

export type FeedBusinessMini = {
  id: number;
  business_name: string;
};

export type FeedOwnerMini = {
  profile_image_url: string | null;
};

export type FeedProperty = {
  name: string;
  value: string;
};

/**
 * Product delivery policy — must stay in sync with the
 * backend `Products.DELIVERY_CHOICES`:
 *
 *   everywhere  → ships to any town the buyer enters
 *   specific    → ships only to the towns in delivery_towns
 *   none        → pickup-only, digital, or unavailable
 */
export type DeliveryScope = 'everywhere' | 'specific' | 'none';

/**
 * A single feed item — either a post or a product.
 * The `kind` field tells you which optional fields are populated.
 */
export type FeedItem = {
  kind: 'post' | 'product';
  id: number;
  created_at: string;
  updated_at: string;
  views: number;

  /**
   * True if this item is managed directly by Youpata.
   * Present on BOTH post and product items.
   */
  is_youpata_managed: boolean;

  // Shared
  image_url: string | null;
  business: FeedBusinessMini;
  owner: FeedOwnerMini | null;

  /**
   * Seller's contact phone — the business owner's
   * `Accounts.phone_number`. Present on BOTH post and
   * product items.
   *
   * `undefined` and `null` are equivalent: when missing,
   * the card hides the Call / WhatsApp row entirely.
   */
  phone_number?: string | null;

  // Post-only
  title?: string;
  body?: string;
  image_public_id?: string | null;

  // Product-only
  name?: string;
  description?: string;
  price?: string | null;
  quantity?: number;
  in_stock?: boolean;
  extra_images?: string[];
  properties?: FeedProperty[];

  // ── Product-only — delivery policy ───────────────────
  //
  // `delivery_scope` is one of 'everywhere' | 'specific' | 'none'.
  // Only present on product items; `undefined` on posts.
  //
  // `delivery_towns` is only meaningful when the scope is
  // 'specific' — an empty list otherwise.
  //
  // `can_be_delivered` is a convenience boolean the frontend
  // can gate its "Buy now" button on without re-deriving the
  // rule from `delivery_scope`. False only when scope is 'none'.
  delivery_scope?: DeliveryScope;
  delivery_towns?: string[];
  can_be_delivered?: boolean;
};

/**
 * Type guard — narrows a `FeedItem` to a product item.
 *
 * Usage:
 *
 *   if (isProductItem(item)) {
 *     // item.name, item.delivery_scope, etc. are non-optional
 *   }
 */
export function isProductItem(
  item: FeedItem,
): item is FeedItem & {
  kind: 'product';
  name?: string;
  delivery_scope?: DeliveryScope;
  delivery_towns?: string[];
  can_be_delivered?: boolean;
} {
  return item.kind === 'product';
}

/**
 * Type guard — narrows a `FeedItem` to a post item.
 */
export function isPostItem(
  item: FeedItem,
): item is FeedItem & {
  kind: 'post';
  title?: string;
  body?: string;
} {
  return item.kind === 'post';
}

export type FeedResponse = {
  count: number;
  next_cursor: string | null;
  has_more: boolean;
  results: FeedItem[];
};

export type FetchFeedOptions = {
  kind?: 'all' | 'post' | 'product';
  limit?: number;
  before?: string | null;
  status?: 'active' | 'paused' | 'draft' | 'closed' | 'suspended' | 'all';
  category?: 'goods' | 'services';
  county?: string;
  region?: string;
};

/**
 * The four feed tabs exposed by the UI. Each maps to its
 * own dedicated backend endpoint, so switching tabs hits a
 * different URL and pagination is naturally per-tab.
 */
export type FeedTab = 'all' | 'youpata' | 'products' | 'posts';

// ============================================================
// HELPERS
// ============================================================

async function parseError(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (data && typeof data === 'object') {
    if (typeof data.message === 'string') return data.message;
    if (typeof data.detail === 'string') return data.detail;

    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      const first = Array.isArray(val) ? val[0] : String(val);
      return `${firstKey}: ${first}`;
    }
  }
  return fallback;
}

/** Build the shared query-string from options. */
function buildQuery(options: FetchFeedOptions): string {
  const p = new URLSearchParams();
  if (options.kind) p.set('kind', options.kind);
  if (options.limit) p.set('limit', String(options.limit));
  if (options.before) p.set('before', options.before);
  if (options.status) p.set('status', options.status);
  if (options.category) p.set('category', options.category);
  if (options.county) p.set('county', options.county);
  if (options.region) p.set('region', options.region);
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not load the feed.'));
  }
  return (await res.json()) as T;
}

async function authGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not load the feed.'));
  }
  return (await res.json()) as T;
}

// ============================================================
// TAB FEEDS — dedicated endpoint per tab
// ============================================================
//
// Each tab maps to its own backend route so a single "which
// URL does this tab hit" table is the source of truth. If
// the backend ever changes a path, only this map changes.
// ============================================================

const TAB_PATHS: Record<FeedTab, string> = {
  all:      '/feed/businesses/all/',
  youpata:  '/feed/businesses/youpata/',
  products: '/feed/businesses/products/',
  posts:    '/feed/businesses/posts/',
};

/**
 * Fetch the feed for a given tab.
 *
 *   fetchTabFeed('all',      { limit: 10 })  → /feed/businesses/all/
 *   fetchTabFeed('youpata',  { limit: 10 })  → /feed/businesses/youpata/
 *   fetchTabFeed('products', { limit: 10 })  → /feed/businesses/products/
 *   fetchTabFeed('posts',    { limit: 10 })  → /feed/businesses/posts/
 *
 * Each call hits a different URL, so React Query (or any
 * other cache keyed on `[tab, ...]`) will treat them as
 * separate queries — switching tabs fetches fresh data,
 * scrolling position and pagination are naturally per-tab.
 */
export async function fetchTabFeed(
  tab: FeedTab,
  options: FetchFeedOptions = {},
): Promise<FeedResponse> {
  const path = `${TAB_PATHS[tab]}${buildQuery(options)}`;
  return publicGet<FeedResponse>(path);
}

// ============================================================
// PER-TAB SHORTHANDS
// ============================================================
//
// If you'd rather call `fetchAllFeed(...)` directly than
// `fetchTabFeed('all', ...)`, these are one-line wrappers
// around the same URLs. Optional — use whatever reads
// better in the calling component.
// ============================================================

export async function fetchAllFeed(
  options: FetchFeedOptions = {},
): Promise<FeedResponse> {
  return fetchTabFeed('all', options);
}

export async function fetchYoupataFeed(
  options: FetchFeedOptions = {},
): Promise<FeedResponse> {
  return fetchTabFeed('youpata', options);
}

export async function fetchProductsFeed(
  options: FetchFeedOptions = {},
): Promise<FeedResponse> {
  return fetchTabFeed('products', options);
}

export async function fetchPostsFeed(
  options: FetchFeedOptions = {},
): Promise<FeedResponse> {
  return fetchTabFeed('posts', options);
}

// ============================================================
// MY FEED — GET /feed/businesses/mine/
// ============================================================

export async function fetchMyFeed(
  token: string | null,
  options: FetchFeedOptions = {},
): Promise<FeedResponse> {
  if (!token) throw new Error('Not authenticated.');
  return authGet<FeedResponse>(
    `/feed/businesses/mine/${buildQuery(options)}`,
    token,
  );
}

// ============================================================
// LEGACY PUBLIC FEED — GET /feed/businesses/
// ============================================================
//
// Kept so existing call sites that use `fetchPublicFeed`
// keep working. Prefer `fetchTabFeed` in new code — it
// hits a dedicated endpoint so each tab is unambiguous.
// ============================================================

export async function fetchPublicFeed(
  options: FetchFeedOptions = {},
): Promise<FeedResponse> {
  return publicGet<FeedResponse>(
    `/feed/businesses/${buildQuery(options)}`,
  );
}