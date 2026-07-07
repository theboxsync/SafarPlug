import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionService } from '../services/sessionService';
import { useSessionStore } from '../store/sessionStore';
import { useSocketStore } from '../store/socketStore';
import { ChargingSession } from '../models/sessionModel';

const POLLING_INTERVAL_MS = 15_000; // fallback poll every 15 s if socket drops

/**
 * useActiveSession
 *
 * Subscribes to real-time session updates via Socket.io.
 * If the socket is not connected, falls back to polling GET /api/sessions/:id every 15 s.
 */
export function useActiveSession(sessionId: string | null | undefined) {
  const queryClient = useQueryClient();
  const updateSessionLive = useSessionStore((s) => s.updateSessionLive);
  const isSocketConnected = useSocketStore((s) => s.isConnected);
  const joinSessionRoom = useSocketStore((s) => s.joinSessionRoom);
  const leaveSessionRoom = useSocketStore((s) => s.leaveSessionRoom);
  const socketOn = useSocketStore((s) => s.on);
  const socketOff = useSocketStore((s) => s.off);

  // ── React Query: polling fallback ──────────────────────────────────────
  const query = useQuery<ChargingSession, Error>({
    queryKey: ['session', sessionId],
    queryFn: () => sessionService.getActiveSession().then((s) => s!),
    enabled: !!sessionId,
    refetchInterval: isSocketConnected ? false : POLLING_INTERVAL_MS,
    staleTime: 10_000,
    gcTime: 60_000,
  });

  // ── Socket.io: real-time updates ───────────────────────────────────────
  const handleProgress = useCallback(
    (data: ChargingSession) => {
      updateSessionLive(data);
      queryClient.setQueryData(['session', sessionId], data);
    },
    [sessionId, updateSessionLive, queryClient]
  );

  const handleEnded = useCallback(
    (data: ChargingSession) => {
      updateSessionLive(data);
      queryClient.setQueryData(['session', sessionId], data);
      // Stop further refetches when session ends
      queryClient.cancelQueries({ queryKey: ['session', sessionId] });
    },
    [sessionId, updateSessionLive, queryClient]
  );

  useEffect(() => {
    if (!sessionId) return;

    joinSessionRoom(sessionId);
    socketOn('session:progress', handleProgress);
    socketOn('session:ended', handleEnded);

    return () => {
      socketOff('session:progress', handleProgress);
      socketOff('session:ended', handleEnded);
      leaveSessionRoom(sessionId);
    };
  }, [sessionId, joinSessionRoom, leaveSessionRoom, socketOn, socketOff, handleProgress, handleEnded]);

  return query;
}
