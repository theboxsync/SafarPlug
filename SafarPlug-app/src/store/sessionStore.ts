import { create } from 'zustand';
import { ChargingSession } from '../models/sessionModel';
import { sessionService } from '../services/sessionService';
import { useAuthStore } from './authStore';

interface SessionStoreState {
  activeSession: ChargingSession | null;
  history: ChargingSession[];
  isLoading: boolean;
  error: string | null;

  startCharging: (stationId: string, chargerId: string, startBatteryPercent?: number, vehicleType?: 'car' | 'bike') => Promise<void>;
  stopCharging: () => Promise<void>;
  checkActiveSession: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  updateSessionLive: (session: ChargingSession) => void;
  clearError: () => void;
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  activeSession: null,
  history: [],
  isLoading: false,
  error: null,

  startCharging: async (stationId, chargerId, startBatteryPercent, vehicleType) => {
    set({ isLoading: true, error: null });
    try {
      const session = await sessionService.startSession(stationId, chargerId, startBatteryPercent, vehicleType);
      set({ activeSession: session, isLoading: false });

      // Delegate socket connection to the service (keeps socket lifecycle in service layer)
      sessionService.connectSocket(session.id, (updatedSession) => {
        get().updateSessionLive(updatedSession);
      });
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to start charging session', isLoading: false });
      throw e;
    }
  },

  stopCharging: async () => {
    const { activeSession } = get();
    if (!activeSession) return;

    set({ isLoading: true, error: null });
    try {
      const finalSession = await sessionService.stopSession(activeSession.id);
      set({ activeSession: finalSession, isLoading: false });
      sessionService.disconnectSocket();
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to stop session', isLoading: false });
      throw e;
    }
  },

  checkActiveSession: async () => {
    try {
      const session = await sessionService.getActiveSession();
      if (session) {
        set({ activeSession: session });
        // Re-establish socket if session is still active
        sessionService.connectSocket(session.id, (updatedSession) => {
          get().updateSessionLive(updatedSession);
        });
      } else {
        set({ activeSession: null });
      }
    } catch {
      set({ activeSession: null });
    }
  },

  fetchHistory: async () => {
    set({ isLoading: true });
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        set({ isLoading: false });
        return;
      }
      const history = await sessionService.getSessionHistory(userId);
      set({ history, isLoading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch charging history', isLoading: false });
    }
  },

  updateSessionLive: (session) => {
    set({ activeSession: session });
  },

  clearError: () => set({ error: null }),
}));
