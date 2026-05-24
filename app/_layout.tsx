import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { colors } from "@/constants/colors";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Wearable Workout" }} />
        <Stack.Screen name="live/[id]" options={{ title: "Treino ao vivo" }} />
        <Stack.Screen name="workouts" options={{ title: "Treinos" }} />
        <Stack.Screen name="workout/[id]" options={{ title: "Detalhe do treino" }} />
      </Stack>
    </>
  );
}
