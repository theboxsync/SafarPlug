import { io, Socket } from 'socket.io-client';
import { apiClient } from './apiClient';
import { ChargingSession } from '../models/sessionModel';
import { ApiResponse } from '../models/common';
import { config } from '../core/constants/config';

let socket: Socket | null = null;

export const sessionService = {
  async startSession(
    stationId: string,
    chargerId: string,
    startBatteryPercent?: number,
    vehicleType?: string
  ): Promise<ChargingSession> {
    const response = await apiClient.post<ApiResponse<ChargingSession>>('/sessions/start', {
      stationId,
      chargerId,
      startBatteryPercent,
      vehicleType,
    });
    return response.data.data;
  },

  async updateSessionProgress(
    sessionId: string,
    currentBatteryPercent: number,
    energyUsed: number
  ): Promise<ChargingSession> {
    const response = await apiClient.patch<ApiResponse<ChargingSession>>(`/sessions/${sessionId}/progress`, {
      currentBatteryPercent,
      energyUsedKwh: energyUsed,
    });
    return response.data.data;
  },

  async endSession(sessionId: string): Promise<ChargingSession> {
    const response = await apiClient.post<ApiResponse<ChargingSession>>(`/sessions/${sessionId}/end`);
    return response.data.data;
  },

  async getActiveSession(): Promise<ChargingSession | null> {
    try {
      const response = await apiClient.get<ApiResponse<ChargingSession>>('/sessions/active');
      return response.data.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async getSessionHistory(userId: string): Promise<ChargingSession[]> {
    const response = await apiClient.get<ApiResponse<ChargingSession[]>>(`/sessions/history/${userId}`);
    return response.data.data;
  },

  async getOwnerSessions(ownerId: string, date?: string): Promise<ChargingSession[]> {
    const response = await apiClient.get<ApiResponse<ChargingSession[]>>(`/sessions/owner/${ownerId}`, {
      params: { date },
    });
    return response.data.data;
  },

  connectSocket(sessionId: string, onUpdate: (session: ChargingSession) => void) {
    if (socket) {
      socket.disconnect();
    }

    if (!config.SOCKET_URL) {
      console.warn('Socket URL not defined');
      return;
    }

    socket = io(config.SOCKET_URL, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Connected to charging socket server');
      socket?.emit('session:join', { sessionId });
    });

    socket.on('session:progress', (data: ChargingSession) => {
      onUpdate(data);
    });

    socket.on('session:ended', (data: ChargingSession) => {
      onUpdate(data);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from charging socket server');
    });
  },

  disconnectSocket() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  async stopSession(sessionId: string): Promise<ChargingSession> {
    return this.endSession(sessionId);
  },
};
