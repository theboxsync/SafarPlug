import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Station } from '../../../models/stationModel';
import { colors } from '../../../core/constants/colors';
import { calculateDistance, formatDistance } from '../../../core/utils/distanceUtils';

interface RouteStopListProps {
  fromName: string;
  toName: string;
  stops: Station[];
  startBattery: number;       // 0–100
  vehicleRangeKm: number;     // km per full charge
  totalDistanceKm: number;
  onChangeStop?: (stop: Station) => void;
}

// ─── Battery estimate per leg ─────────────────────────────────────────────────
// Simple model: each km drains (100 / vehicleRangeKm) %
const estimateArrivalBattery = (
  currentBattery: number,
  distanceKm: number,
  rangeKm: number
): number => {
  const drain = (distanceKm / rangeKm) * 100;
  return Math.max(0, Math.round(currentBattery - drain));
};

// Assume 30-min fast charge → +40%
const CHARGE_GAIN_PCT = 40;
const CHARGE_WAIT_MIN = 30;

// ─── Timeline dot colors ──────────────────────────────────────────────────────
const DOT_START = colors.success;    // green
const DOT_STOP  = '#2563EB';         // blue
const DOT_END   = colors.error;      // red

// ─── Battery bar ──────────────────────────────────────────────────────────────
const BatteryBar: React.FC<{ pct: number }> = ({ pct }) => {
  const color = pct < 20 ? colors.error : pct < 50 ? '#F59E0B' : colors.success;
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  );
};
const bar = StyleSheet.create({
  track: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginTop: 4, marginBottom: 2 },
  fill:  { height: '100%', borderRadius: 3 },
});

// ─── Component ────────────────────────────────────────────────────────────────
export const RouteStopList: React.FC<RouteStopListProps> = ({
  fromName,
  toName,
  stops,
  startBattery,
  vehicleRangeKm,
  totalDistanceKm,
  onChangeStop,
}) => {
  // Build timeline items: [Start, ...stops, End]
  type TimelineItem =
    | { kind: 'start';  label: string; battery: number }
    | { kind: 'stop';   station: Station; battery: number; distKm: number; departBattery: number }
    | { kind: 'end';    label: string; battery: number; distKm: number };

  const items: TimelineItem[] = [];

  // ── Start ──
  items.push({ kind: 'start', label: fromName, battery: startBattery });

  // For distance calculations we need prev coords
  let prevLat = 0; let prevLng = 0;
  let currentBattery = startBattery;

  stops.forEach((stop, idx) => {
    // Approx distance from prev point
    const dist = idx === 0 && prevLat === 0
      ? totalDistanceKm / (stops.length + 1)            // even split fallback
      : calculateDistance(
          { latitude: prevLat, longitude: prevLng },
          { latitude: stop.latitude, longitude: stop.longitude }
        );

    const arrivalBattery = estimateArrivalBattery(currentBattery, dist, vehicleRangeKm);
    const departBattery  = Math.min(100, arrivalBattery + CHARGE_GAIN_PCT);

    items.push({ kind: 'stop', station: stop, battery: arrivalBattery, distKm: dist, departBattery });

    prevLat = stop.latitude;
    prevLng = stop.longitude;
    currentBattery = departBattery;
  });

  // ── End ──
  const lastSegDist = stops.length > 0
    ? calculateDistance(
        { latitude: stops[stops.length - 1].latitude, longitude: stops[stops.length - 1].longitude },
        { latitude: 0, longitude: 0 }   // placeholder — we don't have toLocation coords here
      )
    : totalDistanceKm;
  const endBattery = estimateArrivalBattery(currentBattery, totalDistanceKm / (stops.length + 1), vehicleRangeKm);
  items.push({ kind: 'end', label: toName, battery: Math.max(0, endBattery), distKm: lastSegDist });

  const isLast = (i: number) => i === items.length - 1;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Route Timeline</Text>

      {items.map((item, idx) => {
        const dotColor = item.kind === 'start' ? DOT_START : item.kind === 'end' ? DOT_END : DOT_STOP;

        return (
          <View key={idx} style={styles.row}>
            {/* ── Timeline column ──────────────────────────────────────── */}
            <View style={styles.timeCol}>
              <View style={[styles.dot, { backgroundColor: dotColor }]}>
                {item.kind === 'stop' && (
                  <Text style={styles.dotNum}>{idx}</Text>
                )}
              </View>
              {!isLast(idx) && <View style={styles.line} />}
            </View>

            {/* ── Content card ─────────────────────────────────────────── */}
            <View style={[styles.card, isLast(idx) && styles.cardLast]}>
              {item.kind === 'start' && (
                <>
                  <Text style={styles.nodeType}>Start 🟢</Text>
                  <Text style={styles.nodeName} numberOfLines={2}>{item.label}</Text>
                  <Text style={styles.batteryLabel}>Battery: {item.battery}%</Text>
                  <BatteryBar pct={item.battery} />
                </>
              )}

              {item.kind === 'stop' && (
                <>
                  <View style={styles.stopHeader}>
                    <Text style={styles.nodeType}>Charging Stop 🔵</Text>
                    {onChangeStop && (
                      <TouchableOpacity
                        onPress={() => onChangeStop(item.station)}
                        style={styles.changeBtn}
                      >
                        <Text style={styles.changeBtnText}>Change</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.nodeName} numberOfLines={2}>{item.station.name}</Text>
                  <Text style={styles.nodeAddr} numberOfLines={1}>{item.station.address}</Text>

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Arrive at</Text>
                      <Text style={[styles.statVal, { color: item.battery < 20 ? colors.error : colors.text }]}>
                        {item.battery}%
                      </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Charge to</Text>
                      <Text style={[styles.statVal, { color: colors.success }]}>{item.departBattery}%</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Wait ~</Text>
                      <Text style={styles.statVal}>{CHARGE_WAIT_MIN} min</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Rate</Text>
                      <Text style={[styles.statVal, { color: colors.primary }]}>₹{item.station.pricePerKwh}/kWh</Text>
                    </View>
                  </View>
                  <BatteryBar pct={item.battery} />
                </>
              )}

              {item.kind === 'end' && (
                <>
                  <Text style={styles.nodeType}>Destination 🔴</Text>
                  <Text style={styles.nodeName} numberOfLines={2}>{item.label}</Text>
                  <Text style={styles.batteryLabel}>
                    Arrive at: <Text style={{ fontWeight: '800', color: item.battery < 15 ? colors.error : colors.success }}>{item.battery}%</Text>
                  </Text>
                  <BatteryBar pct={item.battery} />
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  heading: {
    fontSize: 16, fontWeight: '800', color: colors.text,
    marginBottom: 12, marginLeft: 2,
  },

  row:     { flexDirection: 'row', marginBottom: 0 },
  timeCol: { width: 40, alignItems: 'center' },

  dot: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  dotNum: { color: '#fff', fontSize: 11, fontWeight: '900' },

  line: { width: 2, flex: 1, backgroundColor: colors.border, minHeight: 16, marginTop: 2 },

  card: {
    flex: 1, marginLeft: 12,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLast: { marginBottom: 0 },

  stopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  nodeType:   { fontSize: 11, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  nodeName:   { fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 20, marginBottom: 2 },
  nodeAddr:   { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  batteryLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  changeBtn:     { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  changeBtnText: { fontSize: 12, color: colors.primary, fontWeight: '700' },

  statsRow:    { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 10, marginTop: 8, marginBottom: 4 },
  statItem:    { flex: 1, alignItems: 'center' },
  statLabel:   { fontSize: 10, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase' },
  statVal:     { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: 4 },
});
