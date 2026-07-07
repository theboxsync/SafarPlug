import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../core/constants/colors';
import { theme } from '../../core/constants/theme';
import { calculateDistance, formatDistance } from '../../core/utils/distanceUtils';
import { LoadingWidget } from '../../core/components/LoadingWidget';
import { Charger, ChargerType } from '../../models/chargerModel';
import { Review } from '../../models/reviewModel';
import { stationService } from '../../services/stationService';
import { useStationStore } from '../../store/stationStore';
import { useAuthStore } from '../../store/authStore';
import { useStationDetail } from '../../hooks/useStationDetail';

import { ChargerSlotGrid } from './components/ChargerSlotGrid';
import { ReviewCard } from './components/ReviewCard';
import { BookingBottomSheet } from './components/BookingBottomSheet';

// ─── Charger type badge config ────────────────────────────────────────────────
const CHARGER_BADGE: Record<ChargerType, { label: string; color: string; bg: string }> = {
  ac_slow_2w:  { label: '🛵 2W AC',    color: '#D97706', bg: '#FEF3C7' },
  ac_slow_car: { label: '⚡ AC Slow',  color: '#1D9E75', bg: '#E8F5F1' },
  ac_fast_car: { label: '⚡ AC Fast',  color: '#0369A1', bg: '#E0F2FE' },
  dc_fast_car: { label: '🔋 DC Fast',  color: '#7C3AED', bg: '#EDE9FE' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export const StationDetailScreen = ({ route, navigation }: any) => {
  const { stationId } = route.params;
  const insets = useSafeAreaInsets();

  // ── React Query for station data ─────────────────────────────────────────
  const { data: station, isLoading, error } = useStationDetail(stationId);

  // ── Local state ──────────────────────────────────────────────────────────
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [isLoadingChargers, setIsLoadingChargers] = useState(false);
  const [showWriteReview, setShowWriteReview] = useState(false);

  const user = useAuthStore((s) => s.user);

  // ── Fetch chargers + reviews once station loads ───────────────────────────
  useEffect(() => {
    if (!stationId) return;

    const load = async () => {
      setIsLoadingChargers(true);
      try {
        const [chargersData, reviewsData] = await Promise.all([
          stationService.getChargers(stationId),
          stationService.getReviews(stationId),
        ]);
        setChargers(chargersData);
        setReviews(reviewsData);
      } catch {
        // Seed with sample data during development
        setChargers([
          { id: 'c1', stationId, chargerType: 'dc_fast_car', powerKw: 50, connectorType: 'ccs2',      isAvailable: true,  vehicleCompatibility: ['car'] },
          { id: 'c2', stationId, chargerType: 'ac_slow_car', powerKw: 22, connectorType: 'type2',     isAvailable: false, vehicleCompatibility: ['car'] },
          { id: 'c3', stationId, chargerType: 'ac_slow_2w',  powerKw: 3,  connectorType: 'home_plug', isAvailable: true,  vehicleCompatibility: ['bike'] },
        ]);
        setReviews([
          { id: 'r1', stationId, userId: 'u1', userName: 'Aarav Mehta',  rating: 5, comment: 'Very fast DC charging. Clean station.',         createdAt: new Date().toISOString() },
          { id: 'r2', stationId, userId: 'u2', userName: 'Priya Sharma', rating: 4, comment: 'Good experience, parking could be better.',    createdAt: new Date(Date.now() - 86400000).toISOString() },
        ]);
      } finally {
        setIsLoadingChargers(false);
      }
    };
    load();
  }, [stationId]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectCharger = useCallback((charger: Charger) => {
    setSelectedCharger((prev) => (prev?.id === charger.id ? null : charger));
  }, []);

  const handleBookSlot = () => {
    if (!selectedCharger) {
      // If nothing pre-selected, still open sheet so user can pick
    }
    setShowBooking(true);
  };

  const handleBookingSuccess = (sessionId: string) => {
    setShowBooking(false);
    navigation.navigate('ChargingSession', { sessionId });
  };

  // ── Star helper ───────────────────────────────────────────────────────────
  const renderStars = (rating: number, size = 16) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Text key={i} style={{ fontSize: size, color: i < Math.round(rating) ? '#F59E0B' : colors.border }}>
        ★
      </Text>
    ));

  // ── Unique charger types ──────────────────────────────────────────────────
  const uniqueChargerTypes = useMemo(
    () => Array.from(new Set(chargers.map((c) => c.chargerType))),
    [chargers]
  );

  // ── Compatible vehicles ───────────────────────────────────────────────────
  const compatibleVehicles = useMemo(() => {
    const vehicles = new Set<string>();
    chargers.forEach((c) => c.vehicleCompatibility.forEach((v) => vehicles.add(v)));
    return Array.from(vehicles);
  }, [chargers]);

  // ── Loading / error states ────────────────────────────────────────────────
  if (isLoading || !station) {
    return <LoadingWidget fullScreen message="Loading station details..." />;
  }

  if (error) {
    return (
      <View style={styles.errorWrap}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>Couldn't load station.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOpen = station.isActive; // simplified — ideally compare working hours

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Scrollable content ────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Map thumbnail ─────────────────────────────────────────────── */}
        <View style={styles.mapThumb}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            initialRegion={{
              latitude: station.latitude,
              longitude: station.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
          >
            <Marker coordinate={{ latitude: station.latitude, longitude: station.longitude }}>
              <View style={styles.mapPin}>
                <Text style={styles.mapPinIcon}>⚡</Text>
              </View>
            </Marker>
          </MapView>

          {/* Back button overlay */}
          <TouchableOpacity
            style={[styles.backOverlay, { top: insets.top + 10 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backOverlayText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Name + verified badge + address ──────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.nameRow}>
            <Text style={styles.stationName} numberOfLines={2}>
              {station.name}
            </Text>
            {station.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.address}>📍 {station.address}</Text>
        </View>

        {/* 3. Quick info row ────────────────────────────────────────────── */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <View style={[styles.statusDot, { backgroundColor: isOpen ? colors.success : colors.error }]} />
            <Text style={[styles.infoValue, { color: isOpen ? colors.success : colors.error }]}>
              {isOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Hours</Text>
            <Text style={styles.infoValue}>{station.workingHoursStart}–{station.workingHoursEnd}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <View style={styles.starRowSmall}>{renderStars(station.rating, 12)}</View>
            <Text style={styles.infoValue}>{station.rating.toFixed(1)} ({station.totalReviews})</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Price</Text>
            <Text style={styles.infoValue}>₹{station.pricePerKwh}/kWh</Text>
          </View>
        </View>

        {/* 4. Charger slots grid ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Charger Slots</Text>
          {isLoadingChargers ? (
            <LoadingWidget message="Loading chargers..." />
          ) : (
            <ChargerSlotGrid
              chargers={chargers}
              selectedChargerId={selectedCharger?.id}
              onSelectCharger={handleSelectCharger}
            />
          )}
        </View>

        {/* 5. Compatible vehicles ───────────────────────────────────────── */}
        {compatibleVehicles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compatible Vehicles</Text>
            <View style={styles.vehicleRow}>
              {compatibleVehicles.map((v) => (
                <View key={v} style={styles.vehicleBadge}>
                  <Text style={styles.vehicleBadgeIcon}>{v === 'bike' ? '🛵' : '🚗'}</Text>
                  <Text style={styles.vehicleBadgeLabel}>{v === 'bike' ? 'Bike' : 'Car'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Charger type badges */}
        {uniqueChargerTypes.length > 0 && (
          <View style={[styles.section, { paddingTop: 0 }]}>
            <View style={styles.chargerTypesRow}>
              {uniqueChargerTypes.map((type) => {
                const cfg = CHARGER_BADGE[type as ChargerType];
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

        {/* 6. Reviews ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          {/* Rating summary */}
          <View style={styles.reviewHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <View style={styles.avgRating}>
              <Text style={styles.avgRatingNum}>{station.rating.toFixed(1)}</Text>
              <View style={styles.starRow}>{renderStars(station.rating)}</View>
              <Text style={styles.avgRatingCount}>{station.totalReviews} reviews</Text>
            </View>
          </View>

          {reviews.length === 0 ? (
            <Text style={styles.noReviewsText}>No reviews yet. Be the first!</Text>
          ) : (
            reviews.map((r) => <ReviewCard key={r.id} review={r} />)
          )}

          {/* Write review button — only if logged in */}
          {user && (
            <TouchableOpacity
              style={styles.writeReviewBtn}
              onPress={() => navigation.navigate('WriteReview', { stationId })}
              activeOpacity={0.8}
            >
              <Text style={styles.writeReviewText}>✏️  Write a Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ── Sticky bottom bar ─────────────────────────────────────────── */}
      <View style={[styles.stickyBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.priceWrap}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.priceValue}>₹{station.pricePerKwh}<Text style={styles.priceUnit}>/kWh</Text></Text>
        </View>

        <TouchableOpacity
          style={[styles.bookBtn, !isOpen && styles.bookBtnDisabled]}
          onPress={handleBookSlot}
          disabled={!isOpen}
          activeOpacity={0.85}
        >
          <Text style={styles.bookBtnText}>
            {selectedCharger ? '⚡ Book Selected Slot' : '🔌 Book a Slot'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Booking bottom sheet ──────────────────────────────────────── */}
      {showBooking && station && (
        <BookingBottomSheet
          station={station}
          chargers={chargers}
          onClose={() => setShowBooking(false)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // ── Map thumbnail ──
  mapThumb: {
    height: 160,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  mapPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  mapPinIcon: { fontSize: 16 },

  // Back overlay button on map
  backOverlay: {
    position: 'absolute',
    left: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backOverlayText: { fontSize: 20, color: colors.text, fontWeight: '700' },

  // ── Sections ──
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: 0.1,
  },

  // ── Name row ──
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  stationName: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 28,
    marginRight: 10,
  },
  verifiedBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  address: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  // ── Info row ──
  infoRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  infoItem: { flex: 1, alignItems: 'center' },
  infoLabel: { fontSize: 10, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  infoValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  infoDivider: { width: 1, height: 30, backgroundColor: colors.border },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  starRowSmall: { flexDirection: 'row', marginBottom: 2 },

  // ── Vehicle badges ──
  vehicleRow: { flexDirection: 'row', gap: 10 },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  vehicleBadgeIcon: { fontSize: 20 },
  vehicleBadgeLabel: { fontSize: 14, fontWeight: '700', color: colors.text },

  // ── Charger type badges row ──
  chargerTypesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chargerBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chargerBadgeText: { fontSize: 13, fontWeight: '700' },

  // ── Reviews ──
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  avgRating: { alignItems: 'flex-end' },
  avgRatingNum: { fontSize: 26, fontWeight: '900', color: colors.text },
  starRow: { flexDirection: 'row', marginVertical: 2 },
  avgRatingCount: { fontSize: 11, color: colors.textLight },
  noReviewsText: { fontSize: 13, color: colors.textLight, fontStyle: 'italic', marginBottom: 12 },
  writeReviewBtn: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  writeReviewText: { fontSize: 14, fontWeight: '700', color: colors.primary },

  // ── Sticky bottom bar ──
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  priceWrap: { flex: 1 },
  priceLabel: { fontSize: 11, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase' },
  priceValue: { fontSize: 22, fontWeight: '900', color: colors.text },
  priceUnit: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },

  bookBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    flex: 1.4,
    alignItems: 'center',
    marginLeft: 16,
  },
  bookBtnDisabled: { opacity: 0.5 },
  bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // ── Error ──
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { fontSize: 16, color: colors.error, marginBottom: 20, textAlign: 'center' },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.primaryLight, borderRadius: 12 },
  backBtnText: { color: colors.primary, fontWeight: '700' },
});
