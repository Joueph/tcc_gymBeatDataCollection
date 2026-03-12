// GymBeat — React Native
// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#1C1C1E',
        tabBarInactiveTintColor: '#C7C7CC',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F2F2F7',
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          height: 88,
          paddingBottom: 28,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 0.2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Treino',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="figure.strengthtraining.traditional" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="session"
        options={{
          title: 'Sessão',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="waveform.path.ecg" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="clock" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
