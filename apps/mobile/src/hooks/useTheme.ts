import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { useThemeStore } from '@/stores/theme-store';

export function useTheme() {
  const systemScheme = useColorScheme();
  const mode = useThemeStore((s) => s.mode);

  if (mode === 'system') {
    return Colors[systemScheme === 'dark' ? 'dark' : 'light'];
  }
  return Colors[mode];
}

export function useIsDarkMode(): boolean {
  const systemScheme = useColorScheme();
  const mode = useThemeStore((s) => s.mode);

  if (mode === 'system') {
    return systemScheme === 'dark';
  }
  return mode === 'dark';
}
