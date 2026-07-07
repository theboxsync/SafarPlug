import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MockComponent = ({ children, style, ...props }: any) => {
  return <View style={style} {...props}>{children}</View>;
};

export const Marker = MockComponent;
export const Polyline = MockComponent;
export const Callout = MockComponent;
export const Circle = MockComponent;
export const PROVIDER_GOOGLE = 'google';

const MapView = ({ children, style, ...props }: any) => {
  return (
    <View style={[styles.mapContainer, style]} {...props}>
      <Text style={styles.mapIcon}>🗺️</Text>
      <Text style={styles.mapText}>Map View Placeholder</Text>
      <Text style={styles.mapSubText}>(Native maps are only supported on iOS and Android)</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    padding: 16,
  },
  mapIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  mapText: {
    color: '#374151',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  mapSubText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default MapView;
