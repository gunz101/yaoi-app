import { useColorScheme } from 'react-native';

export function useTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    colors: {
      background: isDark ? '#111827' : '#f9fafb',
      card: isDark ? '#1f2937' : '#ffffff',
      text: isDark ? '#f9fafb' : '#111827',
      textSecondary: isDark ? '#9ca3af' : '#6b7280',
      border: isDark ? '#374151' : '#e5e7eb',
      primary: isDark ? '#60a5fa' : '#2563eb',
      primaryLight: isDark ? '#1e3a5f' : '#dbeafe',
      danger: '#ef4444',
      success: '#10b981',
      warning: '#f59e0b',
      accent: isDark ? '#818cf8' : '#4f46e5',
    },
  };
}
