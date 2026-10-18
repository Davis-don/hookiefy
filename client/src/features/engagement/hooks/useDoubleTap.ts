// src/hooks/useDoubleTap.ts

import { useCallback, useRef } from 'react';

type TapPoint = { x: number; y: number };

type UseDoubleTapOptions = {
  /** Max time between two taps to be considered a double-tap (ms). */
  delay?: number;

  /** Max movement (px) before a tap is cancelled (scroll/drag guard). */
  moveTolerance?: number;

  onSingle?: () => void;
  onDouble?: (point: TapPoint) => void;
};

export function useDoubleTap({
  delay = 340,
  moveTolerance = 12,
  onSingle,
  onDouble,
}: UseDoubleTapOptions) {
  /* ── State kept in refs so listeners never go stale ── */
  const lastTapTimeRef = useRef(0);
  const pendingSingleRef = useRef<number | null>(null);

  /* Per-gesture tracking */
  const downPointRef = useRef<TapPoint | null>(null);
  const movedRef = useRef(false);

  const cancelPending = () => {
    if (pendingSingleRef.current !== null) {
      window.clearTimeout(pendingSingleRef.current);
      pendingSingleRef.current = null;
    }
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    downPointRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!downPointRef.current) return;
      const dx = e.clientX - downPointRef.current.x;
      const dy = e.clientY - downPointRef.current.y;
      if (Math.hypot(dx, dy) > moveTolerance) {
        movedRef.current = true;
        // If we crossed the tolerance, this is a scroll, not a tap.
        // Cancel any pending single tap from a previous down.
        cancelPending();
      }
    },
    [moveTolerance],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const down = downPointRef.current;
      downPointRef.current = null;

      if (!down) return;
      if (movedRef.current) {
        // It was a scroll — never treat as tap.
        movedRef.current = false;
        return;
      }

      const now = Date.now();
      const point: TapPoint = { x: e.clientX, y: e.clientY };

      /* ── Double tap detected ── */
      if (now - lastTapTimeRef.current < delay) {
        lastTapTimeRef.current = 0;
        cancelPending();
        onDouble?.(point);
        return;
      }

      /* ── First tap → schedule single-tap resolution ── */
      lastTapTimeRef.current = now;
      cancelPending();
      pendingSingleRef.current = window.setTimeout(() => {
        pendingSingleRef.current = null;
        lastTapTimeRef.current = 0;
        onSingle?.();
      }, delay);
    },
    [delay, onSingle, onDouble],
  );

  const handlePointerCancel = useCallback(() => {
    downPointRef.current = null;
    movedRef.current = false;
    cancelPending();
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  };
}