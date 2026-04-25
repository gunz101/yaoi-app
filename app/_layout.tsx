import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { useDatabase } from '@/hooks/useDatabase';

/**
 * Root layout — ponto de entrada do app.
 * Inicializa o banco de dados e configura o Stack navigator raiz.
 * Bloqueia renderização até o DB estar pronto.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isReady, error } = useDatabase();

  // Tela de carregamento enquanto o banco inicializa
  if (!isReady) {
    return (
      <View style={[styles.loading, isDark && styles.loadingDark]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {error ? (
          <>
            <Text style={[styles.errorText, isDark && styles.textDark]}>
              Erro ao inicializar banco de dados
            </Text>
            <Text style={[styles.errorDetail, isDark && styles.subtextDark]}>
              {error.message}
            </Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={isDark ? '#60a5fa' : '#2563eb'} />
            <Text style={[styles.loadingText, isDark && styles.textDark]}>
              Preparando Yaoi...
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 16,
  },
  loadingDark: { backgroundColor: '#111827' },
  loadingText: { fontSize: 16, color: '#6b7280', marginTop: 8 },
  textDark: { color: '#f9fafb' },
  subtextDark: { color: '#9ca3af' },
  errorText: { fontSize: 18, fontWeight: 'bold', color: '#ef4444' },
  errorDetail: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 32 },
});
