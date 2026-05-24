import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { colors } from "@/constants/colors";
import type { LiveExerciseGroup, LiveExerciseSample } from "@/src/types/health";

type LiveSensorChartsModalProps = {
  group: LiveExerciseGroup | null;
  onClose: () => void;
};

type SensorMetric = {
  key: keyof LiveExerciseSample;
  label: string;
  unit: string;
  color: string;
  formatValue: (value: number) => string;
};

const chartHeight = 150;

const sensorMetrics: SensorMetric[] = [
  {
    key: "heartRate",
    label: "Batimento cardiaco",
    unit: "bpm",
    color: "#D14E4E",
    formatValue: (value) => `${Math.round(value)} bpm`,
  },
  {
    key: "oxygenSaturation",
    label: "Oxigenacao do sangue",
    unit: "%",
    color: "#2F7EBA",
    formatValue: (value) => `${Math.round(value * 100)}%`,
  },
  {
    key: "accelerationX",
    label: "Acelerometro X",
    unit: "g",
    color: "#15685A",
    formatValue: (value) => value.toFixed(3),
  },
  {
    key: "accelerationY",
    label: "Acelerometro Y",
    unit: "g",
    color: "#8B6FB3",
    formatValue: (value) => value.toFixed(3),
  },
  {
    key: "accelerationZ",
    label: "Acelerometro Z",
    unit: "g",
    color: "#D9893D",
    formatValue: (value) => value.toFixed(3),
  },
  {
    key: "gyroscopeX",
    label: "Giroscopio X",
    unit: "rad/s",
    color: "#3C7C8C",
    formatValue: (value) => value.toFixed(3),
  },
  {
    key: "gyroscopeY",
    label: "Giroscopio Y",
    unit: "rad/s",
    color: "#9B5F4A",
    formatValue: (value) => value.toFixed(3),
  },
  {
    key: "gyroscopeZ",
    label: "Giroscopio Z",
    unit: "rad/s",
    color: "#4E6F3D",
    formatValue: (value) => value.toFixed(3),
  },
];

export function LiveSensorChartsModal({ group, onClose }: LiveSensorChartsModalProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(360, width - 56);

  return (
    <Modal animationType="slide" visible={Boolean(group)} presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 36 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text selectable style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
              {group?.exerciseName ?? "Dados da sessao"}
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
              {group
                ? `${group.setCount} ${group.setCount === 1 ? "serie" : "series"} · ${group.totalReps} reps · ${group.samples.length} amostras`
                : ""}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              minHeight: 40,
              paddingHorizontal: 14,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
            })}
          >
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700" }}>Fechar</Text>
          </Pressable>
        </View>

        {sensorMetrics.map((metric) => (
          <SensorLineChart key={metric.key} metric={metric} samples={group?.samples ?? []} chartWidth={chartWidth} />
        ))}
      </ScrollView>
    </Modal>
  );
}

function SensorLineChart({
  metric,
  samples,
  chartWidth,
}: {
  metric: SensorMetric;
  samples: LiveExerciseSample[];
  chartWidth: number;
}) {
  const points = samples
    .map((sample) => {
      const value = sample[metric.key];
      return typeof value === "number" ? { timestamp: sample.timestamp, value } : null;
    })
    .filter((point): point is { timestamp: string; value: number } => point !== null)
    .slice(-80);

  if (points.length < 2) {
    return (
      <View style={chartContainerStyle}>
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
          {metric.label}
        </Text>
        <View style={emptyChartStyle}>
          <Text selectable style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>
            Sem dados suficientes para este sensor.
          </Text>
        </View>
      </View>
    );
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(0.0001, maxValue - minValue);
  const coordinates = points.map((point, index) => ({
    x: (index / (points.length - 1)) * chartWidth,
    y: chartHeight - ((point.value - minValue) / range) * chartHeight,
    value: point.value,
  }));

  return (
    <View style={chartContainerStyle}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
          {metric.label}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
          {metric.unit}
        </Text>
      </View>

      <View style={{ width: chartWidth, height: chartHeight + 18, alignSelf: "center" }}>
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: chartHeight }}>
          {[0, 1, 2].map((line) => (
            <View
              key={line}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: (line / 2) * chartHeight,
                height: 1,
                backgroundColor: colors.border,
              }}
            />
          ))}

          {coordinates.slice(0, -1).map((point, index) => {
            const nextPoint = coordinates[index + 1];
            const deltaX = nextPoint.x - point.x;
            const deltaY = nextPoint.y - point.y;
            const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const angle = Math.atan2(deltaY, deltaX);

            return (
              <View
                key={`${metric.key}-segment-${index}`}
                style={{
                  position: "absolute",
                  left: point.x + deltaX / 2 - length / 2,
                  top: point.y + deltaY / 2,
                  width: length,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: metric.color,
                  transform: [{ rotateZ: `${angle}rad` }],
                }}
              />
            );
          })}

          {coordinates.map((point, index) => (
            <View
              key={`${metric.key}-point-${index}`}
              style={{
                position: "absolute",
                left: point.x - 2,
                top: point.y - 2,
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: metric.color,
              }}
            />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
          Min {metric.formatValue(minValue)}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
          Max {metric.formatValue(maxValue)}
        </Text>
      </View>
    </View>
  );
}

const chartContainerStyle = {
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: 8,
  borderWidth: 1,
  padding: 14,
  gap: 12,
} as const;

const emptyChartStyle = {
  minHeight: 132,
  alignItems: "center",
  justifyContent: "center",
  borderColor: colors.border,
  borderRadius: 8,
  borderWidth: 1,
  backgroundColor: colors.surfaceMuted,
  padding: 12,
} as const;
