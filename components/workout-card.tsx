import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import type { Workout } from "@/src/types/health";
import { formatDate, formatDistance, formatDuration } from "@/src/utils/format";

type WorkoutCardProps = {
  workout: Workout;
};

export function WorkoutCard({ workout }: WorkoutCardProps) {
  return (
    <Link href={`/workout/${workout.id}`} asChild>
      <Pressable
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 8,
          padding: 16,
          gap: 12,
        })}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
              {workout.activityType}
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
              {formatDate(workout.startDate)} · {workout.sourceName}
            </Text>
          </View>
          <Text
            selectable
            style={{ color: colors.primary, fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] }}
          >
            {Math.round(workout.activeEnergyBurned)} kcal
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
          <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
            {formatDuration(workout.durationMinutes)}
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
            {formatDistance(workout.distance)}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
