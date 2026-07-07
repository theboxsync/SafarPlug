import { useEffect, useRef, useCallback } from 'react';
import { useSocketStore } from '../store/socketStore';

/**
 * useSocket — ensures the singleton Socket.io connection is alive.
 *
 * Call this once near the top of your app tree (e.g. in App.tsx or
 * a root navigation component) to establish the connection.
 * Any screen can then call useSocketStore() directly to subscribe to events.
 */
export function useSocket() {
  const connect = useSocketStore((s) => s.connect);
  const disconnect = useSocketStore((s) => s.disconnect);
  const joinSessionRoom = useSocketStore((s) => s.joinSessionRoom);
  const leaveSessionRoom = useSocketStore((s) => s.leaveSessionRoom);
  const isConnected = useSocketStore((s) => s.isConnected);

  // Connect once on mount
  useEffect(() => {
    connect();
    return () => {
      // Do NOT disconnect on unmount — the socket is app-wide.
      // Only disconnect when the user logs out (handled in authStore.logout).
    };
  }, [connect]);

  return { isConnected, joinSessionRoom, leaveSessionRoom };
}
