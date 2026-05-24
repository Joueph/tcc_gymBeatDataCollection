import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { WorkoutCard } from "@/components/workout-card";
import { colors } from "@/constants/colors";
import { database } from "@/src/storage/database";
import type { Workout } from "@/src/types/health";

export default function WorkoutsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      setIsLoading(true);
      database
        .getWorkouts()
        .then((nextWorkouts) => {
          if (isMounted) {
            setWorkouts(nextWorkouts);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }, []),
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}
    >
      <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
        Historico importado do Apple Saude nos ultimos ciclos de sincronizacao.
      </Text>

      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}

      {!isLoading && workouts.length === 0 ? (
        <View
          style={{
            minHeight: 180,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            padding: 20,
          }}
        >
          <Text selectable style={{ color: colors.muted, textAlign: "center", lineHeight: 22 }}>
            Sincronize na tela inicial para preencher sua lista de treinos.
          </Text>
        </View>
      ) : null}

      {workouts.map((workout) => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
    </ScrollView>
  );
}
