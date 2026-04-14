import { useColorScheme } from 'react-native';
import { Colors, type ThemeColors } from '@/constants/theme';

export function useTheme() {
  const colorScheme = useColorScheme();
  return Colors[colorScheme === 'dark' ? 'dark' : 'light'];
}

export function useIsDarkMode(): boolean {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark';
}
