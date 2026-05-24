import { Text, View } from "react-native";

import { colors } from "@/constants/colors";
import type { LiveExerciseSample } from "@/src/types/health";

type LiveSessionChartProps = {
  samples: LiveExerciseSample[];
};

const chartHeight = 116;

export function LiveSessionChart({ samples }: LiveSessionChartProps) {
  const visibleSamples = samples.filter((sample) => sample.heartRate !== null).slice(-24);
  const values = visibleSamples.map((sample) => sample.heartRate ?? 0);
  const minValue = Math.min(...values, 60);
  const maxValue = Math.max(...values, 120);
  const range = Math.max(1, maxValue - minValue);

  if (visibleSamples.length === 0) {
    return (
      <View
        style={{
          minHeight: 132,
          alignItems: "center",
          justifyContent: "center",
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 8,
          backgroundColor: colors.surfaceMuted,
          padding: 12,
        }}
      >
        <Text selectable style={{ color: colors.muted, textAlign: "center", fontSize: 13 }}>
          Sem amostras suficientes para exibir o grafico.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 8,
        backgroundColor: colors.surfaceMuted,
        padding: 12,
        gap: 10,
      }}
    >
      <View style={{ height: chartHeight, flexDirection: "row", alignItems: "flex-end", gap: 5 }}>
        {visibleSamples.map((sample, index) => {
          const value = sample.heartRate ?? minValue;
          const height = Math.max(8, ((value - minValue) / range) * chartHeight);

          return (
            <View
              key={`${sample.sessionId}-${sample.timestamp}-${index}`}
              style={{ flex: 1, height: chartHeight, justifyContent: "flex-end" }}
            >
              <View
                style={{
                  height,
                  borderRadius: 4,
                  backgroundColor: colors.chart,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
          FC min {Math.round(minValue)}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
          FC max {Math.round(maxValue)}
        </Text>
      </View>
    </View>
  );
}
