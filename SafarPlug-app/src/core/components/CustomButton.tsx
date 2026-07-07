import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../constants/theme';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const getButtonStyles = () => {
    const stylesList: ViewStyle[] = [styles.button];

    switch (variant) {
      case 'primary':
        stylesList.push(styles.primary);
        break;
      case 'secondary':
        stylesList.push(styles.secondary);
        break;
      case 'outline':
        stylesList.push(styles.outline);
        break;
      case 'danger':
        stylesList.push(styles.danger);
        break;
    }

    if (disabled || loading) {
      stylesList.push(styles.disabled);
    }

    if (style) {
      stylesList.push(style);
    }

    return stylesList;
  };

  const getTextStyle = () => {
    const textStylesList: TextStyle[] = [styles.text];

    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        textStylesList.push(styles.textLightColor);
        break;
      case 'outline':
        textStylesList.push(styles.textDarkColor);
        break;
    }

    if (textStyle) {
      textStylesList.push(textStyle);
    }

    return textStylesList;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled || loading}
      style={getButtonStyles()}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? theme.colors.primary : '#FFFFFF'}
          size="small"
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    ...theme.presets.elevatedButton,
    paddingHorizontal: theme.spacing.md,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
    shadowColor: theme.colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  danger: {
    backgroundColor: theme.colors.error,
    shadowColor: theme.colors.error,
  },
  disabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    ...theme.typography.button,
  },
  textLightColor: {
    color: '#FFFFFF',
  },
  textDarkColor: {
    color: theme.colors.primary,
  },
});
export default CustomButton;
