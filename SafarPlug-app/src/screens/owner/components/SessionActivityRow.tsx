import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { format } from 'date-fns';
import { ChargingSession } from '../../../models/sessionModel';
import { colors } from '../../../core/constants/colors';

interface SessionActivityRowProps {
  session: ChargingSession;
  onPress?: () => void;
}

const durationStr = (startTime: string, endTime?: string): string => {
  try {
    const start = new Date(startTime).getTime();
    const end   = endTime ? new Date(endTime).getTime() : Date.now();
    const mins  = Math.round((end - start) / 60000);
    return mins >= 60
      ? `${Math.floor(mins / 60)}h ${mins % 60}m`
      : `${mins}m`;
  } catch { return '—'; }
};

export const SessionActivityRow: React.FC<SessionActivityRowProps> = ({ session, onPress }) => {
  const timeStr = (() => {
    try { return format(new Date(session.startTime), 'hh:mm a'); } catch { return '—'; }
  })();

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Vehicle icon */}
      <View style={styles.iconWrap}>
        <Text style={styles.vehicleIcon}>{session.vehicleType === 'bike' ? '🛵' : '🚗'}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.slotName}>
          {session.vehicleType === 'bike' ? '2-Wheeler' : 'Car'} · Slot
        </Text>
        <Text style={styles.meta}>
          {timeStr} · {durationStr(session.startTime, session.endTime)} · {session.energyUsedKwh.toFixed(1)} kWh
        </Text>
      </View>

      {/* Earned amount */}
      <View style={styles.earnedWrap}>
        <Text style={styles.earned}>+₹{session.totalCostRs.toFixed(0)}</Text>
        <View style={[
          styles.statusPill,
          { backgroundColor: session.paymentStatus === 'paid' ? '#ECFDF5' : '#FFF1F2' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: session.paymentStatus === 'paid' ? colors.success : colors.error }
          ]}>
            {session.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  iconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  vehicleIcon: { fontSize: 22 },
  info: { flex: 1 },
  slotName:   { fontSize: 14, fontWeight: '700', color: colors.text },
  meta:       { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  earnedWrap: { alignItems: 'flex-end', gap: 4 },
  earned:     { fontSize: 15, fontWeight: '900', color: colors.success },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800' },
});
