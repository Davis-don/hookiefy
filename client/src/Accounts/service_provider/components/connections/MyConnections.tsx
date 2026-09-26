// components/connections/MyConnections.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FiLink,
  FiPhone,
  FiMail,
  FiUser,
  FiLoader,
  FiAlertCircle,
  FiRefreshCw,
  FiChevronUp,
  FiCopy,
  FiCheck,
  FiLock,
  FiUnlock,
} from 'react-icons/fi';
import { useAuthStore } from '../../../../store/authtokenstore';
import './myconnections.css';

/* ─────────── Types ─────────── */

interface ConnectedUser {
  id: number;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender?: string | null;
  profile_image_url: string | null;
  has_profile_image?: boolean | null;
}

interface PaidConnection {
  connection_id: string;
  source?: string;
  status: string;
  status_display: string;
  is_paid?: boolean;
  created_at: string;
  updated_at: string;
  user_role: 'sender' | 'receiver';
  connected_user: ConnectedUser;
  preview_message: string;
  contact_details: {
    phone_number: string;
    email: string;
    full_name: string;
  };
}

interface PaidConnectionsResponse {
  message: string;
  count: number;
  total_count: number;
  data: PaidConnection[];
}

interface ContactResponse {
  success: boolean;
  message: string;
  data: {
    connection_id: string;
    source: string;
    status: string;
    status_display: string;
    is_paid: boolean;
    created_at: string;
    updated_at: string;
    user_role: 'sender' | 'receiver';
    connected_user: ConnectedUser;
    contact_details: {
      phone_number: string;
      email: string;
      full_name: string;
    };
  };
}

/* ─────────── API config ─────────── */

function resolveApiBase(): string {
  // @ts-ignore — Vite injects this
  const envUrl: string | undefined = import.meta.env?.VITE_API_URL;
  const NOTIF_PREFIX = '/notifications';
  if (!envUrl || !envUrl.trim()) return NOTIF_PREFIX;
  const trimmed = envUrl.replace(/\/+$/, '');
  if (trimmed.endsWith(NOTIF_PREFIX)) return trimmed;
  return `${trimmed}${NOTIF_PREFIX}`;
}

function resolveApiOrigin(): string {
  // @ts-ignore — Vite injects this
  const envUrl: string | undefined = import.meta.env?.VITE_API_URL;
  if (!envUrl || !envUrl.trim()) return '';
  return envUrl.replace(/\/+$/, '');
}

const API_BASE = resolveApiBase();
const API_ORIGIN = resolveApiOrigin();

/* ─────────── Auth token ─────────── */

function readStoredToken(): string | null {
  const directKeys = [
    'access_token',
    'accessToken',
    'access',
    'token',
    'jwt',
    'authToken',
  ];
  for (const k of directKeys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v && v.trim() && !v.startsWith('{')) return v;
  }
  const jsonKeys = ['user', 'auth', 'session', 'currentUser'];
  for (const k of jsonKeys) {
    const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const token =
        parsed?.access_token ||
        parsed?.accessToken ||
        parsed?.access ||
        parsed?.token ||
        parsed?.jwt;
      if (typeof token === 'string' && token.trim()) return token;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function useAccessToken(): string | null {
  const store = useAuthStore() as unknown;
  return useMemo(() => {
    if (store && typeof store === 'object') {
      const s = store as Record<string, unknown>;
      const candidates = [
        s.access,
        s.accessToken,
        s.access_token,
        s.token,
        s.jwt,
      ];
      for (const c of candidates) {
        if (typeof c === 'string' && c.trim()) return c;
      }
      const nested = (s.tokens || s.auth) as
        | Record<string, unknown>
        | undefined;
      if (nested) {
        const inner =
          nested.access ||
          nested.accessToken ||
          nested.access_token ||
          nested.token;
        if (typeof inner === 'string' && inner.trim()) return inner;
      }
    }
    return readStoredToken();
  }, [store]);
}

/* ─────────── Fetchers ─────────── */

async function fetchPaidConnections(
  access: string | null
): Promise<PaidConnection[]> {
  if (!access) return [];

  const res = await fetch(`${API_BASE}/connections-paid/`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${access}`,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  const raw = await res.text().catch(() => '');

  if (!res.ok) {
    if (contentType.includes('application/json') && raw) {
      try {
        const parsed = JSON.parse(raw);
        throw new Error(parsed.detail || parsed.message);
      } catch {
        /* fall through */
      }
    }
    if (res.status === 401) throw new Error('Please log in again.');
    throw new Error(
      `Failed to load connections (${res.status}). ${raw.slice(0, 120)}`
    );
  }

  if (!contentType.includes('application/json')) {
    throw new Error(
      `Expected JSON, got "${contentType}". ${raw.slice(0, 120)}`
    );
  }

  const data = JSON.parse(raw) as PaidConnectionsResponse;
  return data.data || [];
}

async function fetchConnectionContact(
  connectionId: string,
  access: string | null
): Promise<ContactResponse['data']> {
  if (!access) throw new Error('Please log in again.');

  const url = `${API_ORIGIN}/connections/contact/${connectionId}/`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${access}`,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  const raw = await res.text().catch(() => '');

  if (res.status === 402) {
    let parsed: any = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      /* ignore */
    }
    throw new Error(
      parsed?.error ||
        'Contact details unlock once the connection is completed.'
    );
  }

  if (!res.ok) {
    if (contentType.includes('application/json') && raw) {
      try {
        const parsed = JSON.parse(raw);
        throw new Error(parsed.error || parsed.detail || parsed.message);
      } catch {
        /* fall through */
      }
    }
    if (res.status === 401) throw new Error('Please log in again.');
    if (res.status === 403)
      throw new Error('You are not part of this connection.');
    if (res.status === 404) throw new Error('Connection not found.');
    throw new Error(
      `Failed to load contact (${res.status}). ${raw.slice(0, 120)}`
    );
  }

  if (!contentType.includes('application/json')) {
    throw new Error(
      `Expected JSON, got "${contentType}". ${raw.slice(0, 120)}`
    );
  }

  const data = JSON.parse(raw) as ContactResponse;
  return data.data;
}

async function markConnectionRead(
  connectionId: string,
  access: string | null
): Promise<void> {
  if (!access) return;
  try {
    await fetch(
      `${API_BASE}/mark-connection-read/${connectionId}/`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${access}`,
        },
      }
    );
  } catch {
    /* non-fatal — dot clears on next poll anyway */
  }
}

/* ─────────── Helpers ─────────── */

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/* ─────────── Card ─────────── */

interface ConnectionCardProps {
  connection: PaidConnection;
  access: string | null;
  forceReveal?: boolean;
  onContactOpened?: (connectionId: string) => void;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  access,
  forceReveal = false,
  onContactOpened,
}) => {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<'phone' | 'email' | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const alreadyMarkedRef = useRef(false);

  const user = connection.connected_user;
  const roleLabel =
    connection.user_role === 'sender'
      ? 'You reached out'
      : 'Reached out to you';

  const paid = connection.is_paid ?? connection.status === 'completed';

  useEffect(() => {
    if (forceReveal && !revealed) {
      setRevealed(true);
      requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
    }
  }, [forceReveal, revealed]);

  const {
    data: contactData,
    isLoading: contactLoading,
    error: contactError,
  } = useQuery({
    queryKey: ['connections', 'contact', connection.connection_id],
    queryFn: () => fetchConnectionContact(connection.connection_id, access),
    enabled: revealed && !!access && paid,
    staleTime: 60_000,
    retry: 1,
  });

  const contact = contactData?.connected_user ?? user;
  const contactErrorMsg = contactError
    ? (contactError as Error).message
    : null;

  useEffect(() => {
    if (!contactData) return;
    if (alreadyMarkedRef.current) return;
    alreadyMarkedRef.current = true;
    markConnectionRead(connection.connection_id, access).then(() => {
      onContactOpened?.(connection.connection_id);
    });
  }, [contactData, connection.connection_id, access, onContactOpened]);

  const copy = async (value: string, kind: 'phone' | 'email') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <article
      ref={cardRef}
      className={`yp-conn-card ${revealed ? 'is-revealed' : ''}`}
    >
      <div className="yp-conn-card-hero">
        <div className="yp-conn-avatar-wrap">
          {user.profile_image_url ? (
            <img
              src={user.profile_image_url}
              alt={user.full_name}
              className="yp-conn-avatar-img"
            />
          ) : (
            <div className="yp-conn-avatar-fallback">
              {getInitials(user.full_name)}
            </div>
          )}
          <span className="yp-conn-online-dot" aria-hidden="true" />
        </div>

        <div className="yp-conn-card-info">
          <h3 className="yp-conn-name">{user.full_name}</h3>
          <span className="yp-conn-role">{roleLabel}</span>
          <span className="yp-conn-date">
            Connected {formatDate(connection.updated_at)}
          </span>
        </div>

        <span className="yp-conn-paid-badge" title="Paid connection">
          <FiCheck /> Paid
        </span>
      </div>

      {!revealed && (
        <button
          type="button"
          className="yp-conn-reveal-btn"
          onClick={() => setRevealed(true)}
          aria-expanded={false}
        >
          <FiUnlock />
          <span>Reveal contact</span>
          <FiLock className="yp-conn-reveal-lock" />
        </button>
      )}

      {revealed && (
        <div className="yp-conn-contact-block">
          {contactLoading && (
            <div className="yp-conn-contact-loading">
              <FiLoader className="yp-conn-spin" />
              <span>Fetching contact details…</span>
            </div>
          )}

          {!contactLoading && contactErrorMsg && (
            <div className="yp-conn-contact-error">
              <FiAlertCircle />
              <span>{contactErrorMsg}</span>
            </div>
          )}

          {!contactLoading && !contactErrorMsg && (
            <>
              <div className="yp-conn-rows">
                <div className="yp-conn-row">
                  <span className="yp-conn-row-icon">
                    <FiPhone />
                  </span>
                  <span className="yp-conn-row-content">
                    <span className="yp-conn-row-label">Phone</span>
                    <span className="yp-conn-row-value">
                      {contact.phone_number || '—'}
                    </span>
                  </span>
                  {contact.phone_number && (
                    <button
                      type="button"
                      className="yp-conn-copy-btn"
                      onClick={() =>
                        copy(contact.phone_number, 'phone')
                      }
                      aria-label="Copy phone number"
                      title="Copy"
                    >
                      {copied === 'phone' ? <FiCheck /> : <FiCopy />}
                    </button>
                  )}
                </div>

                <div className="yp-conn-row">
                  <span className="yp-conn-row-icon">
                    <FiMail />
                  </span>
                  <span className="yp-conn-row-content">
                    <span className="yp-conn-row-label">Email</span>
                    <span className="yp-conn-row-value">
                      {contact.email}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="yp-conn-copy-btn"
                    onClick={() => copy(contact.email, 'email')}
                    aria-label="Copy email"
                    title="Copy"
                  >
                    {copied === 'email' ? <FiCheck /> : <FiCopy />}
                  </button>
                </div>

                <div className="yp-conn-row">
                  <span className="yp-conn-row-icon">
                    <FiUser />
                  </span>
                  <span className="yp-conn-row-content">
                    <span className="yp-conn-row-label">Name</span>
                    <span className="yp-conn-row-value">
                      {contact.first_name} {contact.last_name}
                    </span>
                  </span>
                </div>
              </div>

              <div className="yp-conn-actions">
                <a
                  className="yp-conn-btn yp-conn-btn--primary"
                  href={`tel:${contact.phone_number}`}
                >
                  <FiPhone /> Call
                </a>
                <a
                  className="yp-conn-btn"
                  href={`mailto:${contact.email}`}
                >
                  <FiMail /> Email
                </a>
              </div>
            </>
          )}

          <button
            type="button"
            className="yp-conn-hide-btn"
            onClick={() => setRevealed(false)}
            aria-expanded={true}
          >
            <FiChevronUp /> Hide contact
          </button>
        </div>
      )}
    </article>
  );
};

/* ─────────── Main ─────────── */

interface MyConnectionsProps {
  focusConnectionId?: string | null;
  onContactOpened?: (connectionId: string) => void;
}

const MyConnections: React.FC<MyConnectionsProps> = ({
  focusConnectionId = null,
  onContactOpened,
}) => {
  const access = useAccessToken();

  const {
    data: connections = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['connections', 'paid'],
    queryFn: () => fetchPaidConnections(access),
    enabled: !!access,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const errorMessage = error ? (error as Error).message : null;

  if (isLoading && connections.length === 0) {
    return (
      <div className="yp-conn-page">
        <header className="yp-conn-header">
          <h1 className="yp-conn-title">
            <FiLink /> Connections
          </h1>
          <p className="yp-conn-subtitle">
            Your completed connections appear here.
          </p>
        </header>
        <div className="yp-conn-state">
          <FiLoader className="yp-conn-spin" />
          <p>Loading your connections…</p>
        </div>
      </div>
    );
  }

  if (errorMessage && connections.length === 0) {
    return (
      <div className="yp-conn-page">
        <header className="yp-conn-header">
          <h1 className="yp-conn-title">
            <FiLink /> Connections
          </h1>
        </header>
        <div className="yp-conn-state yp-conn-state--error">
          <FiAlertCircle />
          <p>Couldn't load your connections</p>
          <span className="yp-conn-state-sub">{errorMessage}</span>
          <button
            className="yp-conn-retry"
            onClick={() => refetch()}
            type="button"
          >
            <FiRefreshCw /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="yp-conn-page">
        <header className="yp-conn-header">
          <h1 className="yp-conn-title">
            <FiLink /> Connections
          </h1>
          <p className="yp-conn-subtitle">
            Your completed connections appear here.
          </p>
        </header>
        <div className="yp-conn-state yp-conn-state--empty">
          <div className="yp-conn-empty-icon">
            <FiLink />
          </div>
          <p>No connections yet</p>
          <span className="yp-conn-state-sub">
            Once you complete a payment and a connection is confirmed,
            the person will show up here.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="yp-conn-page">
      <header className="yp-conn-header">
        <div className="yp-conn-header-row">
          <h1 className="yp-conn-title">
            <FiLink /> Connections
          </h1>
          <span className="yp-conn-count">
            {connections.length}
            {isFetching ? ' · syncing…' : ''}
          </span>
        </div>
        <p className="yp-conn-subtitle">
          Tap "Reveal contact" to see phone &amp; email.
        </p>
      </header>

      <div className="yp-conn-grid">
        {connections.map((c) => (
          <ConnectionCard
            key={c.connection_id}
            connection={c}
            access={access}
            forceReveal={
              !!focusConnectionId &&
              focusConnectionId === c.connection_id
            }
            onContactOpened={onContactOpened}
          />
        ))}
      </div>
    </div>
  );
};

export default MyConnections;