import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Charger, ChargerType } from '../../../models/chargerModel';
import { colors } from '../../../core/constants/colors';

const CHARGER_CONFIG: Record<ChargerType, { icon: string; label: string }> = {
  ac_slow_2w:  { icon: '🛵', label: 'AC Slow 2W'  },
  ac_slow_car: { icon: '⚡', label: 'AC Slow Car' },
  ac_fast_car: { icon: '⚡', label: 'AC Fast Car' },
  dc_fast_car: { icon: '🔋', label: 'DC Fast Car' },
};

interface ChargerToggleRowProps {
  charger: Charger;
  isInUse?: boolean;
  onToggleStatus: (available: boolean) => void;
}

export const ChargerToggleRow: React.FC<ChargerToggleRowProps> = ({
  charger, isInUse = false, onToggleStatus,
}) => {
  const cfg = CHARGER_CONFIG[charger.chargerType] ?? { icon: '🔌', label: charger.chargerType };

  const statusLabel = isInUse ? 'In Use' : charger.isAvailable ? 'Active' : 'Offline';
  const statusColor = isInUse ? colors.charging : charger.isAvailable ? colors.success : colors.textLight;
  const statusBg    = isInUse ? '#EFF6FF'     : charger.isAvailable ? '#ECFDF5'        : colors.surface;

  return (
    <View style={styles.row}>
      {/* Icon */}
      <Text style={styles.icon}>{cfg.icon}</Text>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.label}>{cfg.label}</Text>
        <Text style={styles.meta}>
          {charger.powerKw} kW · {charger.vehicleCompatibility.map((v) => v === 'bike' ? '🛵' : '🚗').join(' ')}
        </Text>
      </View>

      {/* Status badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      {/* Toggle switch */}
      <Switch
        value={charger.isAvailable}
        onValueChange={onToggleStatus}
        disabled={isInUse}
        trackColor={{ false: colors.border, true: colors.primaryLight }}
        thumbColor={charger.isAvailable ? colors.primary : colors.textLight}
        style={{ marginLeft: 10 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  icon:  { fontSize: 24, width: 32, textAlign: 'center' },
  info:  { flex: 1 },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  meta:  { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  statusDot:  { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
});
