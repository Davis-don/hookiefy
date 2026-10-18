// src/features/perfTests/components/PerfTestsCard.tsx

import { useMemo } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { usePerfTestsLive } from '../hooks/usePerfTests';
import Speedometer from './Speedometer';
import './perftests.css';

function fmt(v: number | undefined, decimals = 2): string {
  if (v === undefined || v === null || !isFinite(v)) return '—';
  return v.toFixed(decimals);
}

/* Gauge scales */
const MAX_UPLOAD_SECONDS = 20;
const MAX_CREATE_SECONDS = 5;
const MAX_TOTAL_SECONDS = 30;

function gaugeInverted(value: number, max: number): number {
  if (!value || value <= 0) return 0;
  if (value >= max) return 100;
  return Math.min(100, (value / max) * 100);
}

function PerfTestsCard() {
  const access = useAuthStore((s) => s.access);

  const { data, isFetching, isError, error, refetch } = usePerfTestsLive(
    {},
    { enabled: !!access, intervalMs: 60_000 },
  );

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

  const status = useMemo(() => {
    if (isFetching) return { label: 'Testing…', tone: 'blue' as const };
    if (isError) return { label: 'Error', tone: 'orange' as const };
    if (failed > 0)
      return { label: `${failed} failed`, tone: 'orange' as const };
    return { label: 'Healthy', tone: 'emerald' as const };
  }, [isFetching, isError, failed]);

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
              Upload · Create · Cleanup timings
            </p>
          </div>
        </div>

        <div className="perf-head-right">
          <span className={`perf-pill perf-pill-${status.tone}`}>
            <span className="perf-dot" />
            {status.label}
          </span>
          <button
            type="button"
            className="perf-refresh"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Re-run now"
          >
            {isFetching ? '…' : '↻'}
          </button>
        </div>
      </header>

      <div className="perf-gauges">
        <Speedometer
          value={uploadGauge}
          label="Upload"
          display={
            isFetching && !hasAnyData ? '…' : fmt(uploadSec, 2)
          }
          unit="s/img"
          hint={
            imageCycle
              ? `${fmt(imageCycle.image_size_kb, 0)} KB`
              : '—'
          }
          tone="violet"
          settling={isFetching}
        />
        <Speedometer
          value={createGauge}
          label="Create"
          display={
            isFetching && !hasAnyData ? '…' : fmt(createSec, 2)
          }
          unit="s"
          hint={
            fullCycle
              ? `${Object.keys(fullCycle.timings ?? {}).length} steps`
              : '—'
          }
          tone="emerald"
          settling={isFetching}
        />
        <Speedometer
          value={totalGauge}
          label="Total"
          display={
            isFetching && !hasAnyData ? '…' : fmt(totalSec, 2)
          }
          unit="s"
          hint={
            summary ? `${summary.tests_run} tests` : '—'
          }
          tone="blue"
          settling={isFetching}
        />
      </div>

      <footer className="perf-foot">
        <div className="perf-foot-item">
          <span className="perf-foot-label">Delete img</span>
          <span className="perf-foot-value">
            {isFetching && !hasAnyData
              ? '—'
              : `${fmt(imageCycle?.delete_seconds, 2)} s`}
          </span>
        </div>
        <span className="perf-foot-divider" aria-hidden="true" />
        <div className="perf-foot-item">
          <span className="perf-foot-label">Cleanup DB</span>
          <span className="perf-foot-value">
            {isFetching && !hasAnyData
              ? '—'
              : `${fmt(
                  fullCycle?.timings?.cleanup_db_seconds,
                  2,
                )} s`}
          </span>
        </div>
        <span className="perf-foot-divider" aria-hidden="true" />
        <div className="perf-foot-item">
          <span className="perf-foot-label">Auto</span>
          <span className="perf-foot-value">60s</span>
        </div>
      </footer>

      {isError && (
        <p className="perf-error">
          {(error as Error)?.message ||
            'Could not run performance tests.'}
        </p>
      )}
    </div>
  );
}

export default PerfTestsCard;