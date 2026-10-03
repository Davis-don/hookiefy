import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import {
  createBusiness,
  type CreateBusinessPayload,
  type BusinessCategory,
} from '../api/createBusinessApi';
import { BUSINESS_TYPE_GROUPS } from '../data/businessTypes';
import { UNIQUE_COUNTIES } from '../data/kenyaLocations';
import './addBusiness.css';

type AddBusinessProps = {
  onCancel?: () => void;
  onCreated?: () => void;
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
};

const initialState: FormState = {
  businessName: '',
  description: '',
  county: '',
  cityTown: '',
  region: '',
  businessCategory: '',
  businessType: '',
};

function AddBusiness({ onCancel, onCreated }: AddBusinessProps) {
  const toast = useToast();
  const access = useAuthStore((s) => s.access);
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string>('');

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
    mutationFn: (payload: CreateBusinessPayload) =>
      createBusiness(access, payload),

    onSuccess: (res) => {
      toast.success(res.message || 'Business created successfully.');
      queryClient.invalidateQueries({ queryKey: ['business-items'] });
      setForm(initialState);
      setPhase(1);
      onCreated?.();
    },

    onError: (err: any) => {
      toast.error(err?.message || 'Could not create your business.');
    },
  });

  // ── Validators ─────────────────────────────────────────
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

  // ── Navigation ─────────────────────────────────────────
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

  const handleSubmit = () => {
    setError('');
    const err = validatePhase3();
    if (err) return setError(err);

    mutation.mutate({
      businessName: form.businessName.trim(),
      businessCategory: form.businessCategory as BusinessCategory,
      businessType: form.businessType.trim(),
      description: form.description.trim(),
      county: form.county,
      cityTown: form.cityTown,
      region: form.region.trim(),
    });
  };

  const busy = mutation.isPending;

  return (
    <div className="adb-form">
      {/* ── Phase indicator ─────────────────────────── */}
      <div className="adb-steps" aria-hidden="true">
        <span
          className={
            'adb-step' +
            (phase === 1 ? ' is-active' : '') +
            (phase > 1 ? ' is-done' : '')
          }
        >
          <span className="adb-step-num">{phase > 1 ? '✓' : '1'}</span>
          <span className="adb-step-label">Basics</span>
        </span>

        <span className="adb-step-line" />

        <span
          className={
            'adb-step' +
            (phase === 2 ? ' is-active' : '') +
            (phase > 2 ? ' is-done' : '')
          }
        >
          <span className="adb-step-num">{phase > 2 ? '✓' : '2'}</span>
          <span className="adb-step-label">Location</span>
        </span>

        <span className="adb-step-line" />

        <span className={'adb-step' + (phase === 3 ? ' is-active' : '')}>
          <span className="adb-step-num">3</span>
          <span className="adb-step-label">Category & Trade</span>
        </span>
      </div>

      {/* ═══════════════════════════════════════════════
          PHASE 1 — Basics
         ═══════════════════════════════════════════════ */}
      {phase === 1 && (
        <>
          <div className="adb-section">
            <h3 className="adb-section-title">Business details</h3>

            <div className="adb-field">
              <label className="adb-label" htmlFor="adb-name">Business name</label>
              <input
                id="adb-name"
                className="adb-input"
                type="text"
                placeholder="e.g. Mugo Plumbing Services"
                value={form.businessName}
                onChange={(e) => update('businessName', e.target.value)}
                disabled={busy}
              />
            </div>

            <div className="adb-field">
              <label className="adb-label" htmlFor="adb-desc">Description</label>
              <textarea
                id="adb-desc"
                className="adb-input adb-textarea"
                placeholder="What do you offer? What makes you stand out?"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={4}
                disabled={busy}
              />
            </div>
          </div>

          {error && <p className="adb-error">{error}</p>}

          <div className="adb-actions">
            {onCancel && (
              <button
                type="button"
                className="adb-btn adb-btn-ghost"
                onClick={onCancel}
                disabled={busy}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              className="adb-btn adb-btn-primary"
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
          <div className="adb-section">
            <h3 className="adb-section-title">Location</h3>

            <div className="adb-grid">
              <div className="adb-field">
                <label className="adb-label" htmlFor="adb-county">County</label>
                <select
                  id="adb-county"
                  className="adb-input adb-select"
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

              <div className="adb-field">
                <label className="adb-label" htmlFor="adb-city">City / Town</label>
                <select
                  id="adb-city"
                  className="adb-input adb-select"
                  value={form.cityTown}
                  onChange={(e) => update('cityTown', e.target.value)}
                  disabled={busy || !form.county}
                >
                  <option value="" disabled>
                    {form.county ? 'Select city / town' : 'Choose county first'}
                  </option>
                  {availableTowns.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="adb-field">
              <label className="adb-label" htmlFor="adb-region">Region / Area</label>
              <input
                id="adb-region"
                className="adb-input"
                type="text"
                placeholder="e.g. Kasuku, Kawangware, Karen"
                value={form.region}
                onChange={(e) => update('region', e.target.value)}
                disabled={busy}
              />
              <p className="adb-help">
                The specific area or locality where customers can find you.
              </p>
            </div>
          </div>

          {error && <p className="adb-error">{error}</p>}

          <div className="adb-actions">
            <button
              type="button"
              className="adb-btn adb-btn-ghost"
              onClick={goBack}
              disabled={busy}
            >
              Back
            </button>
            <button
              type="button"
              className="adb-btn adb-btn-primary"
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
          <div className="adb-section">
            <h3 className="adb-section-title">What kind of business is this?</h3>

            <div className="adb-cat-grid">
              <button
                type="button"
                className={
                  'adb-cat-tile' +
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
                <span className="adb-cat-icon">📦</span>
                <span className="adb-cat-name">Goods</span>
                <span className="adb-cat-sub">Things you sell</span>
              </button>

              <button
                type="button"
                className={
                  'adb-cat-tile' +
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
                <span className="adb-cat-icon">🛠️</span>
                <span className="adb-cat-name">Services</span>
                <span className="adb-cat-sub">Work you do</span>
              </button>
            </div>
          </div>

          <div className="adb-section">
            <h3 className="adb-section-title">Choose your trade</h3>

            {/* All trades shown, all fully clickable, no fading */}
            <div className="adb-masonry">
              {BUSINESS_TYPE_GROUPS.map((group) => {
                const selected = form.businessType === group.value;
                return (
                  <button
                    key={group.key}
                    type="button"
                    className={
                      'adb-group-tile' + (selected ? ' is-selected' : '')
                    }
                    onClick={() => update('businessType', group.value)}
                    disabled={busy}
                  >
                    <span className="adb-group-icon">{group.icon}</span>
                    <span className="adb-group-label">{group.label}</span>
                    {selected && (
                      <span className="adb-group-check" aria-hidden="true">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {form.businessType && (
              <div className="adb-selected-type">
                <span className="adb-selected-label">Selected type</span>
                <span className="adb-selected-value">{form.businessType}</span>
              </div>
            )}
          </div>

          {error && <p className="adb-error">{error}</p>}

          <div className="adb-actions">
            <button
              type="button"
              className="adb-btn adb-btn-ghost"
              onClick={goBack}
              disabled={busy}
            >
              Back
            </button>
            <button
              type="button"
              className="adb-btn adb-btn-primary"
              onClick={handleSubmit}
              disabled={busy}
            >
              {busy ? <Spinner size={18} label="Saving…" /> : 'Save business'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AddBusiness;