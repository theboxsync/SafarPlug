import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../core/constants/colors';
import { locationService } from '../../services/locationService';
import { stationService } from '../../services/stationService';
import { useTripStore } from '../../store/tripStore';
import { useAuthStore } from '../../store/authStore';
import { Station } from '../../models/stationModel';
import { Trip } from '../../models/tripModel';
import { apiClient } from '../../services/apiClient';
import { ApiResponse } from '../../models/common';

import { BatterySlider } from './components/BatterySlider';
import { RouteStopList } from './components/RouteStopList';

// ─── Google Places autocomplete debounced helper ──────────────────────────────
const usePlaceSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ description: string; place_id: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (text.length < 3) { setResults([]); return; }

    timerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const resp = await apiClient.get<any>('/proxy/places/autocomplete', {
          params: { input: text, components: 'country:in' },
        });
        setResults(resp.data?.predictions ?? []);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }, []);

  const clear = () => { setQuery(''); setResults([]); };

  return { query, results, isSearching, search, clear };
};

// ─── Vehicle defaults ─────────────────────────────────────────────────────────
const VEHICLE_DEFAULTS: Record<'car' | 'bike', number> = { car: 300, bike: 120 };

// ─── Main screen ──────────────────────────────────────────────────────────────
export const TripPlannerScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  // store
  const {
    fromLocation, toLocation, vehicleType, batteryPercent, vehicleRangeKm,
    currentTrip, suggestedStops, routePolyline,
    isLoading, error,
    setFromLocation, setToLocation, setVehicleType, setBatteryPercent, setVehicleRangeKm,
    calculateTrip, clearTrip,
  } = useTripStore();

  const user = useAuthStore((s) => s.user);

  // local UI state
  const [fromText, setFromText] = useState('');
  const [toText, setToText]     = useState('');
  const [fromFocused, setFromFocused] = useState(false);
  const [toFocused, setToFocused]     = useState(false);
  const [gettingGps, setGettingGps]   = useState(false);
  const [savingTrip, setSavingTrip]   = useState(false);

  // autocomplete for "To" field
  const toSearch = usePlaceSearch();

  const mapRef = useRef<MapView>(null);

  // ── sync range with vehicle type ──────────────────────────────────────────
  useEffect(() => {
    setVehicleRangeKm(VEHICLE_DEFAULTS[vehicleType]);
  }, [vehicleType]);

  // ── fit map when polyline is ready ────────────────────────────────────────
  useEffect(() => {
    if (routePolyline.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(routePolyline, {
        edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
        animated: true,
      });
    }
  }, [routePolyline]);

  // ── get GPS for "From" ────────────────────────────────────────────────────
  const handleUseGps = async () => {
    setGettingGps(true);
    try {
      const loc = await locationService.getCurrentLocation();
      const addr = await locationService.getAddressFromLatLng(loc.latitude, loc.longitude);
      const shortAddr = addr.split(',').slice(0, 2).join(',').trim();
      setFromText(shortAddr);
      setFromLocation({ ...loc, address: shortAddr });
    } catch {
      setFromText('Current Location');
      setFromLocation({ latitude: 28.6139, longitude: 77.2090, address: 'Current Location' });
    } finally {
      setGettingGps(false);
    }
  };

  // ── select autocomplete suggestion ────────────────────────────────────────
  const handleSelectSuggestion = async (desc: string) => {
    setToText(desc);
    toSearch.clear();
    setToFocused(false);
    try {
      const coords = await locationService.getLatLngFromAddress(desc);
      setToLocation({ ...coords, address: desc });
    } catch {
      // keep address only, geocode fails gracefully inside calculateTrip
    }
  };

  // ── plan trip ─────────────────────────────────────────────────────────────
  const handlePlan = async () => {
    if (!fromText.trim() || !toText.trim()) return;

    // If locations not yet geocoded (typed manually), geocode now
    if (!fromLocation) {
      try {
        const c = await locationService.getLatLngFromAddress(fromText);
        setFromLocation({ ...c, address: fromText });
      } catch { return; }
    }
    if (!toLocation) {
      try {
        const c = await locationService.getLatLngFromAddress(toText);
        setToLocation({ ...c, address: toText });
      } catch { return; }
    }
    await new Promise((r) => setTimeout(r, 50));
    await calculateTrip();
  };

  // ── open Google Maps navigation with waypoints ────────────────────────────
  const handleStartNavigation = () => {
    if (!fromLocation || !toLocation) return;
    const origin      = `${fromLocation.latitude},${fromLocation.longitude}`;
    const destination = `${toLocation.latitude},${toLocation.longitude}`;
    const waypoints   = suggestedStops
      .map((s) => `${s.latitude},${s.longitude}`)
      .join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
    Linking.openURL(url);
  };

  // ── save trip to backend ──────────────────────────────────────────────────
  const handleSaveTrip = async () => {
    if (!currentTrip || !user) return;
    setSavingTrip(true);
    try {
      await apiClient.post<ApiResponse<Trip>>('/trips', currentTrip);
    } catch { /* silent — trip already calculated */ }
    finally { setSavingTrip(false); }
  };

  // ── reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    clearTrip();
    setFromText(''); setToText('');
    toSearch.clear();
  };

  const canPlan = fromText.trim().length > 0 && toText.trim().length > 0 && !isLoading;
  const hasDeadZone = currentTrip && suggestedStops.length === 0
    && currentTrip.estimatedDistanceKm > vehicleRangeKm * (batteryPercent / 100);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.title}>EV Trip Planner</Text>
          <Text style={styles.subtitle}>Smart charging stops along your route</Text>
        </View>

        {/* ── 1. Route input card ──────────────────────────────────────── */}
        <View style={styles.card}>
          {/* FROM field */}
          <View style={styles.inputRow}>
            <View style={styles.dot_green} />
            <View style={styles.inputWrap}>
              <TextInput
                testID="starting-point-input"
                style={styles.input}
                placeholder="Starting point"
                placeholderTextColor={colors.textLight}
                value={fromText}
                onChangeText={(t) => { setFromText(t); setFromLocation(null); }}
                onFocus={() => setFromFocused(true)}
                onBlur={() => setFromFocused(false)}
                returnKeyType="next"
              />
            </View>
            {/* GPS button */}
            <TouchableOpacity style={styles.gpsBtn} onPress={handleUseGps} disabled={gettingGps}>
              {gettingGps
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={styles.gpsBtnIcon}>📍</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Connector line */}
          <View style={styles.connectorLine} />

          {/* TO field */}
          <View style={styles.inputRow}>
            <View style={styles.dot_red} />
            <View style={styles.inputWrap}>
              <TextInput
                testID="destination-input"
                style={styles.input}
                placeholder="Destination"
                placeholderTextColor={colors.textLight}
                value={toText}
                onChangeText={(t) => { setToText(t); toSearch.search(t); setToLocation(null); }}
                onFocus={() => setToFocused(true)}
                onBlur={() => setTimeout(() => setToFocused(false), 150)}
                returnKeyType="search"
              />
            </View>
            {toSearch.isSearching && (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 10 }} />
            )}
          </View>

          {/* Autocomplete dropdown */}
          {toFocused && toSearch.results.length > 0 && (
            <View style={styles.dropdown}>
              {toSearch.results.slice(0, 5).map((r) => (
                <TouchableOpacity
                  key={r.place_id}
                  style={styles.dropdownItem}
                  onPress={() => handleSelectSuggestion(r.description)}
                >
                  <Text style={styles.dropdownIcon}>📍</Text>
                  <Text style={styles.dropdownText} numberOfLines={2}>{r.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── 2. Vehicle & battery ─────────────────────────────────────── */}
        <View style={styles.card}>
          {/* Vehicle type toggle */}
          <Text style={styles.sectionLabel}>Vehicle Type</Text>
          <View style={styles.toggleRow}>
            {(['car', 'bike'] as const).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.toggleBtn, vehicleType === v && styles.toggleBtnActive]}
                onPress={() => setVehicleType(v)}
              >
                <Text style={styles.toggleIcon}>{v === 'car' ? '🚗' : '🛵'}</Text>
                <Text style={[styles.toggleLabel, vehicleType === v && styles.toggleLabelActive]}>
                  {v === 'car' ? 'Car' : 'Bike'}
                </Text>
                {vehicleType === v && (
                  <Text style={styles.toggleDefault}>
                    (default {VEHICLE_DEFAULTS[v]} km)
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Battery slider */}
          <BatterySlider value={batteryPercent} onChange={setBatteryPercent} />

          {/* Range input */}
          <View style={styles.rangeRow}>
            <Text style={styles.rangeLabel}>Vehicle range (full charge)</Text>
            <View style={styles.rangeInputWrap}>
              <TextInput
                style={styles.rangeInput}
                keyboardType="numeric"
                value={String(vehicleRangeKm)}
                onChangeText={(t) => { const n = parseFloat(t); if (!isNaN(n)) setVehicleRangeKm(n); }}
              />
              <Text style={styles.rangeUnit}>km</Text>
            </View>
          </View>
        </View>

        {/* ── 3. Plan button ───────────────────────────────────────────── */}
        {!currentTrip && (
          <TouchableOpacity
            style={[styles.planBtn, !canPlan && styles.planBtnDisabled]}
            onPress={handlePlan}
            disabled={!canPlan}
            activeOpacity={0.85}
          >
            {isLoading
              ? <><ActivityIndicator color="#fff" size="small" /><Text style={styles.planBtnText}>  Finding best stops…</Text></>
              : <Text style={styles.planBtnText}>⚡ Plan My Trip</Text>
            }
          </TouchableOpacity>
        )}

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {error && !isLoading && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* ── 4. Route map ─────────────────────────────────────────────── */}
        {currentTrip && (
          <>
            <View style={styles.mapWrap}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFill}
                initialRegion={{
                  latitude: fromLocation?.latitude ?? 28.6139,
                  longitude: fromLocation?.longitude ?? 77.209,
                  latitudeDelta: 4,
                  longitudeDelta: 4,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                {/* Blue route polyline */}
                {routePolyline.length > 1 && (
                  <Polyline
                    coordinates={routePolyline}
                    strokeColor="#2563EB"
                    strokeWidth={4}
                  />
                )}

                {/* Green start pin */}
                {fromLocation && (
                  <Marker coordinate={fromLocation} anchor={{ x: 0.5, y: 1 }}>
                    <View style={[styles.mapPin, { backgroundColor: colors.success }]}>
                      <Text style={styles.mapPinIcon}>A</Text>
                    </View>
                  </Marker>
                )}

                {/* Red end pin */}
                {toLocation && (
                  <Marker coordinate={toLocation} anchor={{ x: 0.5, y: 1 }}>
                    <View style={[styles.mapPin, { backgroundColor: colors.error }]}>
                      <Text style={styles.mapPinIcon}>B</Text>
                    </View>
                  </Marker>
                )}

                {/* Blue station stop pins */}
                {suggestedStops.map((stop, i) => (
                  <Marker
                    key={stop.id}
                    coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                    anchor={{ x: 0.5, y: 1 }}
                  >
                    <View style={[styles.mapPin, { backgroundColor: '#2563EB' }]}>
                      <Text style={styles.mapPinIcon}>{i + 1}</Text>
                    </View>
                  </Marker>
                ))}
              </MapView>
            </View>

            {/* ── 5. Trip summary + timeline ──────────────────────────── */}
            <View style={styles.card}>
              {/* Summary stats */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatIcon}>📏</Text>
                  <Text style={styles.summaryStatVal}>{currentTrip.estimatedDistanceKm} km</Text>
                  <Text style={styles.summaryStatLabel}>Distance</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatIcon}>🔌</Text>
                  <Text style={styles.summaryStatVal}>{suggestedStops.length}</Text>
                  <Text style={styles.summaryStatLabel}>Stops</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatIcon}>⏱️</Text>
                  <Text style={styles.summaryStatVal}>
                    ~{Math.round(currentTrip.estimatedDistanceKm / 60)} h
                  </Text>
                  <Text style={styles.summaryStatLabel}>Drive Time</Text>
                </View>
              </View>

              {/* ── 6. Dead zone warning ────────────────────────────────── */}
              {hasDeadZone && (
                <View style={styles.deadZoneBanner}>
                  <Text style={styles.deadZoneIcon}>⚠️</Text>
                  <Text style={styles.deadZoneText}>
                    No charging stations found on this route segment. Check for range limits.
                  </Text>
                </View>
              )}
            </View>

            {/* Timeline */}
            <RouteStopList
              fromName={currentTrip.fromName}
              toName={currentTrip.toName}
              stops={suggestedStops}
              startBattery={batteryPercent}
              vehicleRangeKm={vehicleRangeKm}
              totalDistanceKm={currentTrip.estimatedDistanceKm}
              onChangeStop={(stop) => navigation.navigate('Home')}
            />

            {/* ── 7. Action buttons ────────────────────────────────────── */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={handleStartNavigation}
              activeOpacity={0.85}
            >
              <Text style={styles.navBtnText}>🗺️  Start Navigation</Text>
            </TouchableOpacity>

            <View style={styles.secondaryBtns}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveTrip}
                disabled={savingTrip}
                activeOpacity={0.8}
              >
                {savingTrip
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={styles.saveBtnText}>💾 Save Trip</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
                <Text style={styles.resetBtnText}>✕ New Trip</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: 16 },

  // ── Header ──
  header:   { marginBottom: 16 },
  title:    { fontSize: 26, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },

  // ── Card ──
  card: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // ── Route input ──
  inputRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  dot_green: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.success, marginRight: 12, marginLeft: 4 },
  dot_red:   { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.error,   marginRight: 12, marginLeft: 4 },
  connectorLine: { width: 2, height: 16, backgroundColor: colors.border, marginLeft: 10, marginVertical: 2 },
  inputWrap: { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.border, marginRight: 8 },
  input: { fontSize: 15, color: colors.text, paddingVertical: 8, height: 40 },
  gpsBtn: { padding: 8 },
  gpsBtnIcon: { fontSize: 20 },

  // ── Autocomplete dropdown ──
  dropdown: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownIcon: { fontSize: 14, marginRight: 8, marginTop: 2 },
  dropdownText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },

  // ── Vehicle & battery ──
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  toggleRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, gap: 6,
  },
  toggleBtnActive:   { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  toggleIcon:        { fontSize: 22 },
  toggleLabel:       { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  toggleLabelActive: { color: colors.primary },
  toggleDefault:     { fontSize: 11, color: colors.textLight },

  rangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  rangeLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  rangeInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6 },
  rangeInput: { fontSize: 16, fontWeight: '700', color: colors.text, minWidth: 50, textAlign: 'center' },
  rangeUnit: { fontSize: 13, color: colors.textLight, marginLeft: 4 },

  // ── Plan button ──
  planBtn: {
    backgroundColor: colors.primary, borderRadius: 16, height: 56,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, gap: 8,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  planBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  planBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // ── Error ──
  errorBanner: { backgroundColor: '#FFF1F2', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#FECDD3' },
  errorText: { fontSize: 13, color: colors.error, lineHeight: 18 },

  // ── Map ──
  mapWrap: { height: 220, borderRadius: 18, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  mapPin: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  mapPinIcon: { color: '#fff', fontSize: 11, fontWeight: '900' },

  // ── Summary row ──
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  summaryStat: { alignItems: 'center', flex: 1 },
  summaryStatIcon: { fontSize: 22, marginBottom: 4 },
  summaryStatVal: { fontSize: 18, fontWeight: '900', color: colors.text },
  summaryStatLabel: { fontSize: 11, color: colors.textLight, marginTop: 2, fontWeight: '600' },
  summaryDivider: { width: 1, height: 40, backgroundColor: colors.border },

  // ── Dead zone banner ──
  deadZoneBanner: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB',
    borderRadius: 10, padding: 12, marginTop: 14,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  deadZoneIcon: { fontSize: 16, marginRight: 8, marginTop: 1 },
  deadZoneText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },

  // ── Action buttons ──
  navBtn: {
    backgroundColor: '#2563EB', borderRadius: 16, height: 56,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  navBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  secondaryBtns: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  saveBtn: {
    flex: 1, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.primaryLight, borderWidth: 1.5, borderColor: colors.primary,
  },
  saveBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  resetBtn: {
    flex: 1, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
  },
  resetBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 14 },
});
