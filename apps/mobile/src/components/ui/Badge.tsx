import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'default', size = 'sm' }: BadgeProps) {
  const colors = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'success': return { bg: colors.successLight, text: colors.success };
      case 'warning': return { bg: colors.warningLight, text: colors.warning };
      case 'error': return { bg: colors.errorLight, text: colors.error };
      case 'info': return { bg: colors.infoLight, text: colors.info };
      default: return { bg: colors.primaryFaded, text: colors.primary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingHorizontal: size === 'sm' ? Spacing.sm : Spacing.md,
          paddingVertical: size === 'sm' ? 2 : Spacing.xs,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: text,
            fontSize: size === 'sm' ? FontSize.xs : FontSize.sm,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600',
  },
});
