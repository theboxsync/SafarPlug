import { StyleSheet } from 'react-native';

export const theme = {
  colors: {
    primary: '#1D9E75',      // Teal green
    primaryLight: '#E8F5F1', // Soft light green background
    secondary: '#378ADD',    // Blue
    background: '#FFFFFF',   // White
    surface: '#F5F5F5',      // Light gray surface
    error: '#E24B4A',        // Red
    text: '#1C1E21',
    textSecondary: '#606770',
    textLight: '#8D949E',
    border: '#E3E6EB',
    success: '#34C759',
    charging: '#007AFF',
    shadow: '#000000',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    round: 9999,
  },
  typography: {
    h1: {
      fontFamily: 'Nunito-SemiBold',
      fontSize: 24,
      color: '#1C1E21',
    },
    h2: {
      fontFamily: 'Nunito-SemiBold',
      fontSize: 20,
      color: '#1C1E21',
    },
    h3: {
      fontFamily: 'Nunito-SemiBold',
      fontSize: 16,
      color: '#1C1E21',
    },
    body: {
      fontFamily: 'Nunito-Regular',
      fontSize: 14,
      color: '#1C1E21',
      lineHeight: 20,
    },
    bodySecondary: {
      fontFamily: 'Nunito-Regular',
      fontSize: 14,
      color: '#606770',
    },
    caption: {
      fontFamily: 'Nunito-Regular',
      fontSize: 12,
      color: '#8D949E',
    },
    button: {
      fontFamily: 'Nunito-SemiBold',
      fontSize: 16,
      color: '#FFFFFF',
    },
  },
  shadows: StyleSheet.create({
    light: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    heavy: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
  }),
  presets: {
    // Custom TextInput style preset (rounded borders, green focus)
    textInput: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#E3E6EB',
      borderRadius: 12,
      height: 52,
      paddingHorizontal: 16,
      color: '#1C1E21',
      fontFamily: 'Nunito-Regular',
      fontSize: 15,
    },
    // Custom ElevatedButton-style component (green, rounded, 48px height)
    elevatedButton: {
      backgroundColor: '#1D9E75',
      borderRadius: 12,
      height: 48,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      shadowColor: '#1D9E75',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 3,
    },
  },
};
export type Theme = typeof theme;
export default theme;
