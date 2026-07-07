import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors } from '../../../core/constants/colors';

interface BatterySliderProps {
  value: number;   // 0–100
  onChange: (value: number) => void;
}

// ─── Battery icon based on charge level ──────────────────────────────────────
const getBatteryIcon = (pct: number): string => {
  if (pct >= 80) return '🔋';
  if (pct >= 50) return '🔋';
  if (pct >= 20) return '🪫';
  return '🪫';
};

const getBatteryColor = (pct: number): string => {
  if (pct < 20) return colors.error;
  if (pct < 50) return '#F59E0B';
  return colors.success;
};

export const BatterySlider: React.FC<BatterySliderProps> = ({ value, onChange }) => {
  const barColor = getBatteryColor(value);

  return (
    <View style={styles.container}>
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>Current Battery</Text>
        <View style={styles.valuePill}>
          <Text style={styles.batteryIcon}>{getBatteryIcon(value)}</Text>
          <Text style={[styles.valueText, { color: barColor }]}>{value}%</Text>
        </View>
      </View>

      {/* Slider */}
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={100}
        step={1}
        value={value}
        onValueChange={(v) => onChange(Math.round(v))}
        minimumTrackTintColor={barColor}
        maximumTrackTintColor={colors.border}
        thumbTintColor={barColor}
      />

      {/* Scale labels */}
      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>0%</Text>
        <Text style={styles.scaleLabel}>25%</Text>
        <Text style={styles.scaleLabel}>50%</Text>
        <Text style={styles.scaleLabel}>75%</Text>
        <Text style={styles.scaleLabel}>100%</Text>
      </View>

      {/* Status message */}
      <Text style={[styles.statusText, { color: barColor }]}>
        {value < 20
          ? '⚠️ Low battery — charging stop required soon'
          : value < 50
          ? '🔶 Moderate — plan stops for long trips'
          : '✅ Good — ready for most routes'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  batteryIcon: { fontSize: 16 },
  valueText: {
    fontSize: 16,
    fontWeight: '900',
  },

  slider: {
    width: '100%',
    height: 40,
  },

  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  scaleLabel: {
    fontSize: 10,
    color: colors.textLight,
    fontWeight: '500',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
