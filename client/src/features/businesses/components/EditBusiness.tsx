import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import {
  fetchBusiness,
  updateBusiness,
  type BusinessCategory,
  type BusinessStatus,
  type UpdateBusinessPayload,
} from '../api/businessApi';
import { BUSINESS_TYPE_GROUPS } from '../data/businessTypes';
import { UNIQUE_COUNTIES } from '../data/kenyaLocations';
import './editbusiness.css';

type EditBusinessProps = {
  businessId: number;
  onBack?: () => void;
  onSaved?: () => void;
};

type Phase = 1 | 2 | 3;

type FormState = {
  businessName: string;
  description: string;
  county: string;
  cityTown: string;
  region: string;
  businessCategory: BusinessCategory | '';
  businessType: string;
  status: BusinessStatus;
};

const initialState: FormState = {
  businessName: '',
  description: '',
  county: '',
  cityTown: '',
  region: '',
  businessCategory: '',
  businessType: '',
  status: 'active',
};

function EditBusiness({ businessId, onBack, onSaved }: EditBusinessProps) {
  const toast = useToast();
  const access = useAuthStore((s) => s.access);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const isSuperadmin =
    user?.role === 'superadmin' ||
    (user as any)?.is_superuser === true;

  const [phase, setPhase] = useState<Phase>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string>('');
  const [hydrated, setHydrated] = useState(false);

  const {
    data: business,
    isLoading,
    isError,
    error: loadError,
  } = useQuery({
    queryKey: ['business', businessId, access],
    queryFn: () => fetchBusiness(access, businessId),
    enabled: !!access && !!businessId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (business && !hydrated) {
      setForm({
        businessName: business.business_name || '',
        description: business.description || '',
        county: business.county || '',
        cityTown: business.city_town || '',
        region: business.region || '',
        businessCategory: business.business_category || '',
        businessType: business.business_type || '',
        status: business.status || 'active',
      });
      setHydrated(true);
    }
  }, [business, hydrated]);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const availableTowns = useMemo(() => {
    if (!form.county) return [];
    const c = UNIQUE_COUNTIES.find((x) => x.name === form.county);
    return c?.towns ?? [];
  }, [form.county]);

  const mutation = useMutation({
    mutationFn: (payload: UpdateBusinessPayload) =>
      updateBusiness(access, businessId, payload),

    onSuccess: (res) => {
      toast.success(res.message || 'Business updated.');
      queryClient.invalidateQueries({ queryKey: ['business', businessId] });
      queryClient.invalidateQueries({ queryKey: ['business-items'] });
      onSaved?.();
    },

    onError: (err: any) => {
      toast.error(err?.message || 'Could not save changes.');
    },
  });

  const validatePhase1 = (): string | null => {
    if (!form.businessName.trim()) return 'Please enter the business name.';
    if (!form.description.trim()) return 'Please describe your business.';
    return null;
  };

  const validatePhase2 = (): string | null => {
    if (!form.county) return 'Please select your county.';
    if (!form.cityTown) return 'Please select your city or town.';
    if (!form.region.trim()) return 'Please enter your region or area.';
    return null;
  };

  const validatePhase3 = (): string | null => {
    if (!form.businessCategory) return 'Please choose Goods or Services.';
    if (!form.businessType.trim()) return 'Please choose your trade.';
    return null;
  };

  const goNext = () => {
    setError('');
    if (phase === 1) {
      const err = validatePhase1();
      if (err) return setError(err);
      setPhase(2);
      return;
    }
    if (phase === 2) {
      const err = validatePhase2();
      if (err) return setError(err);
      setPhase(3);
      return;
    }
  };

  const goBack = () => {
    setError('');
    if (phase > 1) setPhase((p) => (p - 1) as Phase);
  };

  const handleSave = () => {
    setError('');
    const err = validatePhase3();
    if (err) return setError(err);

    const payload: UpdateBusinessPayload = {
      businessName: form.businessName.trim(),
      businessCategory: form.businessCategory as BusinessCategory,
      businessType: form.businessType.trim(),
      description: form.description.trim(),
      county: form.county,
      cityTown: form.cityTown,
      region: form.region.trim(),
    };

    if (isSuperadmin) {
      payload.status = form.status;
    }

    mutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="eb-state">
        <Spinner size={20} color="#2563EB" label="Loading business…" />
      </div>
    );
  }

  if (isError || !business) {
    return (
      <div className="eb-state eb-state-error">
        {(loadError as Error)?.message || 'Could not load that business.'}
      </div>
    );
  }

  const busy = mutation.isPending;

  const statusLabel = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="eb-shell">
      {/* ── Top bar ────────────────────────────────── */}
      <div className="eb-topbar">
        <div className="eb-topbar-left">
          {onBack && (
            <button
              type="button"
              className="eb-icon-btn eb-icon-btn-back"
              onClick={onBack}
              aria-label="Cancel edit"
              title="Cancel"
              disabled={busy}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          <span className="eb-topbar-crumb">
            Editing · {business.business_name || 'business'}
          </span>
        </div>
      </div>

      {/* ── Header ─────────────────────────────────── */}
      <div className="eb-header">
        <h2 className="eb-title">Edit business</h2>
        <p className="eb-sub">
          Update the details below. Changes are saved when you press
          &nbsp;<strong>Save changes</strong>.
        </p>
      </div>

      {/* ── Phase indicator ────────────────────────── */}
      <div className="eb-steps" aria-hidden="true">
        <span
          className={
            'eb-step' +
            (phase === 1 ? ' is-active' : '') +
            (phase > 1 ? ' is-done' : '')
          }
        >
          <span className="eb-step-num">{phase > 1 ? '✓' : '1'}</span>
          <span className="eb-step-label">Basics</span>
        </span>

        <span className="eb-step-line" />

        <span
          className={
            'eb-step' +
            (phase === 2 ? ' is-active' : '') +
            (phase > 2 ? ' is-done' : '')
          }
        >
          <span className="eb-step-num">{phase > 2 ? '✓' : '2'}</span>
          <span className="eb-step-label">Location</span>
        </span>

        <span className="eb-step-line" />

        <span className={'eb-step' + (phase === 3 ? ' is-active' : '')}>
          <span className="eb-step-num">3</span>
          <span className="eb-step-label">Category & Trade</span>
        </span>
      </div>

      {/* ═══════════════════════════════════════════════
          PHASE 1 — Basics
         ═══════════════════════════════════════════════ */}
      {phase === 1 && (
        <>
          <div className="eb-section">
            <h3 className="eb-section-title">Business details</h3>

            <div className="eb-field">
              <label className="eb-label" htmlFor="eb-name">Business name</label>
              <input
                id="eb-name"
                className="eb-input"
                type="text"
                value={form.businessName}
                onChange={(e) => update('businessName', e.target.value)}
                disabled={busy}
              />
            </div>

            <div className="eb-field">
              <label className="eb-label" htmlFor="eb-desc">Description</label>
              <textarea
                id="eb-desc"
                className="eb-input eb-textarea"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={4}
                disabled={busy}
              />
            </div>

            {isSuperadmin ? (
              <div className="eb-field">
                <label className="eb-label" htmlFor="eb-status">Status</label>
                <select
                  id="eb-status"
                  className="eb-input eb-select"
                  value={form.status}
                  onChange={(e) =>
                    update('status', e.target.value as BusinessStatus)
                  }
                  disabled={busy}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Draft</option>
                  <option value="closed">Closed</option>
                  <option value="suspended">Suspended</option>
                </select>
                <p className="eb-help">
                  Only superadmins can change the status.
                </p>
              </div>
            ) : (
              <div className="eb-field">
                <label className="eb-label">Status</label>
                <div className="eb-readonly">
                  <span
                    className={`eb-status-pill is-${String(
                      form.status || 'active'
                    )
                      .toLowerCase()
                      .trim()}`}
                  >
                    {statusLabel(form.status || 'active')}
                  </span>
                  <span className="eb-readonly-hint">
                    Managed by the platform.
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && <p className="eb-error">{error}</p>}

          <div className="eb-actions">
            {onBack && (
              <button
                type="button"
                className="eb-btn eb-btn-ghost"
                onClick={onBack}
                disabled={busy}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              className="eb-btn eb-btn-primary"
              onClick={goNext}
              disabled={busy}
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════
          PHASE 2 — Location
         ═══════════════════════════════════════════════ */}
      {phase === 2 && (
        <>
          <div className="eb-section">
            <h3 className="eb-section-title">Location</h3>

            <div className="eb-grid">
              <div className="eb-field">
                <label className="eb-label" htmlFor="eb-county">County</label>
                <select
                  id="eb-county"
                  className="eb-input eb-select"
                  value={form.county}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      county: e.target.value,
                      cityTown: '',
                    }));
                    setError('');
                  }}
                  disabled={busy}
                >
                  <option value="" disabled>Select county</option>
                  {UNIQUE_COUNTIES.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="eb-field">
                <label className="eb-label" htmlFor="eb-city">City / Town</label>
                <select
                  id="eb-city"
                  className="eb-input eb-select"
                  value={form.cityTown}
                  onChange={(e) => update('cityTown', e.target.value)}
                  disabled={busy || !form.county}
                >
                  <option value="" disabled>Select city / town</option>
                  {availableTowns.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="eb-field">
              <label className="eb-label" htmlFor="eb-region">Region / Area</label>
              <input
                id="eb-region"
                className="eb-input"
                type="text"
                value={form.region}
                onChange={(e) => update('region', e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          {error && <p className="eb-error">{error}</p>}

          <div className="eb-actions">
            <button
              type="button"
              className="eb-btn eb-btn-ghost"
              onClick={goBack}
              disabled={busy}
            >
              Back
            </button>
            <button
              type="button"
              className="eb-btn eb-btn-primary"
              onClick={goNext}
              disabled={busy}
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════
          PHASE 3 — Category & Trade
         ═══════════════════════════════════════════════ */}
      {phase === 3 && (
        <>
          <div className="eb-section">
            <h3 className="eb-section-title">What kind of business is this?</h3>

            <div className="eb-cat-grid">
              <button
                type="button"
                className={
                  'eb-cat-tile' +
                  (form.businessCategory === 'goods' ? ' is-selected' : '')
                }
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    businessCategory: 'goods',
                    businessType: '',
                  }));
                  setError('');
                }}
                disabled={busy}
              >
                <span className="eb-cat-icon">📦</span>
                <span className="eb-cat-name">Goods</span>
                <span className="eb-cat-sub">Things you sell</span>
              </button>

              <button
                type="button"
                className={
                  'eb-cat-tile' +
                  (form.businessCategory === 'services' ? ' is-selected' : '')
                }
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    businessCategory: 'services',
                    businessType: '',
                  }));
                  setError('');
                }}
                disabled={busy}
              >
                <span className="eb-cat-icon">🛠️</span>
                <span className="eb-cat-name">Services</span>
                <span className="eb-cat-sub">Work you do</span>
              </button>
            </div>
          </div>

          <div className="eb-section">
            <h3 className="eb-section-title">Choose your trade</h3>

            <div className="eb-masonry">
              {BUSINESS_TYPE_GROUPS.map((group) => {
                const selected = form.businessType === group.value;
                return (
                  <button
                    key={group.key}
                    type="button"
                    className={
                      'eb-group-tile' + (selected ? ' is-selected' : '')
                    }
                    onClick={() => update('businessType', group.value)}
                    disabled={busy}
                  >
                    <span className="eb-group-icon">{group.icon}</span>
                    <span className="eb-group-label">{group.label}</span>
                    {selected && (
                      <span className="eb-group-check" aria-hidden="true">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="eb-error">{error}</p>}

          <div className="eb-actions">
            <button
              type="button"
              className="eb-btn eb-btn-ghost"
              onClick={goBack}
              disabled={busy}
            >
              Back
            </button>
            <button
              type="button"
              className="eb-btn eb-btn-primary"
              onClick={handleSave}
              disabled={busy}
            >
              {busy ? <Spinner size={18} label="Saving…" /> : 'Save changes'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default EditBusiness;