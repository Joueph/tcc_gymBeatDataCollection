import { Modal, Pressable, Text, Vibration, View } from "react-native";

import { colors } from "@/constants/colors";

type SessionDrawerProps = {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
};

export function SessionDrawer({ visible, onClose, onLogout }: SessionDrawerProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.58)", alignItems: "flex-end" }}>
        <Pressable
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          onPress={onClose}
        />
        <View
          style={{
            width: 280,
            height: "100%",
            backgroundColor: colors.surface,
            borderLeftColor: colors.border,
            borderLeftWidth: 1,
            padding: 20,
            paddingTop: 64,
            gap: 18,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text selectable style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>
              GymBeat
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
              Configuracoes da sessao
            </Text>
          </View>

          <Pressable
            onPress={() => {
              Vibration.vibrate(12);
              onLogout();
            }}
            style={({ pressed }) => ({
              width: "100%",
              minHeight: 50,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              borderColor: colors.border,
              borderWidth: 1,
              backgroundColor: pressed ? colors.surfaceMuted : colors.background,
            })}
          >
            <Text style={{ color: colors.danger, fontSize: 15, fontWeight: "900" }}>Deslogar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
