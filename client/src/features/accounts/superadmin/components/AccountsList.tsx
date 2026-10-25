// src/pages/accounts/components/AccountsList.tsx

import { useCallback, useEffect, useState } from 'react';
import {
  listYoupataAccounts,
  updateYoupataAccount,
  updateYoupataAccountPassword,
} from '../api/accounts';
import type { YoupataAccount, Gender } from '../api/accounts';
import { useAuthStore } from '../../../../store/authStore';
import './AccountsList.css';

type RowEditState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  gender: Gender | '';
};

type PasswordDraft = {
  password: string;
  confirmPassword: string;
};

const EMPTY_EDIT: RowEditState = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  gender: '',
};

const EMPTY_PW: PasswordDraft = {
  password: '',
  confirmPassword: '',
};

// Password rules — mirrors NewAccount / Register
function checkPassword(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

function allPasswordChecksPass(c: ReturnType<typeof checkPassword>): boolean {
  return c.length && c.upper && c.lower && c.digit && c.special;
}

function AccountsList() {
  const accessToken = useAuthStore((s) => s.access);

  const [accounts, setAccounts] = useState<YoupataAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // ── Row edit state ─────────────────────────────────────
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<RowEditState>(EMPTY_EDIT);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  // ── Password sub-section inside the editor ─────────────
  const [pwOpen, setPwOpen] = useState(false);
  const [pwDraft, setPwDraft] = useState<PasswordDraft>(EMPTY_PW);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const pwChecks = checkPassword(pwDraft.password);

  // ── Fetch ──────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!accessToken) {
      setError(
        'Your session has expired. Please log in again as a superadmin.',
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await listYoupataAccounts(accessToken);
      setAccounts(rows);
    } catch (err: any) {
      setError(err?.message || 'Could not load accounts.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!accessToken) {
        if (!cancelled) {
          setError(
            'Your session has expired. Please log in again as a superadmin.',
          );
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const rows = await listYoupataAccounts(accessToken);
        if (!cancelled) setAccounts(rows);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Could not load accounts.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  // ── Enter / leave edit mode ────────────────────────────
  const beginEdit = (acc: YoupataAccount) => {
    setEditingId(acc.id);
    setDraft({
      firstName: acc.first_name || '',
      lastName: acc.last_name || '',
      email: acc.email || '',
      phoneNumber: acc.phone_number || '',
      gender: (acc.gender as Gender) || '',
    });
    setRowError(null);
    setPwOpen(false);
    setPwDraft(EMPTY_PW);
    setPwError(null);
    setPwSuccess(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(EMPTY_EDIT);
    setRowError(null);
    setPwOpen(false);
    setPwDraft(EMPTY_PW);
    setPwError(null);
    setPwSuccess(null);
  };

  const updateDraft = (field: keyof RowEditState, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setRowError(null);
  };

  const updatePw = (field: keyof PasswordDraft, value: string) => {
    setPwDraft((prev) => ({ ...prev, [field]: value }));
    setPwError(null);
    setPwSuccess(null);
  };

  // ── Save profile fields ────────────────────────────────
  const saveEdit = async (id: number) => {
    if (!accessToken) {
      setRowError(
        'Your session has expired. Please log in again as a superadmin.',
      );
      return;
    }

    if (!draft.firstName.trim()) {
      setRowError('First name is required.');
      return;
    }
    if (!draft.email.trim()) {
      setRowError('Email is required.');
      return;
    }

    setSavingId(id);
    setRowError(null);

    try {
      const updated = await updateYoupataAccount(
        id,
        {
          firstName: draft.firstName,
          lastName: draft.lastName,
          email: draft.email,
          phoneNumber: draft.phoneNumber,
          gender: draft.gender,
        },
        accessToken,
      );

      setAccounts((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
      // Keep the editor open so the user can also change the password
      // if they want. Only clear the profile error.
      setRowError(null);
    } catch (err: any) {
      setRowError(err?.message || 'Could not save changes.');
    } finally {
      setSavingId(null);
    }
  };

  // ── Update password ────────────────────────────────────
  const savePassword = async (id: number) => {
    if (!accessToken) {
      setPwError(
        'Your session has expired. Please log in again as a superadmin.',
      );
      return;
    }

    if (!pwDraft.password) {
      setPwError('Please enter a new password.');
      return;
    }
    if (!allPasswordChecksPass(pwChecks)) {
      setPwError('Password does not meet all the requirements below.');
      return;
    }
    if (!pwDraft.confirmPassword) {
      setPwError('Please confirm the password.');
      return;
    }
    if (pwDraft.password !== pwDraft.confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }

    setPwSaving(true);
    setPwError(null);
    setPwSuccess(null);

    try {
      await updateYoupataAccountPassword(
        id,
        {
          password: pwDraft.password,
          confirmPassword: pwDraft.confirmPassword,
        },
        accessToken,
      );

      setPwSuccess('Password updated successfully.');
      setPwDraft(EMPTY_PW);
    } catch (err: any) {
      setPwError(err?.message || 'Could not update the password.');
    } finally {
      setPwSaving(false);
    }
  };

  // ── Client-side search ─────────────────────────────────
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? accounts.filter((a) => {
        const hay = [a.email, a.first_name, a.last_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      })
    : accounts;

  const countLabel = loading
    ? 'Loading…'
    : `${visible.length} account${visible.length === 1 ? '' : 's'}${
        needle && visible.length !== accounts.length
          ? ` of ${accounts.length}`
          : ''
      }`;

  return (
    <div className="sa-list">
      {/* Toolbar */}
      <div className="sa-list-toolbar">
        <div className="sa-list-toolbar-left">
          <span className="sa-list-count">{countLabel}</span>
        </div>

        <div className="sa-list-toolbar-right">
          <input
            type="search"
            className="sa-list-search"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading || accounts.length === 0}
          />

          <button
            type="button"
            className="sa-btn sa-btn-ghost"
            onClick={load}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="sa-alert sa-alert-error">{error}</div>}

      {/* Loading skeleton — only on first load */}
      {loading && accounts.length === 0 && (
        <div className="sa-list-skeleton" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="sa-list-skeleton-row" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && accounts.length === 0 && (
        <div className="sa-empty">
          <p>No Youpata-managed accounts yet.</p>
        </div>
      )}

      {/* No results for search */}
      {!loading && accounts.length > 0 && visible.length === 0 && (
        <div className="sa-empty">
          <p>No accounts match “{query}”.</p>
          <button
            type="button"
            className="sa-btn sa-btn-ghost"
            onClick={() => setQuery('')}
          >
            Clear search
          </button>
        </div>
      )}

      {/* Table */}
      {visible.length > 0 && (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Created</th>
                <th className="sa-th-actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((acc) => {
                const isEditing = editingId === acc.id;
                const isSaving = savingId === acc.id;

                const fullName =
                  [acc.first_name, acc.last_name]
                    .filter(Boolean)
                    .join(' ') || '—';

                const genderLabel =
                  acc.gender === 'M' ? 'Male'
                  : acc.gender === 'F' ? 'Female'
                  : acc.gender === 'O' ? 'Other'
                  : '—';

                // ── Inline edit row ────────────────────
                if (isEditing) {
                  return (
                    <tr key={acc.id} className="sa-tr-editing">
                      <td colSpan={6}>
                        <div className="sa-row-editor">
                          {/* Profile fields */}
                          <div className="sa-row-editor-fields">
                            <label className="sa-field">
                              <span>First name</span>
                              <input
                                type="text"
                                value={draft.firstName}
                                onChange={(e) =>
                                  updateDraft('firstName', e.target.value)
                                }
                                disabled={isSaving}
                              />
                            </label>

                            <label className="sa-field">
                              <span>Last name</span>
                              <input
                                type="text"
                                value={draft.lastName}
                                onChange={(e) =>
                                  updateDraft('lastName', e.target.value)
                                }
                                disabled={isSaving}
                              />
                            </label>

                            <label className="sa-field">
                              <span>Email</span>
                              <input
                                type="email"
                                value={draft.email}
                                onChange={(e) =>
                                  updateDraft('email', e.target.value)
                                }
                                disabled={isSaving}
                              />
                            </label>

                            <label className="sa-field">
                              <span>Phone</span>
                              <input
                                type="tel"
                                value={draft.phoneNumber}
                                onChange={(e) =>
                                  updateDraft('phoneNumber', e.target.value)
                                }
                                placeholder="+254…"
                                disabled={isSaving}
                              />
                            </label>

                            <label className="sa-field sa-field-span">
                              <span>Gender</span>
                              <select
                                value={draft.gender}
                                onChange={(e) =>
                                  updateDraft('gender', e.target.value)
                                }
                                disabled={isSaving}
                                className="sa-select"
                              >
                                <option value="">— Not set —</option>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                                <option value="O">Other</option>
                              </select>
                            </label>
                          </div>

                          {rowError && (
                            <p className="sa-alert sa-alert-error">
                              {rowError}
                            </p>
                          )}

                          {/* Profile actions */}
                          <div className="sa-row-editor-actions">
                            <button
                              type="button"
                              className="sa-btn sa-btn-ghost"
                              onClick={cancelEdit}
                              disabled={isSaving || pwSaving}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="sa-btn sa-btn-primary"
                              onClick={() => saveEdit(acc.id)}
                              disabled={isSaving || pwSaving}
                            >
                              {isSaving ? 'Saving…' : 'Save changes'}
                            </button>
                          </div>

                          {/* ── Password section ──────────── */}
                          <div className="sa-row-editor-pw">
                            <button
                              type="button"
                              className="sa-row-editor-pw-toggle"
                              onClick={() => {
                                setPwOpen((v) => !v);
                                setPwError(null);
                                setPwSuccess(null);
                              }}
                              aria-expanded={pwOpen}
                            >
                              <span className="sa-row-editor-pw-caret">
                                {pwOpen ? '▾' : '▸'}
                              </span>
                              Change password
                            </button>

                            {pwOpen && (
                              <div className="sa-row-editor-pw-body">
                                <div className="sa-row-editor-fields">
                                  <label className="sa-field">
                                    <span>New password</span>
                                    <input
                                      type="password"
                                      value={pwDraft.password}
                                      onChange={(e) =>
                                        updatePw('password', e.target.value)
                                      }
                                      autoComplete="new-password"
                                      disabled={pwSaving}
                                    />
                                  </label>

                                  <label className="sa-field">
                                    <span>Confirm password</span>
                                    <input
                                      type="password"
                                      value={pwDraft.confirmPassword}
                                      onChange={(e) =>
                                        updatePw(
                                          'confirmPassword',
                                          e.target.value,
                                        )
                                      }
                                      autoComplete="new-password"
                                      disabled={pwSaving}
                                    />
                                  </label>
                                </div>

                                <ul
                                  className="sa-password-rules"
                                  aria-live="polite"
                                >
                                  <li className={pwChecks.length ? 'is-ok' : ''}>
                                    At least 8 characters
                                  </li>
                                  <li className={pwChecks.upper ? 'is-ok' : ''}>
                                    At least one uppercase letter (A–Z)
                                  </li>
                                  <li className={pwChecks.lower ? 'is-ok' : ''}>
                                    At least one lowercase letter (a–z)
                                  </li>
                                  <li className={pwChecks.digit ? 'is-ok' : ''}>
                                    At least one number (0–9)
                                  </li>
                                  <li className={pwChecks.special ? 'is-ok' : ''}>
                                    At least one special character (! @ # $ % …)
                                  </li>
                                </ul>

                                {pwError && (
                                  <p className="sa-alert sa-alert-error">
                                    {pwError}
                                  </p>
                                )}
                                {pwSuccess && (
                                  <p className="sa-alert sa-alert-success">
                                    {pwSuccess}
                                  </p>
                                )}

                                <div className="sa-row-editor-actions">
                                  <button
                                    type="button"
                                    className="sa-btn sa-btn-primary"
                                    onClick={() => savePassword(acc.id)}
                                    disabled={pwSaving}
                                  >
                                    {pwSaving
                                      ? 'Updating…'
                                      : 'Update password'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // ── Normal row ─────────────────────────
                return (
                  <tr key={acc.id}>
                    <td>{fullName}</td>
                    <td>{acc.email}</td>
                    <td>{genderLabel}</td>
                    <td>{acc.phone_number || '—'}</td>
                    <td>
                      {acc.date_joined
                        ? new Date(acc.date_joined).toLocaleDateString(
                            undefined,
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            },
                          )
                        : '—'}
                    </td>

                    {/* Actions — pencil only */}
                    <td className="sa-td-actions">
                      <button
                        type="button"
                        className="sa-icon-btn"
                        aria-label={`Edit ${acc.email}`}
                        title="Edit account"
                        onClick={() => beginEdit(acc)}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AccountsList;