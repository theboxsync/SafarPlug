import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../../core/constants/colors';
import { theme } from '../../../core/constants/theme';
import { calculateDistance, formatDistance } from '../../../core/utils/distanceUtils';
import { Station } from '../../../models/stationModel';
import { ChargerType } from '../../../models/chargerModel';

// ─── Charger badge config ─────────────────────────────────────────────────────
const CHARGER_LABELS: Record<ChargerType, { label: string; color: string; bg: string }> = {
  ac_slow_2w:  { label: '🛵 2W AC',   color: '#D97706', bg: '#FEF3C7' },
  ac_slow_car: { label: '⚡ AC Slow', color: '#1D9E75', bg: '#E8F5F1' },
  ac_fast_car: { label: '⚡ AC Fast', color: '#0369A1', bg: '#E0F2FE' },
  dc_fast_car: { label: '🔋 DC Fast', color: '#7C3AED', bg: '#EDE9FE' },
};

interface StationBottomSheetProps {
  station: Station | null;
  userCoords: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onViewDetails: () => void;
  onNavigate: () => void;
}

export const StationBottomSheet: React.FC<StationBottomSheetProps> = ({
  station,
  userCoords,
  onClose,
  onViewDetails,
  onNavigate,
}) => {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['48%', '72%'], []);

  // Open sheet whenever a station is selected
  useEffect(() => {
    if (station) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [station]);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
    onClose();
  }, [onClose]);

  if (!station) return null;

  const isAvailable = station.totalSlotsAvailable > 0 && station.isActive;
  const distanceKm = userCoords
    ? calculateDistance(userCoords, { latitude: station.latitude, longitude: station.longitude })
    : null;

  const uniqueChargerTypes = Array.from(new Set(station.chargerTypes));

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header row ─────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {/* Availability badge */}
            <View style={[styles.statusBadge, isAvailable ? styles.badgeAvail : styles.badgeBusy]}>
              <View style={[styles.statusDot, { backgroundColor: isAvailable ? colors.success : colors.error }]} />
              <Text style={[styles.statusText, { color: isAvailable ? colors.success : colors.error }]}>
                {isAvailable ? 'Available' : 'Busy'}
              </Text>
            </View>

            <Text style={styles.stationName} numberOfLines={2}>
              {station.name}
            </Text>
            <Text style={styles.address} numberOfLines={2}>
              📍 {station.address}
            </Text>
          </View>

          {/* Rating pill */}
          <View style={styles.ratingPill}>
            <Text style={styles.ratingStars}>★</Text>
            <Text style={styles.ratingValue}>{station.rating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({station.totalReviews})</Text>
          </View>
        </View>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>📏</Text>
            <Text style={styles.statValue}>{distanceKm !== null ? formatDistance(distanceKm) : '—'}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>₹{station.pricePerKwh}/kWh</Text>
            <Text style={styles.statLabel}>Price</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🔌</Text>
            <Text style={styles.statValue}>{station.totalSlotsAvailable}</Text>
            <Text style={styles.statLabel}>Open Slots</Text>
          </View>
        </View>

        {/* ── Charger type badges ─────────────────────────────────────────── */}
        {uniqueChargerTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Charger Types</Text>
            <View style={styles.badgeRow}>
              {uniqueChargerTypes.map((type) => {
                const cfg = CHARGER_LABELS[type as ChargerType];
                if (!cfg) return null;
                return (
                  <View key={type} style={[styles.chargerBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.chargerBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Working hours ───────────────────────────────────────────────── */}
        <View style={styles.hoursRow}>
          <Text style={styles.hoursIcon}>🕐</Text>
          <Text style={styles.hoursText}>
            Open {station.workingHoursStart} – {station.workingHoursEnd}
          </Text>
          {station.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.navigateBtn]}
            onPress={onNavigate}
            activeOpacity={0.85}
          >
            <Text style={styles.navigateBtnIcon}>🗺️</Text>
            <Text style={styles.navigateBtnText}>Navigate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.detailsBtn]}
            onPress={onViewDetails}
            activeOpacity={0.85}
          >
            <Text style={styles.detailsBtnText}>View Details →</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    backgroundColor: colors.border,
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // ── Header ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  stationName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    lineHeight: 24,
  },
  address: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },

  // Status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeAvail: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  badgeBusy: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Rating
  ratingPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  ratingStars: {
    color: colors.accent,
    fontSize: 16,
  },
  ratingValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  ratingCount: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 1,
  },

  // ── Stats row ──
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },

  // ── Section ──
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chargerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chargerBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Hours ──
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hoursIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  hoursText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  verifiedBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },

  // ── Action buttons ──
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  navigateBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    flex: 0.45,
  },
  navigateBtnIcon: {
    fontSize: 18,
  },
  navigateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  detailsBtn: {
    backgroundColor: colors.primary,
    flex: 0.55,
  },
  detailsBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
