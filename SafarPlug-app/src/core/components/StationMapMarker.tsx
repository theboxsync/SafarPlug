import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { theme } from '../constants/theme';

interface StationMapMarkerProps {
  coordinate: { latitude: number; longitude: number };
  availableSlots: number;
  onPress?: () => void;
}

export const StationMapMarker: React.FC<StationMapMarkerProps> = ({
  coordinate,
  availableSlots,
  onPress,
}) => {
  return (
    <Marker coordinate={coordinate} onPress={onPress}>
      <View style={styles.container}>
        <View style={styles.circle}>
          <Text style={styles.bolt}>⚡</Text>
        </View>
        {availableSlots > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{availableSlots}</Text>
          </View>
        )}
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bolt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.secondary,
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
});

export default StationMapMarker;
