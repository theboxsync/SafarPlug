import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../core/constants/colors';
import { locationService } from '../../services/locationService';
import { stationService } from '../../services/stationService';
import { useAuthStore } from '../../store/authStore';

// ─── Charger type options ─────────────────────────────────────────────────────
const CHARGER_OPTIONS = [
  { id: 'ac_slow_2w',  icon: '🛵', label: 'AC Slow',       sub: '3.3 kW — 2-Wheeler', chargerType: 'ac_slow_2w'  },
  { id: 'ac_slow_car', icon: '⚡', label: 'AC Slow',       sub: '7 kW — Car',          chargerType: 'ac_slow_car' },
  { id: 'ac_fast_car', icon: '⚡', label: 'AC Fast',       sub: '22 kW — Car',         chargerType: 'ac_fast_car' },
  { id: 'dc_fast_car', icon: '🔋', label: 'DC Fast',       sub: '50 kW — Car',         chargerType: 'dc_fast_car' },
  { id: 'dc_ultra',    icon: '🔋', label: 'DC Ultra Fast', sub: '150 kW — Car',        chargerType: 'dc_fast_car' },
] as const;

// ─── Amenity options ──────────────────────────────────────────────────────────
const AMENITY_OPTIONS = [
  { id: 'parking',  icon: '🅿️', label: 'Parking Available' },
  { id: 'restroom', icon: '🚻', label: 'Restroom Nearby' },
  { id: 'waiting',  icon: '🪑', label: 'Waiting Area' },
  { id: 'cafe',     icon: '☕', label: 'Cafe/Shop Nearby' },
];

// ─── Form types ───────────────────────────────────────────────────────────────
interface FormData {
  stationName:  string;
  description?: string;
  phone:        string;
  pricePerKwh:  string;
  twoPriceEnabled: boolean;
  twoPricePerKwh?: string;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

// ─── Time formatter ───────────────────────────────────────────────────────────
const formatTime = (date: Date): string =>
  date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

// ─── Main screen ──────────────────────────────────────────────────────────────
export const RegisterStationScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const user   = useAuthStore((s) => s.user);

  const {
    control, handleSubmit, watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      stationName:     '',
      description:     '',
      phone:           user?.phone ?? '',
      pricePerKwh:     '',
      twoPriceEnabled: false,
      twoPricePerKwh:  '',
    },
  });

  const twoPriceEnabled = watch('twoPriceEnabled');

  // ── Map pin state ─────────────────────────────────────────────────────────
  const [pinCoords, setPinCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pinAddress, setPinAddress] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const mapRef = useRef<MapView>(null);

  const handleMapPress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPinCoords({ latitude, longitude });
    try {
      const addr = await locationService.getAddressFromLatLng(latitude, longitude);
      setPinAddress(addr);
    } catch {
      setPinAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    }
  };

  const handleUseCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const loc = await locationService.getCurrentLocation();
      setPinCoords(loc);
      mapRef.current?.animateToRegion({ ...loc, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
      const addr = await locationService.getAddressFromLatLng(loc.latitude, loc.longitude);
      setPinAddress(addr);
    } catch {
      Alert.alert('Location Error', 'Could not fetch current location.');
    } finally {
      setGettingLocation(false);
    }
  };

  // ── Selected charger types ────────────────────────────────────────────────
  const [selectedChargers, setSelectedChargers] = useState<Set<string>>(new Set());
  const toggleCharger = (id: string) => {
    setSelectedChargers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Working hours ─────────────────────────────────────────────────────────
  const [open24h, setOpen24h] = useState(false);
  const [startTime, setStartTime] = useState(() => { const d = new Date(); d.setHours(6, 0, 0); return d; });
  const [endTime,   setEndTime]   = useState(() => { const d = new Date(); d.setHours(23, 0, 0); return d; });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);

  // ── Photos ────────────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<string[]>([]);

  const handlePickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri).slice(0, 5);
      setPhotos((prev) => [...prev, ...uris].slice(0, 5));
    }
  };

  const removePhoto = (uri: string) => setPhotos((p) => p.filter((x) => x !== uri));

  // ── Amenities ─────────────────────────────────────────────────────────────
  const [amenities, setAmenities] = useState<Set<string>>(new Set());
  const toggleAmenity = (id: string) => {
    setAmenities((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: FormData) => {
    // Validate extras
    if (!pinCoords) {
      Alert.alert('Location required', 'Please pin your station location on the map.'); return;
    }
    if (selectedChargers.size === 0) {
      Alert.alert('Charger type required', 'Select at least one charger type.'); return;
    }
    if (!data.pricePerKwh || isNaN(parseFloat(data.pricePerKwh))) {
      Alert.alert('Price required', 'Enter a valid price per kWh.'); return;
    }

    setIsSubmitting(true);
    try {
      const chargerTypes = Array.from(selectedChargers).map(
        (id) => CHARGER_OPTIONS.find((c) => c.id === id)?.chargerType
      ).filter(Boolean) as string[];

      const station = await stationService.registerStation({
        name:               data.stationName,
        description:        data.description,
        address:            pinAddress,
        latitude:           pinCoords.latitude,
        longitude:          pinCoords.longitude,
        pricePerKwh:        parseFloat(data.pricePerKwh),
        chargerTypes,
        workingHoursStart:  open24h ? '00:00' : startTime.toTimeString().slice(0, 5),
        workingHoursEnd:    open24h ? '23:59' : endTime.toTimeString().slice(0, 5),
        amenities:          Array.from(amenities),
        phone:              data.phone,
      });

      // Upload photos if any
      if (photos.length > 0) {
        await stationService.uploadStationPhotos(station.id, photos).catch(() => null);
      }

      Alert.alert(
        '🎉 Station Submitted!',
        'Your station has been submitted! Our team will verify and list it within 24 hours.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message ?? 'Could not register station. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Register Your Station</Text>
            <Text style={styles.headerSubtitle}>List your charging point on SafarPlug</Text>
          </View>
        </View>

        {/* ── 2. Basic info ────────────────────────────────────────────── */}
        <Section title="Basic Information">
          <Controller
            control={control}
            name="stationName"
            rules={{ required: 'Station name is required' }}
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Station Name *</Text>
                <TextInput
                  style={[styles.input, errors.stationName && styles.inputError]}
                  placeholder="e.g. GreenCharge Sector 21"
                  placeholderTextColor={colors.textLight}
                  value={value}
                  onChangeText={onChange}
                />
                {errors.stationName && <Text style={styles.errorMsg}>{errors.stationName.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder="Describe your station, parking, access route…"
                  placeholderTextColor={colors.textLight}
                  value={value}
                  onChangeText={onChange}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="phone"
            rules={{ required: 'Contact phone is required' }}
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Contact Phone *</Text>
                <TextInput
                  style={[styles.input, errors.phone && styles.inputError]}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.textLight}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="phone-pad"
                />
                {errors.phone && <Text style={styles.errorMsg}>{errors.phone.message}</Text>}
              </View>
            )}
          />
        </Section>

        {/* ── 3. Location ──────────────────────────────────────────────── */}
        <Section title="Location">
          <Text style={styles.mapHint}>Tap on the map to drop a pin at your station</Text>
          <View style={styles.mapWrap}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              initialRegion={{ latitude: 28.6139, longitude: 77.209, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
              onPress={handleMapPress}
            >
              {pinCoords && (
                <Marker coordinate={pinCoords}>
                  <View style={styles.pin}>
                    <Text style={styles.pinIcon}>⚡</Text>
                  </View>
                </Marker>
              )}
            </MapView>
          </View>

          {pinAddress ? (
            <View style={styles.addressBox}>
              <Text style={styles.addressIcon}>📍</Text>
              <Text style={styles.addressText} numberOfLines={2}>{pinAddress}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={handleUseCurrentLocation}
            disabled={gettingLocation}
          >
            <Text style={styles.gpsBtnText}>
              {gettingLocation ? '📡 Getting location…' : '📍 Use My Current Location'}
            </Text>
          </TouchableOpacity>
        </Section>

        {/* ── 4. Charger types ─────────────────────────────────────────── */}
        <Section title="Charger Types *">
          <View style={styles.chargerGrid}>
            {CHARGER_OPTIONS.map((opt) => {
              const active = selectedChargers.has(opt.id);
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.chargerCard, active && styles.chargerCardActive]}
                  onPress={() => toggleCharger(opt.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chargerIcon}>{opt.icon}</Text>
                  <Text style={[styles.chargerLabel, active && styles.chargerLabelActive]}>{opt.label}</Text>
                  <Text style={styles.chargerSub}>{opt.sub}</Text>
                  {active && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* ── 5. Pricing ───────────────────────────────────────────────── */}
        <Section title="Pricing">
          <Controller
            control={control}
            name="pricePerKwh"
            rules={{ required: 'Price is required', pattern: { value: /^\d+(\.\d{1,2})?$/, message: 'Enter a valid price' } }}
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Price per kWh (₹) *</Text>
                <View style={styles.priceInputRow}>
                  <Text style={styles.pricePrefix}>₹</Text>
                  <TextInput
                    style={[styles.input, styles.priceInput, errors.pricePerKwh && styles.inputError]}
                    placeholder="12.00"
                    placeholderTextColor={colors.textLight}
                    value={value}
                    onChangeText={onChange}
                    keyboardType="decimal-pad"
                  />
                </View>
                {errors.pricePerKwh && <Text style={styles.errorMsg}>{errors.pricePerKwh.message}</Text>}
              </View>
            )}
          />

          {/* 2-wheeler different price toggle */}
          <Controller
            control={control}
            name="twoPriceEnabled"
            render={({ field: { onChange, value } }) => (
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Different price for 2-wheelers</Text>
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={value ? colors.primary : colors.textLight}
                />
              </View>
            )}
          />

          {twoPriceEnabled && (
            <Controller
              control={control}
              name="twoPricePerKwh"
              render={({ field: { onChange, value } }) => (
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>2-Wheeler Price per kWh (₹)</Text>
                  <View style={styles.priceInputRow}>
                    <Text style={styles.pricePrefix}>₹</Text>
                    <TextInput
                      style={[styles.input, styles.priceInput]}
                      placeholder="8.00"
                      placeholderTextColor={colors.textLight}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              )}
            />
          )}
        </Section>

        {/* ── 6. Working hours ─────────────────────────────────────────── */}
        <Section title="Working Hours">
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>🕐 Open 24 hours</Text>
            <Switch
              value={open24h}
              onValueChange={setOpen24h}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={open24h ? colors.primary : colors.textLight}
            />
          </View>

          {!open24h && (
            <View style={styles.timePickers}>
              {/* Start time */}
              <TouchableOpacity
                style={styles.timePill}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.timePillLabel}>Opens</Text>
                <Text style={styles.timePillValue}>{formatTime(startTime)}</Text>
              </TouchableOpacity>

              <Text style={styles.timeSep}>→</Text>

              {/* End time */}
              <TouchableOpacity
                style={styles.timePill}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.timePillLabel}>Closes</Text>
                <Text style={styles.timePillValue}>{formatTime(endTime)}</Text>
              </TouchableOpacity>
            </View>
          )}

          {showStartPicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              is24Hour={false}
              onChange={(_, date) => { setShowStartPicker(false); if (date) setStartTime(date); }}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endTime}
              mode="time"
              is24Hour={false}
              onChange={(_, date) => { setShowEndPicker(false); if (date) setEndTime(date); }}
            />
          )}
        </Section>

        {/* ── 7. Photos ────────────────────────────────────────────────── */}
        <Section title="Photos">
          <TouchableOpacity style={styles.photoUploadArea} onPress={handlePickPhotos} activeOpacity={0.8}>
            <Text style={styles.photoUploadIcon}>📷</Text>
            <Text style={styles.photoUploadText}>Add photos of your station</Text>
            <Text style={styles.photoUploadHint}>Tap to select up to 5 images</Text>
          </TouchableOpacity>

          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {photos.map((uri) => (
                <View key={uri} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoImg} />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(uri)}>
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </Section>

        {/* ── 8. Amenities ─────────────────────────────────────────────── */}
        <Section title="Amenities (optional)">
          <View style={styles.amenityGrid}>
            {AMENITY_OPTIONS.map((a) => {
              const active = amenities.has(a.id);
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.amenityChip, active && styles.amenityChipActive]}
                  onPress={() => toggleAmenity(a.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.amenityIcon}>{a.icon}</Text>
                  <Text style={[styles.amenityLabel, active && styles.amenityLabelActive]}>{a.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* ── 9. Submit ────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>
            {isSubmitting ? 'Submitting…' : '✅ Submit for Verification'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Our team verifies every station before it goes live on the app.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: 16 },

  // ── Header ──
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  backBtnText:    { fontSize: 20, color: colors.text, fontWeight: '700' },
  headerTitle:    { fontSize: 22, fontWeight: '900', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  // ── Section ──
  section: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: colors.textLight,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14,
  },

  // ── Form fields ──
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text,
  },
  inputError:  { borderColor: colors.error },
  multiline:   { height: 88, textAlignVertical: 'top', paddingTop: 12 },
  errorMsg:    { fontSize: 12, color: colors.error, marginTop: 4, fontWeight: '600' },

  // ── Map ──
  mapHint: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  mapWrap: { height: 180, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border, marginBottom: 10 },
  pin: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: '#fff' },
  pinIcon: { fontSize: 16 },
  addressBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10, marginBottom: 10, gap: 6 },
  addressIcon: { fontSize: 14, marginTop: 1 },
  addressText: { flex: 1, fontSize: 13, color: colors.primaryDark, fontWeight: '600', lineHeight: 18 },
  gpsBtn: {
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: 12,
    paddingVertical: 11, alignItems: 'center', backgroundColor: colors.primaryLight,
  },
  gpsBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },

  // ── Charger grid ──
  chargerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chargerCard: {
    width: '47%', backgroundColor: colors.surface, borderRadius: 14,
    padding: 14, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', position: 'relative',
  },
  chargerCardActive:  { borderColor: colors.primary, backgroundColor: '#F0FDF4' },
  chargerIcon:        { fontSize: 28, marginBottom: 6 },
  chargerLabel:       { fontSize: 13, fontWeight: '800', color: colors.text, textAlign: 'center' },
  chargerLabelActive: { color: colors.primary },
  chargerSub:         { fontSize: 11, color: colors.textLight, marginTop: 3, textAlign: 'center' },
  checkmark:          { position: 'absolute', top: 8, right: 10, fontSize: 14, color: colors.primary, fontWeight: '900' },

  // ── Pricing ──
  priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pricePrefix:   { fontSize: 18, fontWeight: '700', color: colors.textSecondary },
  priceInput:    { flex: 1 },
  toggleRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  toggleLabel:   { fontSize: 14, color: colors.text, fontWeight: '600', flex: 1 },

  // ── Time pickers ──
  timePickers:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  timePill: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  timePillLabel: { fontSize: 10, color: colors.textLight, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  timePillValue: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 4 },
  timeSep:       { fontSize: 20, color: colors.textLight },

  // ── Photos ──
  photoUploadArea: {
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 28, alignItems: 'center', backgroundColor: colors.surface,
  },
  photoUploadIcon: { fontSize: 36, marginBottom: 8 },
  photoUploadText: { fontSize: 15, fontWeight: '700', color: colors.text },
  photoUploadHint: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  photoScroll:     { marginTop: 12 },
  photoThumb:      { width: 80, height: 80, marginRight: 8, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  photoImg:        { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  // ── Amenities ──
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: colors.border,
  },
  amenityChipActive:  { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  amenityIcon:        { fontSize: 16 },
  amenityLabel:       { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  amenityLabelActive: { color: colors.primary },

  // ── Submit ──
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: 16, height: 58,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.55, shadowOpacity: 0 },
  submitBtnText:     { color: '#fff', fontSize: 16, fontWeight: '900' },
  footerNote:        { textAlign: 'center', fontSize: 12, color: colors.textLight, marginBottom: 8 },
});
