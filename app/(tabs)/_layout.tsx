import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

/**
 * Tab navigator com 5 abas: Treino, Fichas, Histórico, Progresso, Perfil.
 * Ícones via Ionicons (@expo/vector-icons).
 */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const activeTint = isDark ? '#60a5fa' : '#2563eb';
  const inactiveTint = isDark ? '#6b7280' : '#9ca3af';
  const tabBarBg = isDark ? '#111827' : '#ffffff';
  const headerBg = isDark ? '#1f2937' : '#ffffff';
  const headerText = isDark ? '#f9fafb' : '#111827';

  return (
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
  );
}
