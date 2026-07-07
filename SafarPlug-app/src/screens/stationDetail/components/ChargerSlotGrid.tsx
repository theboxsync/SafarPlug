import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Charger, ChargerType } from '../../../models/chargerModel';
import { colors } from '../../../core/constants/colors';

// ─── Charger display config ───────────────────────────────────────────────────
const CHARGER_CONFIG: Record<
  ChargerType,
  { label: string; icon: string; accentColor: string; bg: string }
> = {
  ac_slow_2w:  { label: 'AC Slow 2W',  icon: '🛵', accentColor: '#D97706', bg: '#FEF3C7' },
  ac_slow_car: { label: 'AC Slow',     icon: '⚡', accentColor: '#1D9E75', bg: '#E8F5F1' },
  ac_fast_car: { label: 'AC Fast',     icon: '⚡', accentColor: '#0369A1', bg: '#E0F2FE' },
  dc_fast_car: { label: 'DC Fast',     icon: '🔋', accentColor: '#7C3AED', bg: '#EDE9FE' },
};

const CONNECTOR_LABELS: Record<string, string> = {
  type2:     'Type 2',
  ccs2:      'CCS2',
  home_plug: 'Home Plug',
};

interface ChargerSlotGridProps {
  chargers: Charger[];
  selectedChargerId?: string;
  onSelectCharger: (charger: Charger) => void;
}

const ChargerCard: React.FC<{
  charger: Charger;
  selected: boolean;
  onPress: () => void;
}> = ({ charger, selected, onPress }) => {
  const cfg = CHARGER_CONFIG[charger.chargerType] ?? {
    label: charger.chargerType,
    icon: '🔌',
    accentColor: colors.primary,
    bg: colors.surface,
  };
  const available = charger.isAvailable;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!available}
      activeOpacity={0.8}
      style={[
        styles.card,
        selected && styles.cardSelected,
        !available && styles.cardDisabled,
        { borderColor: selected ? colors.primary : available ? cfg.accentColor : colors.border },
      ]}
    >
      {/* Icon badge */}
      <View style={[styles.iconBadge, { backgroundColor: cfg.bg }]}>
        <Text style={styles.icon}>{cfg.icon}</Text>
      </View>

      {/* Header row: type + status */}
      <View style={styles.cardHeader}>
        <Text style={styles.chargerLabel} numberOfLines={1}>{cfg.label}</Text>
        <View style={[styles.statusDot, { backgroundColor: available ? colors.success : colors.error }]} />
      </View>

      {/* Power */}
      <Text style={styles.power}>{charger.powerKw} kW</Text>

      {/* Connector */}
      <Text style={styles.connector}>
        {CONNECTOR_LABELS[charger.connectorType] ?? charger.connectorType}
      </Text>

      {/* Vehicle compatibility */}
      <View style={styles.vehicleRow}>
        {charger.vehicleCompatibility.map((v) => (
          <Text key={v} style={styles.vehicleChip}>
            {v === 'bike' ? '🛵' : '🚗'}
          </Text>
        ))}
      </View>

      {/* Status footer */}
      <View style={[styles.footer, { backgroundColor: available ? '#ECFDF5' : '#FFF1F2' }]}>
        <Text style={[styles.footerText, { color: available ? colors.success : colors.error }]}>
          {available ? (selected ? '✓ Selected' : '⚡ Tap to select') : 'Occupied'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const ChargerSlotGrid: React.FC<ChargerSlotGridProps> = ({
  chargers,
  selectedChargerId,
  onSelectCharger,
}) => {
  if (!chargers || chargers.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No chargers found for this station.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={chargers}
      keyExtractor={(item) => item.id}
      numColumns={2}
      scrollEnabled={false}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <ChargerCard
          charger={item}
          selected={item.id === selectedChargerId}
          onPress={() => onSelectCharger(item)}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  list: { paddingVertical: 8 },
  row:  { gap: 10, marginBottom: 10 },
  empty: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, color: colors.textLight, fontStyle: 'italic' },

  card: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  cardSelected: {
    backgroundColor: '#F0FDF4',
  },
  cardDisabled: {
    opacity: 0.6,
  },

  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: { fontSize: 18 },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chargerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },

  power: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  connector: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '500',
    marginBottom: 8,
  },

  vehicleRow: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  vehicleChip: { fontSize: 16 },

  footer: {
    marginHorizontal: -14,
    marginBottom: -14,
    paddingVertical: 7,
    alignItems: 'center',
  },
  footerText: { fontSize: 11, fontWeight: '700' },
});
