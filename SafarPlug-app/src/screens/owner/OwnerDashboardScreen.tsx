import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { format, subDays } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../core/constants/colors';
import { LoadingWidget } from '../../core/components/LoadingWidget';
import { stationService } from '../../services/stationService';
import { sessionService } from '../../services/sessionService';
import { useAuthStore } from '../../store/authStore';
import { Station } from '../../models/stationModel';
import { Charger } from '../../models/chargerModel';
import { ChargingSession } from '../../models/sessionModel';

import { ChargerToggleRow } from './components/ChargerToggleRow';
import { SessionActivityRow } from './components/SessionActivityRow';

const SCREEN_W = Dimensions.get('window').width;

// ─── Seed mock data ───────────────────────────────────────────────────────────
const MOCK_STATION: Station = {
  id: 'mock-s1', ownerId: 'owner-1', name: 'Delhi Safar EV Hub',
  address: '10 Connaught Place, New Delhi', latitude: 28.6139, longitude: 77.209,
  description: 'Premium EV charging hub in CP', photoUrls: [],
  chargerTypes: ['dc_fast_car', 'ac_slow_car'], pricePerKwh: 15,
  workingHoursStart: '06:00', workingHoursEnd: '23:00',
  isVerified: true, isActive: true, rating: 4.8, totalReviews: 12,
  totalSlotsAvailable: 2, createdAt: new Date().toISOString(),
};

const MOCK_CHARGERS: Charger[] = [
  { id: 'c1', stationId: 'mock-s1', chargerType: 'dc_fast_car', powerKw: 50, connectorType: 'ccs2', isAvailable: true,  vehicleCompatibility: ['car'] },
  { id: 'c2', stationId: 'mock-s1', chargerType: 'ac_slow_car', powerKw: 22, connectorType: 'type2', isAvailable: false, vehicleCompatibility: ['car'] },
];

const buildMockSessions = (): ChargingSession[] =>
  Array.from({ length: 10 }, (_, i) => ({
    id:                  `s-${i}`,
    userId:              `u-${i + 1}`,
    stationId:           'mock-s1',
    chargerId:           i % 2 === 0 ? 'c1' : 'c2',
    startTime:           subDays(new Date(), i === 0 ? 0 : Math.floor(Math.random() * 7)).toISOString(),
    endTime:             new Date().toISOString(),
    startBatteryPercent: 30,
    endBatteryPercent:   80,
    energyUsedKwh:       10 + Math.random() * 30,
    totalCostRs:         (10 + Math.random() * 30) * 15,
    paymentStatus:       i < 8 ? 'paid' : 'pending',
    vehicleType:         i % 3 === 0 ? 'bike' : 'car',
  }));

// ─── Metric card ──────────────────────────────────────────────────────────────
const MetricCard: React.FC<{
  icon: string; label: string; value: string; accent?: string; bg?: string;
}> = ({ icon, label, value, accent = colors.primary, bg = colors.primaryLight }) => (
  <View style={[styles.metricCard, { backgroundColor: bg }]}>
    <Text style={styles.metricIcon}>{icon}</Text>
    <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────
export const OwnerDashboardScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const user   = useAuthStore((s) => s.user);

  const [stations,  setStations]  = useState<Station[]>([]);
  const [chargers,  setChargers]  = useState<Record<string, Charger[]>>({});
  const [sessions,  setSessions]  = useState<ChargingSession[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selectedSession, setSelectedSession] = useState<ChargingSession | null>(null);

  // ── Data loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [stationData, sessionData] = await Promise.all([
          stationService.getOwnerStations(),
          user ? sessionService.getOwnerSessions(user.id) : Promise.resolve([]),
        ]);
        setStations(stationData);
        setSessions(sessionData);

        const chargerMap: Record<string, Charger[]> = {};
        await Promise.all(
          stationData.map(async (s) => {
            try {
              chargerMap[s.id] = await stationService.getChargers(s.id);
            } catch { chargerMap[s.id] = []; }
          })
        );
        setChargers(chargerMap);
      } catch {
        // Fallback to mock data
        setStations([MOCK_STATION]);
        setChargers({ [MOCK_STATION.id]: MOCK_CHARGERS });
        setSessions(buildMockSessions());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  // ── Charger toggle ────────────────────────────────────────────────────────
  const handleToggleCharger = async (stationId: string, chargerId: string, available: boolean) => {
    try {
      await stationService.toggleChargerStatus(stationId, chargerId, available ? 'available' : 'offline');
    } catch { /* fallback */ }
    setChargers((prev) => ({
      ...prev,
      [stationId]: (prev[stationId] ?? []).map((c) =>
        c.id === chargerId ? { ...c, isAvailable: available } : c
      ),
    }));
  };

  // ── Computed stats ────────────────────────────────────────────────────────
  const todayStr = new Date().toDateString();

  const todaySessions = useMemo(
    () => sessions.filter((s) => new Date(s.startTime).toDateString() === todayStr),
    [sessions]
  );

  const todayRevenue = useMemo(
    () => todaySessions.reduce((sum, s) => sum + s.totalCostRs, 0),
    [todaySessions]
  );

  const todayKwh = useMemo(
    () => todaySessions.reduce((sum, s) => sum + s.energyUsedKwh, 0),
    [todaySessions]
  );

  const avgRating = stations.length
    ? (stations.reduce((sum, s) => sum + s.rating, 0) / stations.length).toFixed(1)
    : '—';

  // ── Weekly chart data ─────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const labels: string[] = [];
    const data:   number[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      labels.push(format(day, 'EEE'));
      const dayStr = day.toDateString();
      const revenue = sessions
        .filter((s) => new Date(s.startTime).toDateString() === dayStr)
        .reduce((sum, s) => sum + s.totalCostRs, 0);
      data.push(Math.round(revenue));
    }
    return { labels, datasets: [{ data }] };
  }, [sessions]);

  // ── Available balance mock ────────────────────────────────────────────────
  const availableBalance = sessions
    .filter((s) => s.paymentStatus === 'paid')
    .reduce((sum, s) => sum + s.totalCostRs * 0.9, 0); // 90% after platform cut

  if (loading) return <LoadingWidget fullScreen message="Loading dashboard…" />;

  // ── Empty state ───────────────────────────────────────────────────────────
  if (stations.length === 0) {
    return (
      <View style={[styles.root, styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyIcon}>🏗️</Text>
        <Text style={styles.emptyTitle}>No Station Yet</Text>
        <Text style={styles.emptySubtitle}>Register your first charging station and start earning today.</Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => navigation.navigate('OwnerRegisterStation')}
        >
          <Text style={styles.emptyBtnText}>+ Register Your Station</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const primaryStation = stations[0];
  const stationChargers = chargers[primaryStation.id] ?? [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* ── 1. Green header bar ──────────────────────────────────────── */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerMy}>My Station</Text>
          <Text style={styles.headerName} numberOfLines={1}>{primaryStation.name}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerDate}>{format(new Date(), 'EEE, dd MMM')}</Text>
          {primaryStation.isVerified && (
            <View style={styles.verifiedChip}><Text style={styles.verifiedText}>✓ Verified</Text></View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 2. Stats grid 2×2 ─────────────────────────────────────── */}
        <View style={styles.metricsGrid}>
          <MetricCard
            icon="₹"
            label="Today's Revenue"
            value={`₹${todayRevenue.toFixed(0)}`}
            accent={colors.primary}
            bg={colors.primaryLight}
          />
          <MetricCard
            icon="⚡"
            label="Sessions Today"
            value={String(todaySessions.length)}
            accent={colors.charging}
            bg="#EFF6FF"
          />
          <MetricCard
            icon="🔋"
            label="Energy Dispensed"
            value={`${todayKwh.toFixed(1)} kWh`}
            accent={colors.primaryDark}
            bg={colors.primaryLight}
          />
          <MetricCard
            icon="★"
            label="Avg Rating"
            value={`${avgRating}`}
            accent="#D97706"
            bg="#FEF3C7"
          />
        </View>

        {/* ── 3. Weekly revenue bar chart ────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly Revenue</Text>
          <BarChart
            data={chartData}
            width={SCREEN_W - 64}
            height={180}
            yAxisLabel="₹"
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: colors.background,
              backgroundGradientFrom: colors.background,
              backgroundGradientTo: colors.background,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(29, 158, 117, ${opacity})`,
              labelColor: () => colors.textSecondary,
              style: { borderRadius: 10 },
              barPercentage: 0.65,
            }}
            style={{ borderRadius: 10, marginLeft: -16 }}
            showValuesOnTopOfBars
            fromZero
          />
        </View>

        {/* ── 4. Charger status section ──────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Charger Status</Text>
          {stationChargers.length === 0 ? (
            <Text style={styles.emptyRowText}>No chargers found.</Text>
          ) : (
            stationChargers.map((charger) => (
              <ChargerToggleRow
                key={charger.id}
                charger={charger}
                onToggleStatus={(available) => handleToggleCharger(primaryStation.id, charger.id, available)}
              />
            ))
          )}
        </View>

        {/* ── 5. Recent sessions ─────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Sessions</Text>
            <Text style={styles.cardSubtitle}>Last {Math.min(10, sessions.length)}</Text>
          </View>
          {sessions.slice(0, 10).map((session) => (
            <SessionActivityRow
              key={session.id}
              session={session}
              onPress={() => setSelectedSession(session)}
            />
          ))}
          {sessions.length === 0 && (
            <Text style={styles.emptyRowText}>No sessions recorded yet.</Text>
          )}
        </View>

        {/* ── 6. Payout section ─────────────────────────────────────── */}
        <View style={[styles.card, styles.payoutCard]}>
          <View style={styles.payoutHeader}>
            <Text style={styles.cardTitle}>Earnings</Text>
            <View style={styles.bankBadge}>
              <Text style={styles.bankBadgeText}>🏦 Bank Linked</Text>
            </View>
          </View>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceValue}>₹{availableBalance.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</Text>
          <TouchableOpacity
            style={styles.payoutBtn}
            onPress={() => Alert.alert('Payout', 'Bank transfer flow coming soon. Your balance will be transferred to your linked account within 2 business days.')}
            activeOpacity={0.85}
          >
            <Text style={styles.payoutBtnText}>Request Payout</Text>
          </TouchableOpacity>
        </View>

        {/* ── 7. Edit station ───────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.editLink}
          onPress={() => navigation.navigate('OwnerRegisterStation', { editMode: true, stationId: primaryStation.id })}
        >
          <Text style={styles.editLinkText}>✏️  Edit Station Details</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Session detail modal ─────────────────────────────────────── */}
      <Modal
        visible={!!selectedSession}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSession(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Session Detail</Text>
            {selectedSession && (
              <>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>Vehicle</Text>
                  <Text style={styles.modalVal}>{selectedSession.vehicleType === 'bike' ? '🛵 Bike' : '🚗 Car'}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>Energy</Text>
                  <Text style={styles.modalVal}>{selectedSession.energyUsedKwh.toFixed(2)} kWh</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>Amount</Text>
                  <Text style={[styles.modalVal, { color: colors.primary }]}>₹{selectedSession.totalCostRs.toFixed(2)}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>Status</Text>
                  <Text style={[styles.modalVal, { color: selectedSession.paymentStatus === 'paid' ? colors.success : colors.error }]}>
                    {selectedSession.paymentStatus}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>Started</Text>
                  <Text style={styles.modalVal}>{format(new Date(selectedSession.startTime), 'dd MMM, hh:mm a')}</Text>
                </View>
              </>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedSession(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // ── Header ──
  headerBar: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerMy:   { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600' },
  headerName: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2, maxWidth: 200 },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  headerDate: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  verifiedChip: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  verifiedText: { color: '#4ADE80', fontSize: 11, fontWeight: '800' },

  // ── Metrics grid ──
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metricCard: {
    width: (SCREEN_W - 42) / 2,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  metricIcon:  { fontSize: 22, marginBottom: 8 },
  metricValue: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  metricLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

  // ── Generic card ──
  card: {
    backgroundColor: colors.background,
    borderRadius: 18, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle:    { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 14 },
  cardSubtitle: { fontSize: 12, color: colors.textLight, fontWeight: '600' },
  emptyRowText: { fontSize: 13, color: colors.textLight, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },

  // ── Payout card ──
  payoutCard:   { },
  payoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bankBadge:    { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  bankBadgeText:{ fontSize: 12, color: colors.charging, fontWeight: '700' },
  balanceLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
  balanceValue: { fontSize: 32, fontWeight: '900', color: colors.text, marginTop: 4, marginBottom: 16 },
  payoutBtn: {
    backgroundColor: '#2563EB', borderRadius: 14, height: 50,
    justifyContent: 'center', alignItems: 'center',
  },
  payoutBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // ── Edit link ──
  editLink:     { alignItems: 'center', paddingVertical: 14 },
  editLinkText: { fontSize: 14, color: colors.primary, fontWeight: '700' },

  // ── Empty state ──
  empty:       { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIcon:   { fontSize: 56, marginBottom: 16 },
  emptyTitle:  { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  emptyBtn: {
    backgroundColor: colors.primary, borderRadius: 16,
    paddingHorizontal: 28, paddingVertical: 14,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 },
  modalRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalKey:   { fontSize: 14, color: colors.textSecondary },
  modalVal:   { fontSize: 14, fontWeight: '700', color: colors.text },
  modalClose: {
    marginTop: 20, backgroundColor: colors.surface, borderRadius: 14,
    height: 48, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  modalCloseText: { fontSize: 15, fontWeight: '700', color: colors.text },
});
