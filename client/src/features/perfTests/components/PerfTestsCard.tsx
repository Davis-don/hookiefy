// src/features/perfTests/components/PerfTestsCard.tsx

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { usePerfTestsManual } from '../hooks/usePerfTests';
import type { PerfRunResponse } from '../api/perfTestsApi';
import Speedometer from './Speedometer';
import './perftests.css';

function fmt(v: number | undefined, decimals = 2): string {
  if (v === undefined || v === null || !isFinite(v)) return '—';
  return v.toFixed(decimals);
}

/* Gauge scales */
const MAX_UPLOAD_SECONDS = 20;
const MAX_CREATE_SECONDS = 5;
const MAX_TOTAL_SECONDS  = 30;

function gaugeInverted(value: number, max: number): number {
  if (!value || value <= 0) return 0;
  if (value >= max) return 100;
  return Math.min(100, (value / max) * 100);
}

function PerfTestsCard() {
  const access = useAuthStore((s) => s.access);
  const queryClient = useQueryClient();

  /* ── Manual mutation — fires only when user clicks ── */
  const mutation = usePerfTestsManual();

  /* ── Read cached result (survives re-renders) ─────── */
  const cached = queryClient.getQueryData<PerfRunResponse>([
    'perf-tests',
    'manual-result',
  ]);

  /* ── Whatever the mutation returned, or the cache ─── */
  const data = mutation.data ?? cached;

  const imageCycle = data?.result?.image_cycle;
  const fullCycle = data?.result?.full_cycle;
  const summary = data?.result?.summary;

  const uploadSec = imageCycle?.upload_seconds ?? 0;
  const createSec = fullCycle?.total_create_seconds ?? 0;
  const totalSec = summary?.total_seconds ?? 0;

  const uploadGauge = gaugeInverted(uploadSec, MAX_UPLOAD_SECONDS);
  const createGauge = gaugeInverted(createSec, MAX_CREATE_SECONDS);
  const totalGauge = gaugeInverted(totalSec, MAX_TOTAL_SECONDS);

  const failed = summary?.tests_failed ?? 0;
  const hasAnyData = !!data?.result;
  const isRunning = mutation.isPending;
  const isError = mutation.isError;
  const neverRan = !data && !isRunning && !isError;

  const status = useMemo(() => {
    if (isRunning) return { label: 'Running…', tone: 'blue' as const };
    if (isError) return { label: 'Error', tone: 'orange' as const };
    if (failed > 0)
      return { label: `${failed} failed`, tone: 'orange' as const };
    if (neverRan) return { label: 'Idle', tone: 'blue' as const };
    return { label: 'Healthy', tone: 'emerald' as const };
  }, [isRunning, isError, failed, neverRan]);

  const buttonLabel = isRunning
    ? 'Running…'
    : hasAnyData
      ? 'Run tests again'
      : 'Run tests';

  const handleRun = () => {
    if (isRunning) return;
    if (!access) return;
    mutation.mutate();
  };

  return (
    <div className="perf-card">
      <div className="perf-glow" aria-hidden="true" />

      <header className="perf-head">
        <div className="perf-head-left">
          <div className="perf-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12A10 10 0 1 1 12 2" />
              <path d="M22 4 12 14" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>
          <div>
            <p className="perf-label">Performance Tests</p>
            <p className="perf-sub">
              Click "Run tests" to measure upload, create, and cleanup.
            </p>
          </div>
        </div>

        <div className="perf-head-right">
          <span className={`perf-pill perf-pill-${status.tone}`}>
            <span className="perf-dot" />
            {status.label}
          </span>
        </div>
      </header>

      <div className="perf-gauges">
        <Speedometer
          value={uploadGauge}
          label="Upload"
          display={
            isRunning && !hasAnyData ? '…' : fmt(uploadSec, 2)
          }
          unit="s/img"
          hint={
            imageCycle
              ? `${fmt(imageCycle.image_size_kb, 0)} KB`
              : '—'
          }
          tone="violet"
          settling={isRunning}
        />
        <Speedometer
          value={createGauge}
          label="Create"
          display={
            isRunning && !hasAnyData ? '…' : fmt(createSec, 2)
          }
          unit="s"
          hint={
            fullCycle
              ? `${Object.keys(fullCycle.timings ?? {}).length} steps`
              : '—'
          }
          tone="emerald"
          settling={isRunning}
        />
        <Speedometer
          value={totalGauge}
          label="Total"
          display={
            isRunning && !hasAnyData ? '…' : fmt(totalSec, 2)
          }
          unit="s"
          hint={
            summary ? `${summary.tests_run} tests` : '—'
          }
          tone="blue"
          settling={isRunning}
        />
      </div>

      <footer className="perf-foot">
        <div className="perf-foot-item">
          <span className="perf-foot-label">Delete img</span>
          <span className="perf-foot-value">
            {isRunning && !hasAnyData
              ? '—'
              : `${fmt(imageCycle?.delete_seconds, 2)} s`}
          </span>
        </div>
        <span className="perf-foot-divider" aria-hidden="true" />
        <div className="perf-foot-item">
          <span className="perf-foot-label">Cleanup DB</span>
          <span className="perf-foot-value">
            {isRunning && !hasAnyData
              ? '—'
              : `${fmt(
                  fullCycle?.timings?.cleanup_db_seconds,
                  2,
                )} s`}
          </span>
        </div>
        <span className="perf-foot-divider" aria-hidden="true" />
        <div className="perf-foot-item">
          <span className="perf-foot-label">Status</span>
          <span className="perf-foot-value">
            {neverRan
              ? 'Not run yet'
              : isRunning
                ? 'Running…'
                : 'Done'}
          </span>
        </div>
      </footer>

      {/* ── Primary action — the only way to trigger a run ── */}
      <button
        type="button"
        className="perf-run-btn"
        onClick={handleRun}
        disabled={isRunning || !access}
      >
        {isRunning ? (
          <>
            <span className="perf-run-btn-spinner" aria-hidden="true" />
            Running…
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" />
            </svg>
            {buttonLabel}
          </>
        )}
      </button>

      {isError && (
        <p className="perf-error">
          {(mutation.error as Error)?.message ||
            'Could not run performance tests.'}
        </p>
      )}
    </div>
  );
}

export default PerfTestsCard;