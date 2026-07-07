import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Station } from '../../../models/stationModel';
import { theme } from '../../../core/constants/theme';
import { calculateDistance, formatDistance } from '../../../core/utils/distanceUtils';
import { Coordinates } from '../../../core/utils/locationUtils';

interface NearbyStationCardProps {
  station: Station;
  userLocation: Coordinates | null;
  onPress: () => void;
}

export const NearbyStationCard: React.FC<NearbyStationCardProps> = ({
  station,
  userLocation,
  onPress,
}) => {
  const distance = userLocation
    ? calculateDistance(userLocation, {
        latitude: station.latitude,
        longitude: station.longitude,
      })
    : null;

  const totalSlots = station.totalSlotsAvailable;
  const isTwoWheelerFriendly = station.chargerTypes.some((type) => type.includes('2w'));

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.card, theme.shadows.light]}
    >
      <Image
        source={
          station.photoUrls && station.photoUrls.length > 0
            ? { uri: station.photoUrls[0] }
            : { uri: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=500' } // Fallback image
        }
        style={styles.image}
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {station.name}
          </Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>★ {station.rating.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={styles.address} numberOfLines={1}>
          {station.address}
        </Text>

        <View style={styles.footer}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: totalSlots > 0 ? theme.colors.success : theme.colors.error },
              ]}
            />
            <Text style={styles.statusText}>
              {totalSlots > 0
                ? `${totalSlots} Slots Available`
                : 'All Occupied / Offline'}
            </Text>
          </View>

          {distance !== null && (
            <Text style={styles.distanceText}>{formatDistance(distance)} away</Text>
          )}
        </View>

        {isTwoWheelerFriendly && (
          <View style={styles.bikeFriendlyTag}>
            <Text style={styles.bikeFriendlyText}>🛵 2-Wheeler Friendly</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  content: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    ...theme.typography.h3,
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  ratingBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  address: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  distanceText: {
    fontSize: 12,
    color: theme.colors.textLight,
    fontWeight: '500',
  },
  bikeFriendlyTag: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: theme.spacing.xs,
  },
  bikeFriendlyText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
