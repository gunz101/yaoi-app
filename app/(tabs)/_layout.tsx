import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSessaoStore } from '@/stores/sessaoStore';
import { formatarTempo } from '@/hooks/useTimer';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const sessaoAtivaId = useSessaoStore((s) => s.sessaoAtivaId);
  const tempoDecorrido = useSessaoStore((s) => s.tempoDecorrido);
  const descansoAtivo = useSessaoStore((s) => s.descansoAtivo);
  const descansoRestante = useSessaoStore((s) => s.descansoRestante);

  const activeTint = isDark ? '#60a5fa' : '#2563eb';
  const inactiveTint = isDark ? '#6b7280' : '#9ca3af';
  const tabBarBg = isDark ? '#111827' : '#ffffff';
  const headerBg = isDark ? '#1f2937' : '#ffffff';
  const headerText = isDark ? '#f9fafb' : '#111827';

  return (
    <View style={{ flex: 1 }}>
      {/* Persistent session banner */}
      {sessaoAtivaId && (
        <Pressable
          onPress={() => router.push(`/sessao/${sessaoAtivaId}`)}
          style={[styles.sessionBanner, { backgroundColor: isDark ? '#065f46' : '#10b981' }]}
        >
          <Ionicons name="pulse" size={16} color="#fff" />
          <Text style={styles.sessionBannerText}>
            Sessão ativa — {formatarTempo(tempoDecorrido)}
          </Text>
          {descansoAtivo && descansoRestante !== null && (
            <Text style={styles.sessionDescanso}>
              ⏱️ {descansoRestante}s
            </Text>
          )}
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </Pressable>
      )}

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: activeTint,
          tabBarInactiveTintColor: inactiveTint,
          tabBarStyle: { backgroundColor: tabBarBg },
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: headerText,
        }}
      >
        <Tabs.Screen
          name="treino"
          options={{
            title: 'Treino',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="barbell-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="fichas"
          options={{
            title: 'Fichas',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="clipboard-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="historico"
          options={{
            title: 'Histórico',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progresso"
          options={{
            title: 'Progresso',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trending-up-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  sessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 50,
    gap: 8,
  },
  sessionBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionDescanso: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.9,
  },
});
