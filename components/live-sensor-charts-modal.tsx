import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { colors } from "@/constants/colors";
import type { LiveExerciseGroup, LiveExerciseSample } from "@/src/types/health";

type LiveSensorChartsModalProps = {
  group: LiveExerciseGroup | null;
  onClose: () => void;
};

type SensorGroup = "accelerometer" | "gyroscope";

type SensorMetric = {
  key: keyof LiveExerciseSample;
  label: string;
  unit: string;
  color: string;
  formatValue: (value: number) => string;
  group?: SensorGroup;
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
    group: "accelerometer",
    formatValue: (value) => value.toFixed(3),
  },
  {
    key: "accelerationY",
    label: "Acelerometro Y",
    unit: "g",
    color: "#8B6FB3",
    group: "accelerometer",
    formatValue: (value) => value.toFixed(3),
  },
  {
    key: "accelerationZ",
    label: "Acelerometro Z",
    unit: "g",
    color: "#D9893D",
    group: "accelerometer",
    formatValue: (value) => value.toFixed(3),
  },
  {
    key: "gyroscopeX",
    label: "Giroscopio X",
    unit: "rad/s",
    color: "#3C7C8C",
    group: "gyroscope",
    formatValue: (value) => value.toFixed(3),
  },
  {
    key: "gyroscopeY",
    label: "Giroscopio Y",
    unit: "rad/s",
    color: "#9B5F4A",
    group: "gyroscope",
    formatValue: (value) => value.toFixed(3),
  },
  {
    key: "gyroscopeZ",
    label: "Giroscopio Z",
    unit: "rad/s",
    color: "#4E6F3D",
    group: "gyroscope",
    formatValue: (value) => value.toFixed(3),
  },
];

export function LiveSensorChartsModal({ group, onClose }: LiveSensorChartsModalProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(360, width - 56);
  const seriesTabs = useMemo(() => getSeriesTabs(group?.samples ?? []), [group?.samples]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSeriesId(seriesTabs[0]?.sessionId ?? null);
  }, [group?.day, group?.exerciseId, seriesTabs]);

  const selectedSeries = seriesTabs.find((series) => series.sessionId === selectedSeriesId) ?? seriesTabs[0];
  const selectedSamples = selectedSeries?.samples ?? [];

  const groupDomains = useMemo(() => {
    const domains: Partial<Record<SensorGroup, { min: number; max: number }>> = {};
    const groups: SensorGroup[] = ["accelerometer", "gyroscope"];

    for (const groupName of groups) {
      const metricsInGroup = sensorMetrics.filter((m) => m.group === groupName);
      const allValues: number[] = [];

      for (const m of metricsInGroup) {
        const points = getMetricPoints(selectedSamples, m.key);
        if (points.length >= 2) {
          for (const p of points) {
            allValues.push(p.value);
          }
        }
      }

      if (allValues.length > 0) {
        domains[groupName] = {
          min: Math.min(...allValues),
          max: Math.max(...allValues),
        };
      }
    }

    return domains;
  }, [selectedSamples]);

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

        {seriesTabs.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {seriesTabs.map((series, index) => {
              const selected = series.sessionId === selectedSeries?.sessionId;

              return (
                <Pressable
                  key={series.sessionId}
                  onPress={() => setSelectedSeriesId(series.sessionId)}
                  style={({ pressed }) => ({
                    minHeight: 42,
                    alignItems: "center",
                    justifyContent: "center",
                    borderColor: selected ? colors.primary : colors.border,
                    borderRadius: 8,
                    borderWidth: 1,
                    backgroundColor: selected ? colors.primary : pressed ? colors.surfaceMuted : colors.surface,
                    paddingHorizontal: 16,
                  })}
                >
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: "800" }}>
                    Serie {index + 1}
                  </Text>
                  <Text style={{ color: selected ? "#DCEBFF" : colors.muted, fontSize: 11, fontWeight: "700" }}>
                    {series.samples.length} amostras
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {sensorMetrics.map((metric) => (
          <SensorLineChart
            key={metric.key}
            metric={metric}
            samples={selectedSamples}
            chartWidth={chartWidth}
            scaleDomain={metric.group ? groupDomains[metric.group] : undefined}
          />
        ))}
      </ScrollView>
    </Modal>
  );
}

function getMetricPoints(samples: LiveExerciseSample[], key: keyof LiveExerciseSample) {
  return samples
    .map((sample) => {
      const value = sample[key];
      return typeof value === "number" ? { timestamp: sample.timestamp, value } : null;
    })
    .filter((point): point is { timestamp: string; value: number } => point !== null)
    .slice(-80);
}

function getSeriesTabs(samples: LiveExerciseSample[]) {
  const seriesBySession = new Map<string, LiveExerciseSample[]>();

  for (const sample of samples) {
    const sessionId = sample.sessionId || "serie-unica";
    const currentSamples = seriesBySession.get(sessionId) ?? [];
    currentSamples.push(sample);
    seriesBySession.set(sessionId, currentSamples);
  }

  return Array.from(seriesBySession.entries())
    .map(([sessionId, seriesSamples]) => ({
      sessionId,
      samples: seriesSamples.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      startedAt: seriesSamples[0]?.timestamp ?? "",
    }))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

function SensorLineChart({
  metric,
  samples,
  chartWidth,
  scaleDomain,
}: {
  metric: SensorMetric;
  samples: LiveExerciseSample[];
  chartWidth: number;
  scaleDomain?: { min: number; max: number };
}) {
  const points = useMemo(() => getMetricPoints(samples, metric.key), [samples, metric.key]);

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
  const minValue = scaleDomain ? scaleDomain.min : Math.min(...values);
  const maxValue = scaleDomain ? scaleDomain.max : Math.max(...values);
  const range = Math.max(0.0001, maxValue - minValue);
  const effectiveMin = maxValue === minValue ? minValue - 1 : minValue;
  const effectiveRange = maxValue === minValue ? 2 : range;

  const coordinates = points.map((point, index) => ({
    x: (index / (points.length - 1)) * chartWidth,
    y: chartHeight - ((point.value - effectiveMin) / effectiveRange) * chartHeight,
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
