// src/features/perfTests/components/PerfTestsCard.tsx

import { useMemo } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { usePerfTestsLive } from '../hooks/usePerfTests';
import Speedometer from './Speedometer';
import './perftests.css';

function fmtNum(n: number | undefined, decimals = 1): string {
  if (n === undefined || n === null || !isFinite(n)) return '—';
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(decimals);
  return n.toFixed(decimals + 1);
}

/* ── Gauge max scales ───────────────────────────────── */
const GAUGE_MAX_MB = 5;
const GAUGE_MAX_KB = 500;
const GAUGE_MAX_B  = 2000;
const GAUGE_MAX_GB = 1;
const GAUGE_MAX_ROWS = 300;

/* Upload time — inverted: faster = fuller */
const UPLOAD_FAST_MS = 300;
const UPLOAD_SLOW_MS = 3000;

function gaugeForDownload(unit: string, numericValue: string): number {
  const v = parseFloat(numericValue);
  if (!isFinite(v) || v <= 0) return 0;

  switch (unit) {
    case 'GB/s': return Math.min(100, (v / GAUGE_MAX_GB) * 100);
    case 'MB/s': return Math.min(100, (v / GAUGE_MAX_MB) * 100);
    case 'KB/s': return Math.min(100, (v / GAUGE_MAX_KB) * 100);
    case 'B/s':  return Math.min(100, (v / GAUGE_MAX_B) * 100);
    default:     return Math.min(100, (v / GAUGE_MAX_ROWS) * 100);
  }
}

function gaugeForUploadMs(ms: number | undefined): number {
  if (!ms || ms <= 0) return 0;
  if (ms <= UPLOAD_FAST_MS) return 100;
  if (ms >= UPLOAD_SLOW_MS) return 0;

  const ratio =
    (UPLOAD_SLOW_MS - ms) / (UPLOAD_SLOW_MS - UPLOAD_FAST_MS);
  return Math.max(0, Math.min(100, ratio * 100));
}

function PerfTestsCard() {
  const access = useAuthStore((s) => s.access);

  const { data, isFetching, isError, error, refetch } = usePerfTestsLive(
    { imageRuns: 3, posts: 3, products: 3 },
    { enabled: !!access, intervalMs: 60_000 },
  );

  const upload = data?.result?.overall_upload;
  const download = data?.result?.overall_download;
  const image = data?.result?.image_upload;
  const summary = data?.result?.summary;

  /* DOWNLOAD — MB/s or KB/s */
  const downloadDisplay = download?.throughput?.total_display;
  const downloadGauge = downloadDisplay
    ? gaugeForDownload(downloadDisplay.unit, downloadDisplay.value)
    : 0;

  /* UPLOAD — seconds per image (inverted scale) */
  const uploadDisplay = image?.throughput?.upload_display;
  const uploadGauge = gaugeForUploadMs(image?.avg_upload_ms);

  /* WRITES — DB rows/sec */
  const writeRps = upload?.throughput?.posts_per_second ?? 0;
  const writesDisplay = {
    value: writeRps >= 100 ? writeRps.toFixed(0) : writeRps.toFixed(1),
    unit: '/sec',
  };
  const writesGauge = Math.min(100, (writeRps / GAUGE_MAX_ROWS) * 100);

  const failed = summary?.tests_failed ?? 0;
  const totalMs = summary?.total_ms ?? 0;
  const endpointCount = Object.keys(download?.timings ?? {}).length;
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
              Live throughput from /perf/tests/run/
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
        {/* DOWNLOAD — MB/s or KB/s */}
        <Speedometer
          value={downloadGauge}
          label="Download"
          display={
            isFetching && !hasAnyData
              ? '…'
              : downloadDisplay?.value ?? '0'
          }
          unit={downloadDisplay?.unit ?? 'B/s'}
          hint={`${endpointCount} endpoints`}
          tone="blue"
          settling={isFetching}
        />

        {/* UPLOAD — seconds per image */}
        <Speedometer
          value={uploadGauge}
          label="Upload"
          display={
            isFetching && !hasAnyData
              ? '…'
              : uploadDisplay?.value ?? '—'
          }
          unit={uploadDisplay?.unit ?? 's/img'}
          hint={`${fmtNum(image?.avg_upload_ms, 0)} ms`}
          tone="violet"
          settling={isFetching}
        />

        {/* WRITES — DB rows/sec */}
        <Speedometer
          value={writesGauge}
          label="Writes"
          display={
            isFetching && !hasAnyData ? '…' : writesDisplay.value
          }
          unit={writesDisplay.unit}
          hint={`${fmtNum(upload?.total_upload_ms, 0)} ms`}
          tone="emerald"
          settling={isFetching}
        />
      </div>

      <footer className="perf-foot">
        <div className="perf-foot-item">
          <span className="perf-foot-label">Total</span>
          <span className="perf-foot-value">
            {isFetching && !hasAnyData
              ? '—'
              : `${fmtNum(totalMs, 0)} ms`}
          </span>
        </div>
        <span className="perf-foot-divider" aria-hidden="true" />
        <div className="perf-foot-item">
          <span className="perf-foot-label">Tests</span>
          <span className="perf-foot-value">
            {isFetching && !hasAnyData ? '—' : summary?.tests_run ?? 0}
            {!isFetching && failed > 0 && (
              <span className="perf-foot-alert">
                {' '}· {failed} failed
              </span>
            )}
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