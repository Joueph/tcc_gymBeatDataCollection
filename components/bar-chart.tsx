import { Text, View } from "react-native";

import { colors } from "@/constants/colors";
import type { MetricSample } from "@/src/types/health";
import { formatDay } from "@/src/utils/format";

type BarChartProps = {
  samples: MetricSample[];
  emptyLabel: string;
};

export function BarChart({ samples, emptyLabel }: BarChartProps) {
  const visibleSamples = samples.slice(-14);
  const maxValue = Math.max(1, ...visibleSamples.map((sample) => sample.value));

  if (visibleSamples.length === 0) {
    return (
      <View
        style={{
          minHeight: 168,
          alignItems: "center",
          justifyContent: "center",
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 8,
          backgroundColor: colors.surface,
        }}
      >
        <Text selectable style={{ color: colors.muted, textAlign: "center" }}>
          {emptyLabel}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        minHeight: 188,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 8,
        backgroundColor: colors.surface,
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ height: 132, flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        {visibleSamples.map((sample) => {
          const height = Math.max(6, Math.round((sample.value / maxValue) * 120));

          return (
            <View key={`${sample.type}-${sample.startDate}`} style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <View
                style={{
                  width: "100%",
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
          {formatDay(visibleSamples[0].startDate)}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
          {formatDay(visibleSamples[visibleSamples.length - 1].startDate)}
        </Text>
      </View>
    </View>
  );
}
