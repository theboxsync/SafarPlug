import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../../core/constants/colors';

// ─── Filter chip definitions ──────────────────────────────────────────────────
// Values map directly to ChargerType union + 'all'
export const FILTER_CHIPS = [
  { label: 'All',          value: 'all' },
  { label: '🛵 Bike 2W',   value: 'ac_slow_2w' },
  { label: '⚡ Car AC',    value: 'ac_slow_car' },
  { label: '⚡ AC Fast',   value: 'ac_fast_car' },
  { label: '🔋 DC Fast',   value: 'dc_fast_car' },
];

interface FilterChipRowProps {
  activeFilter: string;
  onFilterChange: (value: string) => void;
}

export const FilterChipRow: React.FC<FilterChipRowProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTER_CHIPS.map((chip) => {
        const active = activeFilter === chip.value;
        return (
          <TouchableOpacity
            key={chip.value}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onFilterChange(chip.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
});
