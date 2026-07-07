import { useState, useEffect, useRef } from 'react';
import { useSessionStore } from '../store/sessionStore';

/**
 * useSessionTimer
 *
 * Returns:
 *  - elapsedSeconds: number — seconds since activeSession.startTime
 *  - sessionCost: number — derived cost in ₹ from energyUsedKwh × station pricePerKwh
 *
 * The timer ticks every second while a session is active and stops when it ends.
 */
export function useSessionTimer() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!activeSession?.startTime) {
      setElapsedSeconds(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const startMs = new Date(activeSession.startTime).getTime();

    const tick = () => {
      const nowMs = Date.now();
      setElapsedSeconds(Math.floor((nowMs - startMs) / 1000));
    };

    tick(); // immediate first tick
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeSession?.startTime, activeSession?.endTime]);

  // ── Derived cost ──────────────────────────────────────────────────────
  // totalCostRs is already computed server-side; use it if available.
  // Otherwise estimate from energyUsedKwh at a default ₹12/kWh rate.
  const sessionCost: number = activeSession
    ? activeSession.totalCostRs ?? (activeSession.energyUsedKwh ?? 0) * 12
    : 0;

  return { elapsedSeconds, sessionCost };
}
