import { View, Text, StyleSheet, useColorScheme } from 'react-native';

/**
 * Aba Progresso — gráficos de evolução de carga e volume.
 */
export default function ProgressoScreen() {
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Text style={[styles.title, isDark && styles.textDark]}>Progresso</Text>
      <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
        Acompanhe sua evolução de cargas e volume
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  containerDark: { backgroundColor: '#111827' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  textDark: { color: '#f9fafb' },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  subtitleDark: { color: '#9ca3af' },
});
