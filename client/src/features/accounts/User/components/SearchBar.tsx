// src/features/accounts/User/components/SearchBar.tsx

import { useEffect, useRef, useState } from 'react';
import './searchBar.css';

/* ============================================================
   SEARCH SCOPES — defined inline, no separate file
   ============================================================ */

export type SearchScope =
  | 'all'
  | 'posts'
  | 'products'
  | 'stories'
  | 'businesses';

type ScopeDef = {
  key: SearchScope;
  label: string;
  /** Value sent to the backend (e.g. `?kind=post`). */
  param: string;
  icon: React.ReactNode;
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

/* ============================================================
   SEARCH BAR COMPONENT
   ============================================================ */

type SearchBarProps = {
  onSearch: (query: string, scope: SearchScope) => void;
  onClear?: () => void;
  scope: SearchScope;
  onScopeChange: (scope: SearchScope) => void;
  placeholder?: string;
  debounceMs?: number;
};

function SearchBar({
  onSearch,
  onClear,
  scope,
  onScopeChange,
  placeholder = 'Search…',
  debounceMs = 300,
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const current = getScope(scope);

  /* ── Debounced live search (fires on query OR scope change) ── */
  useEffect(() => {
    if (value.trim() === '') {
      onClear?.();
      return;
    }

    const t = window.setTimeout(() => {
      onSearch(value.trim(), scope);
    }, debounceMs);

    return () => window.clearTimeout(t);
  }, [value, scope, debounceMs, onSearch, onClear]);

  /* ── Close menu on outside click ─────────────────── */
  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  function handleClear() {
    setValue('');
    onClear?.();
    inputRef.current?.focus();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim(), scope);
  }

  function pickScope(next: SearchScope) {
    onScopeChange(next);
    setMenuOpen(false);
    inputRef.current?.focus();
  }

  return (
    <form
      className={'ua-search' + (focused ? ' is-focused' : '')}
      onSubmit={handleSubmit}
      role="search"
    >
      {/* ── Scope chip ─────────────────────────────── */}
      <div className="ua-search-scope" ref={menuRef}>
        <button
          type="button"
          className="ua-search-scope-btn"
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          title={`Searching: ${current.label}`}
        >
          <span className="ua-search-scope-icon">{current.icon}</span>
          <span className="ua-search-scope-label">{current.label}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{
              transform: menuOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.15s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {menuOpen && (
          <ul className="ua-search-scope-menu" role="listbox">
            {SEARCH_SCOPES.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={s.key === scope}
                  className={
                    'ua-search-scope-item' +
                    (s.key === scope ? ' is-active' : '')
                  }
                  onClick={() => pickScope(s.key)}
                >
                  <span className="ua-search-scope-item-icon">
                    {s.icon}
                  </span>
                  <span>{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Divider ────────────────────────────────── */}
      <span className="ua-search-divider" aria-hidden="true" />

      {/* ── Search icon ────────────────────────────── */}
      <span className="ua-search-icon" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>

      <input
        ref={inputRef}
        type="search"
        className="ua-search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Search"
        autoComplete="off"
      />

      {value && (
        <button
          type="button"
          className="ua-search-clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </form>
  );
}

export default SearchBar;