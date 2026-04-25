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
      successDark: '#059669',
      successLight: isDark ? '#064e3b' : '#d1fae5',
      warning: '#f59e0b',
      warningLight: isDark ? '#78350f' : '#fef3c7',
      accent: isDark ? '#818cf8' : '#4f46e5',
      // Gradient endpoints for rest timer banner
      gradientStart: isDark ? '#6366f1' : '#7c3aed',
      gradientEnd: isDark ? '#8b5cf6' : '#4f46e5',
      // Card variants
      cardActive: isDark ? '#1e293b' : '#ffffff',
      cardActiveBorder: isDark ? '#60a5fa' : '#2563eb',
      cardCompleted: isDark ? '#1a2e1a' : '#f0fdf4',
      cardCompletedBorder: isDark ? '#166534' : '#86efac',
      cardPending: isDark ? '#1f2937' : '#f9fafb',
      // Button
      buttonShadow: isDark ? '#000000' : '#1e293b',
      // Dot indicators
      dotFilled: isDark ? '#60a5fa' : '#2563eb',
      dotEmpty: isDark ? '#374151' : '#d1d5db',
    },
  };
}
