import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "@/constants/colors";
import { createFirebaseAccount, signInFirebaseAccount } from "@/src/firebase/sync";
import type { UserProfile, UserSex } from "@/src/types/health";

type LoginStep = 1 | 2 | 3 | 4 | 5;

const firstStep: LoginStep = 1;
const lastStep: LoginStep = 5;

const createId = () => `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [step, setStep] = useState<LoginStep>(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<UserSex | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignin = mode === "signin";
  const canGoBack = isSignin || step > firstStep;

  const stepContent = useMemo(() => {
    if (isSignin) {
      return {
        title: "Entre na sua conta",
        description: "Use o email e senha cadastrados neste aparelho para voltar ao GymBeat.",
      };
    }

    const normalizedName = name.trim();

    switch (step) {
      case 1:
        return {
          title: "Ola. Qual o seu nome?",
          description: "",
        };
      case 2:
        return {
          title: `Ola ${normalizedName || "atleta"}, este e um app voltado para coleta de dados`,
          description:
            "Este app se conecta com seu Apple Watch para coletar dados de movimento e frequencia cardiaca e sera utilizado como dado de treinamento para deteccao automatica de repeticoes em exercicios selecionados no app GymBeat. Ao participar, voce concorda que seus dados serao utilizados com este proposito.",
        };
      case 3:
        return {
          title: "Qual sua idade?",
          description:
            "Precisamos da sua idade para poder segmentar os dados coletados e poder trazer uma experiencia mais precisa para o usuario final.",
        };
      case 4:
        return {
          title: "Qual seu genero?",
          description:
            "Precisamos do seu genero para poder segmentar os dados coletados e poder trazer uma experiencia mais precisa para o usuario final.",
        };
      case 5:
        return {
          title: "Vamos criar sua conta",
          description: "",
        };
    }
  }, [isSignin, name, step]);

  const canGoNext = () => {
    if (isSignin) {
      return email.trim().length >= 5 && password.length >= 6;
    }

    if (step === 1) {
      return name.trim().length >= 2;
    }

    if (step === 3) {
      const parsedAge = Number(age);
      return Number.isInteger(parsedAge) && parsedAge >= 14 && parsedAge <= 80;
    }

    if (step === 4) {
      return sex !== null;
    }

    if (step === 5) {
      return email.trim().length >= 5 && password.length >= 6;
    }

    return true;
  };

  const validationMessage = () => {
    if (isSignin) {
      return "Informe email e senha para entrar.";
    }

    if (step === 1) {
      return "Informe seu nome para continuar.";
    }

    if (step === 3) {
      return "Informe uma idade entre 14 e 80 anos.";
    }

    if (step === 4) {
      return "Selecione uma opcao para continuar.";
    }

    if (step === 5) {
      return "Informe email e uma senha com pelo menos 6 caracteres.";
    }

    return null;
  };

  const triggerHaptic = () => {
    // Keep this intentionally silent until we add expo-haptics for a true subtle tap.
  };

  const goBack = () => {
    triggerHaptic();
    Keyboard.dismiss();
    setError(null);
    if (isSignin) {
      setMode("signup");
      setStep(1);
      return;
    }

    setStep((currentStep) => Math.max(firstStep, currentStep - 1) as LoginStep);
  };

  const goNext = async () => {
    triggerHaptic();
    setError(null);

    if (!canGoNext()) {
      setError(validationMessage());
      return;
    }

    if (isSignin) {
      setIsSaving(true);
      try {
        const result = await signInFirebaseAccount(email.trim().toLowerCase(), password);
        if (!result) {
          setError("Email ou senha invalidos.");
          return;
        }
        router.replace("/");
      } catch (signinError) {
        setError(signinError instanceof Error ? signinError.message : "Nao foi possivel entrar.");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (step < lastStep) {
      setStep((currentStep) => (currentStep + 1) as LoginStep);
      return;
    }

    setIsSaving(true);

    try {
      const profile: UserProfile = {
        id: createId(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        age: Number(age),
        sex: sex ?? "homem",
        trainingExperience: "iniciante",
        createdAt: new Date().toISOString(),
      };

      await createFirebaseAccount(profile, password);
      router.replace("/");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nao foi possivel criar sua conta.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
      >
        <View style={{ flex: 1, gap: 32 }}>
          {step === 1 && !isSignin ? (
            <View style={{ alignItems: "flex-end", paddingTop: 4 }}>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setError(null);
                  setMode("signin");
                }}
                hitSlop={10}
              >
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "900" }}>Ja tenho uma conta</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={{ gap: 12, paddingTop: 8 }}>
            <Text selectable style={{ color: colors.text, fontSize: 34, fontWeight: "900", lineHeight: 40 }}>
              {stepContent.title}
            </Text>
            {stepContent.description ? (
              <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 23, fontWeight: "600" }}>
                {stepContent.description}
              </Text>
            ) : null}
          </View>

          <View style={{ flex: 1, justifyContent: "center", gap: 14, width: "100%" }}>
            {step === 1 && !isSignin ? (
              <OnboardingInput
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                autoFocus
                autoCapitalize="words"
              />
            ) : null}

            {step === 3 && !isSignin ? (
              <OnboardingInput
                value={age}
                onChangeText={setAge}
                placeholder="Idade"
                keyboardType="number-pad"
                maxLength={2}
                autoFocus
              />
            ) : null}

            {step === 4 && !isSignin ? (
              <View style={{ width: "100%", gap: 12 }}>
                <ChoiceButton label="Homem" selected={sex === "homem"} onPress={() => setSex("homem")} />
                <ChoiceButton label="Mulher" selected={sex === "mulher"} onPress={() => setSex("mulher")} />
              </View>
            ) : null}

            {(step === 5 || isSignin) ? (
              <View style={{ width: "100%", gap: 12 }}>
                <OnboardingInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <OnboardingInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Senha"
                  secureTextEntry
                  autoComplete="password"
                />
              </View>
            ) : null}
          </View>

          {error ? (
            <Text selectable style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}>
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          padding: 20,
          paddingBottom: 28,
        }}
      >
        <Pressable
          disabled={!canGoBack || isSaving}
          onPress={goBack}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 52,
            height: 52,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 26,
            backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
            opacity: !canGoBack || isSaving ? 0.35 : 1,
          })}
        >
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: "700" }}>‹</Text>
        </Pressable>

        <Pressable
          disabled={isSaving}
          onPress={goNext}
          style={({ pressed }) => ({
            minHeight: 52,
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 26,
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
            opacity: isSaving ? 0.72 : 1,
          })}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "900" }}>
              {isSignin ? "Entrar" : step === lastStep ? "Criar conta" : "Proximo"}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

type OnboardingInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "number-pad";
  maxLength?: number;
  autoFocus?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: "email" | "password";
};

function OnboardingInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  autoFocus,
  secureTextEntry,
  autoCapitalize,
  autoComplete,
}: OnboardingInputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      keyboardType={keyboardType}
      maxLength={maxLength}
      autoFocus={autoFocus}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      autoComplete={autoComplete}
      style={{
        width: "100%",
        minHeight: 58,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        backgroundColor: colors.surface,
        color: colors.text,
        fontSize: 18,
        fontWeight: "700",
        paddingHorizontal: 16,
      }}
    />
  );
}

function ChoiceButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        onPress();
      }}
      style={({ pressed }) => ({
        width: "100%",
        minHeight: 58,
        alignItems: "center",
        justifyContent: "center",
        borderColor: selected ? colors.primary : colors.border,
        borderRadius: 8,
        borderWidth: 1,
        backgroundColor: selected ? colors.primary : pressed ? colors.surfaceMuted : colors.surface,
      })}
    >
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}
