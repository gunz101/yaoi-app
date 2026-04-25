import { View, Text, StyleSheet, useColorScheme } from 'react-native';

/**
 * Aba Perfil — peso corporal, medidas e configurações.
 */
export default function PerfilScreen() {
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Text style={[styles.title, isDark && styles.textDark]}>Perfil</Text>
      <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
        Registre seu peso, medidas e configurações
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
