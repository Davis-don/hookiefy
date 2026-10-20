// src/features/accounts/User/components/SearchResults.tsx

import { getScope, type SearchScope } from './SearchBar';
import './searchResults.css';

type SearchResultsProps = {
  query: string;
  scope: SearchScope;
  onClose: () => void;
};

function SearchResults({ query, scope, onClose }: SearchResultsProps) {
  if (!query) return null;

  const scopeDef = getScope(scope);

  return (
    <section className="sr-shell" aria-label={`Search results for ${query}`}>
      <header className="sr-header">
        <p className="sr-heading">
          <span className="sr-heading-scope">
            {scopeDef.icon}
            <span>{scopeDef.label}</span>
          </span>
          <span className="sr-heading-sep" aria-hidden="true">·</span>
          Results for <strong>{query}</strong>
        </p>
        <button
          type="button"
          className="sr-close"
          onClick={onClose}
          aria-label="Close search results"
        >
          <svg
            width="16"
            height="16"
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
      </header>

      <div className="sr-body">
        {/* ─────────────────────────────────────────────
            Wire your fetch here. Both `query` and
            `scopeDef.param` are ready to send:

              const { data } = useQuery({
                queryKey: ['search', query, scope],
                queryFn: () => searchEverything({
                  q: query,
                  kind: scopeDef.param,
                }),
                enabled: query.length > 0,
              });
            ───────────────────────────────────────────── */}

        <div className="sr-placeholder">
          <div className="sr-placeholder-icon" aria-hidden="true">
            {scopeDef.icon}
          </div>
          <p className="sr-placeholder-title">
            Searching {scopeDef.label.toLowerCase()} for “{query}”…
          </p>
          <p className="sr-placeholder-sub">
            Results will appear here once fetching is wired up.
          </p>
        </div>
      </div>
    </section>
  );
}

export default SearchResults;