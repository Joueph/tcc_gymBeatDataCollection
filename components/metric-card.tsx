import { Text, View } from "react-native";

import { colors } from "@/constants/colors";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 148,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        gap: 8,
      }}
    >
      <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
        {label}
      </Text>
      <Text
        selectable
        style={{ color: colors.text, fontSize: 24, fontWeight: "700", fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
      {detail ? (
        <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}
