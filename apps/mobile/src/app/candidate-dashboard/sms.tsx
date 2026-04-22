import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, FontSize } from '@/constants/theme';

export default function SmsScreen() {
  const colors = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: Spacing.xl, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="paper-plane-outline" size={48} color={colors.textTertiary} />
      <Text style={{ color: colors.text, fontSize: FontSize.lg, fontWeight: '700', marginTop: 12 }}>
        SMS Campaigns
      </Text>
      <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
        Bulk SMS to your followers is available on the web dashboard.
      </Text>
    </View>
  );
}
