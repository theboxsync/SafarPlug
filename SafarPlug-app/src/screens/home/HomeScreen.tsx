import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../core/constants/colors';
import { theme } from '../../core/constants/theme';
import { calculateDistance, formatDistance } from '../../core/utils/distanceUtils';
import { Station } from '../../models/stationModel';
import { locationService } from '../../services/locationService';
import { useNearbyStations } from '../../hooks/useNearbyStations';
import { useStationStore } from '../../store/stationStore';

import { StationBottomSheet } from './components/StationBottomSheet';
import { StationMapMarker } from '../../core/components/StationMapMarker';

// ─── Filter chip definitions ──────────────────────────────────────────────────
const FILTER_CHIPS = [
  { label: 'All',         value: 'all' },
  { label: '🛵 Bike 2W',  value: 'ac_slow_2w' },
  { label: '⚡ Car AC',   value: 'ac_slow_car' },
  { label: '🔋 DC Fast',  value: 'dc_fast_car' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const chargerBadgeLabel = (type: string): string => {
  const map: Record<string, string> = {
    ac_slow_2w:  '2W AC',
    ac_slow_car: 'AC',
    ac_fast_car: 'AC Fast',
    dc_fast_car: 'DC Fast',
  };
  return map[type] ?? type.toUpperCase();
};

// ─── HomeScreen ───────────────────────────────────────────────────────────────
export const HomeScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [cityName, setCityName] = useState('Finding location…');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const mapRef = useRef<MapView>(null);
  const fabScale = useRef(new Animated.Value(1)).current;

  // Pull store helpers
  const { setVehicleFilter, searchRadiusKm } = useStationStore();

  // React Query — loads stations and syncs into stationStore
  const {
    data: stations = [],
    isLoading,
    refetch,
  } = useNearbyStations({
    lat: userCoords?.latitude ?? null,
    lng: userCoords?.longitude ?? null,
    filter: activeFilter,
    radiusKm: searchRadiusKm,
  });

  // ── On mount: request permission + get location ────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const loc = await locationService.getCurrentLocation();
        setUserCoords(loc);

        // Animate camera to user
        mapRef.current?.animateToRegion(
          {
            latitude: loc.latitude,
            longitude: loc.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          800
        );

        // Reverse geocode for city name
        const address = await locationService.getAddressFromLatLng(loc.latitude, loc.longitude);
        const parts = address.split(',');
        setCityName(parts[1]?.trim() || parts[0]?.trim() || 'Your Location');
      } catch {
        setCityName('Location unavailable');
      }
    })();
  }, []);

  // ── Filter change ──────────────────────────────────────────────────────────
  const handleFilterChange = useCallback(
    (value: string) => {
      setActiveFilter(value);
      setVehicleFilter(value);
    },
    [setVehicleFilter]
  );

  // ── Re-center FAB ──────────────────────────────────────────────────────────
  const handleRecenter = () => {
    if (!userCoords) return;

    // Bounce animation
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    mapRef.current?.animateToRegion(
      {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      },
      700
    );
  };

  // ── Navigate button ────────────────────────────────────────────────────────
  const handleNavigate = (station: Station) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${station.latitude},${station.longitude}`;
    const label = encodeURIComponent(station.name);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  // ── Marker color ───────────────────────────────────────────────────────────
  const markerColor = (station: Station) =>
    station.totalSlotsAvailable > 0 ? colors.primary : colors.error;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ── Full-screen map ───────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        initialRegion={{
          latitude: 28.6139,
          longitude: 77.209,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }}
        onPress={() => setSelectedStation(null)}
      >
        {stations.map((station: Station) => (
          <StationMapMarker
            key={station.id}
            coordinate={{ latitude: station.latitude, longitude: station.longitude }}
            availableSlots={station.totalSlotsAvailable}
            onPress={() => setSelectedStation(station)}
          />
        ))}
      </MapView>

      {/* ── Floating header overlay ───────────────────────────────────────── */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top + 8 }]}>
        {/* Search bar */}
        <TouchableOpacity
          style={[styles.searchCard, theme.shadows.medium]}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.9}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <View style={styles.searchTextWrap}>
            <Text style={styles.searchLabel}>Search stations</Text>
            <Text style={styles.searchCity} numberOfLines={1}>{cityName}</Text>
          </View>
          {isLoading && (
            <View style={styles.loadingDot} />
          )}
        </TouchableOpacity>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {FILTER_CHIPS.map((chip) => {
            const active = activeFilter === chip.value;
            return (
              <TouchableOpacity
                key={chip.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => handleFilterChange(chip.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Station count badge ───────────────────────────────────────────── */}
      {stations.length > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{stations.length} stations nearby</Text>
        </View>
      )}

      {/* ── FAB — re-center ───────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.fabWrap,
          { bottom: insets.bottom + 90, transform: [{ scale: fabScale }] },
        ]}
      >
        <TouchableOpacity
          style={[styles.fab, theme.shadows.heavy]}
          onPress={handleRecenter}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>◎</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Station bottom sheet ──────────────────────────────────────────── */}
      {selectedStation && (
        <StationBottomSheet
          station={selectedStation}
          userCoords={userCoords}
          onClose={() => setSelectedStation(null)}
          onViewDetails={() => {
            const id = selectedStation.id;
            setSelectedStation(null);
            navigation.navigate('StationDetail', { stationId: id });
          }}
          onNavigate={() => handleNavigate(selectedStation)}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header overlay ──
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchTextWrap: {
    flex: 1,
  },
  searchLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchCity: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 1,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.8,
  },

  // ── Filter chips ──
  chipRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    alignItems: 'center',
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

  // ── Station count badge ──
  countBadge: {
    position: 'absolute',
    top: 155,
    alignSelf: 'center',
    backgroundColor: 'rgba(29, 158, 117, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 10,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Custom marker pin ──
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  pinIcon: {
    fontSize: 16,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginTop: -1,
  },

  // ── FAB ──
  fabWrap: {
    position: 'absolute',
    right: 18,
    zIndex: 30,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  fabIcon: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: 'bold',
  },
});
