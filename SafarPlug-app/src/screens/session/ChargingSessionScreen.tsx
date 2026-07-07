import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../core/constants/colors';
import { sessionService } from '../../services/sessionService';
import { stationService } from '../../services/stationService';
import { useActiveSession } from '../../hooks/useActiveSession';
import { useSessionTimer } from '../../hooks/useSessionTimer';
import { useSessionStore } from '../../store/sessionStore';
import { Station } from '../../models/stationModel';
import { ChargingSession } from '../../models/sessionModel';

// ─── Constants ────────────────────────────────────────────────────────────────
const TARGET_BATTERY_PCT = 80;
const PLATFORM_FEE_RS    = 2.0;

// ─── Helper: format elapsed seconds as hh:mm:ss ──────────────────────────────
const formatTime = (secs: number): string => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h > 0 ? String(h).padStart(2, '0') : null, String(m).padStart(2, '0'), String(s).padStart(2, '0')]
    .filter(Boolean)
    .join(':');
};

// ─── Pulsing dot component ────────────────────────────────────────────────────
const PulsingDot: React.FC = () => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <Animated.View style={[styles.pulsingDot, { transform: [{ scale: pulse }] }]} />
  );
};

// ─── Stats grid cell ──────────────────────────────────────────────────────────
const StatCell: React.FC<{ icon: string; label: string; value: string; accent?: string }> = ({
  icon, label, value, accent,
}) => (
  <View style={styles.statCell}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const ChargingSessionScreen = ({ route, navigation }: any) => {
  const { sessionId } = route.params as { sessionId: string };
  const insets = useSafeAreaInsets();

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { data: liveSession } = useActiveSession(sessionId);
  const { elapsedSeconds, sessionCost } = useSessionTimer();

  const activeSession = useSessionStore((s) => s.activeSession);
  const session: ChargingSession | null = liveSession ?? activeSession;

  // ── Station info ──────────────────────────────────────────────────────────
  const [station, setStation] = useState<Station | null>(null);
  useEffect(() => {
    if (session?.stationId) {
      stationService.getStationById(session.stationId)
        .then(setStation)
        .catch(() => null);
    }
  }, [session?.stationId]);

  // ── Animated battery percentage ───────────────────────────────────────────
  const animBattery = useRef(new Animated.Value(session?.startBatteryPercent ?? 0)).current;
  const [displayBattery, setDisplayBattery] = useState(session?.startBatteryPercent ?? 0);

  useEffect(() => {
    if (!session) return;
    const currentPct = session.endBatteryPercent
      ?? Math.min(
          TARGET_BATTERY_PCT,
          (session.startBatteryPercent ?? 0) +
            Math.round((session.energyUsedKwh ?? 0) * 6) // ~6% per kWh rough estimate
        );

    Animated.timing(animBattery, {
      toValue: currentPct,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    const listener = animBattery.addListener(({ value }) => setDisplayBattery(Math.round(value)));
    return () => animBattery.removeListener(listener);
  }, [session?.energyUsedKwh, session?.endBatteryPercent]);

  // ── Progress bar animation ────────────────────────────────────────────────
  const startPct  = session?.startBatteryPercent ?? 0;
  const progressPct = Math.min(100, ((displayBattery - startPct) / Math.max(1, TARGET_BATTERY_PCT - startPct)) * 100);

  // ── Power rate & time estimate ────────────────────────────────────────────
  const powerKw     = 22; // fallback — ideally from charger model
  const energyUsed  = session?.energyUsedKwh ?? 0;
  const pricePerKwh = station?.pricePerKwh ?? 12;
  const chargingCost = energyUsed * pricePerKwh;
  const estimatedTotal = chargingCost + PLATFORM_FEE_RS;

  const remainingEnergyKwh = Math.max(0, ((TARGET_BATTERY_PCT - displayBattery) / 100) * 60); // 60 kWh battery
  const minutesRemaining   = remainingEnergyKwh > 0 ? Math.round((remainingEnergyKwh / powerKw) * 60) : 0;

  // ── Stop charging ─────────────────────────────────────────────────────────
  const [isStopping, setIsStopping] = useState(false);

  const handleStopCharging = useCallback(() => {
    Alert.alert(
      'Stop Charging?',
      'The session will end and the final amount will be settled. Are you sure?',
      [
        { text: 'Keep Charging', style: 'cancel' },
        {
          text: 'Stop Session',
          style: 'destructive',
          onPress: async () => {
            setIsStopping(true);
            try {
              await sessionService.endSession(sessionId);
              navigation.replace('SessionSummary', { sessionId });
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Could not end session. Please try again.');
            } finally {
              setIsStopping(false);
            }
          },
        },
      ]
    );
  }, [sessionId, navigation]);

  const sessionIsEnded = !!session?.endTime;
  useEffect(() => {
    if (sessionIsEnded) {
      navigation.replace('SessionSummary', { sessionId });
    }
  }, [sessionIsEnded]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* ── 1. Green header bar ────────────────────────────────────────── */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <PulsingDot />
          <Text style={styles.headerTitle}>Charging in Progress</Text>
        </View>
        <Text style={styles.headerStation} numberOfLines={1}>
          {station?.name ?? 'Loading…'}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 2. Battery hero card ──────────────────────────────────────── */}
        <View style={styles.heroCard}>
          {/* Large animated battery % */}
          <Text style={styles.batteryNum}>{displayBattery}<Text style={styles.batteryPct}>%</Text></Text>
          <Text style={styles.batterySubtitle}>
            was {session?.startBatteryPercent ?? '–'}% when started
          </Text>

          {/* Animated progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${progressPct}%` as any },
              ]}
            />
          </View>

          {/* Progress labels */}
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>{session?.startBatteryPercent ?? 0}% start</Text>
            <Text style={styles.progressLabel}>{TARGET_BATTERY_PCT}% target</Text>
          </View>
        </View>

        {/* ── 3. Live status badge ──────────────────────────────────────── */}
        <View style={styles.statusBadge}>
          <PulsingDot />
          <Text style={styles.statusText}>
            Charging at {powerKw} kW
            {minutesRemaining > 0 ? ` · ~${minutesRemaining} min remaining` : ' · Almost done!'}
          </Text>
        </View>

        {/* ── 4. Stats grid ────────────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCell
              icon="⏱️"
              label="Time Elapsed"
              value={formatTime(elapsedSeconds)}
              accent={colors.charging}
            />
            <View style={styles.statsDivider} />
            <StatCell
              icon="⚡"
              label="Energy Used"
              value={`${energyUsed.toFixed(2)} kWh`}
              accent={colors.primary}
            />
          </View>
          <View style={styles.statsHDivider} />
          <View style={styles.statsRow}>
            <StatCell
              icon="₹"
              label="Cost So Far"
              value={`₹${chargingCost.toFixed(2)}`}
              accent={colors.success}
            />
            <View style={styles.statsDivider} />
            <StatCell
              icon="📊"
              label="Est. Total"
              value={`₹${estimatedTotal.toFixed(2)}`}
            />
          </View>
        </View>

        {/* ── 5. Session summary card ───────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Session Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Energy rate</Text>
            <Text style={styles.summaryVal}>₹{pricePerKwh}/kWh</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Platform fee</Text>
            <Text style={styles.summaryVal}>₹{PLATFORM_FEE_RS.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Payment method</Text>
            <Text style={styles.summaryVal}>UPI · Pre-paid</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Station</Text>
            <Text style={styles.summaryVal} numberOfLines={1}>{station?.name ?? '—'}</Text>
          </View>

          {/* Separator */}
          <View style={styles.summarySep} />

          {/* Estimated total */}
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryKey, styles.totalKey]}>Estimated Total</Text>
            <Text style={styles.totalVal}>₹{estimatedTotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* ── 6. Stop charging button ───────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.stopBtn, isStopping && styles.stopBtnDisabled]}
          onPress={handleStopCharging}
          disabled={isStopping}
          activeOpacity={0.85}
        >
          <Text style={styles.stopBtnText}>
            {isStopping ? 'Ending session…' : '⏹  Stop Charging'}
          </Text>
        </TouchableOpacity>

        {/* ── 7. Footer note ────────────────────────────────────────────── */}
        <Text style={styles.footerNote}>
          🔒 Payment auto-settled when session ends
        </Text>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // ── Header bar ──
  headerBar: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  headerStation: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', maxWidth: 150, textAlign: 'right' },

  // ── Pulsing dot ──
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ADE80',
  },

  // ── Hero battery card ──
  heroCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    marginBottom: 12,
  },
  batteryNum: {
    fontSize: 88,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 96,
    letterSpacing: -4,
  },
  batteryPct: {
    fontSize: 40,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0,
  },
  batterySubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    marginBottom: 24,
    marginTop: 4,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ADE80',
    borderRadius: 5,
  },
  progressLabels: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },

  // ── Live status badge ──
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },

  // ── Stats grid ──
  statsGrid: {
    backgroundColor: colors.background,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  statIcon:  { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 2 },
  statLabel: { fontSize: 11, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  statsDivider:  { width: 1, height: 50, backgroundColor: colors.border },
  statsHDivider: { height: 1, backgroundColor: colors.border },

  // ── Summary card ──
  summaryCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryKey: { fontSize: 14, color: colors.textSecondary },
  summaryVal: { fontSize: 14, fontWeight: '700', color: colors.text },
  summarySep: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  totalKey:   { fontSize: 15, fontWeight: '700', color: colors.text },
  totalVal:   { fontSize: 22, fontWeight: '900', color: colors.primary },

  // ── Stop button ──
  stopBtn: {
    borderWidth: 2,
    borderColor: colors.error,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#FFF1F2',
  },
  stopBtnDisabled: { opacity: 0.5 },
  stopBtnText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '800',
  },

  // ── Footer note ──
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
    marginBottom: 8,
  },
});
