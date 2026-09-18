import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { PublicUser } from "../../../core/jellyfin/authRepository";
import { getUserAvatarUrl } from "../../../core/repositories/imageUrlBuilder";
import { colors, spacing, borderRadius } from "../../../design-system/tokens";
import { FinoraButton } from "../../../design-system/components/FinoraButton";
import { hapticService } from "../../../core/feedback/hapticService";
import { useTranslation } from "../../../i18n";

interface ProfilePasswordModalProps {
  visible: boolean;
  user: PublicUser | null;
  serverUrl: string;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
}

const AVATAR_PALETTE = [
  "#E50914",
  "#1E3A8A",
  "#334155",
  "#4C1D95",
  "#1E293B",
  "#831843",
  "#0F766E"
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

export function ProfilePasswordModal({
  visible,
  user,
  serverUrl,
  onClose,
  onSubmit,
  isLoading = false,
  errorMessage = null
}: ProfilePasswordModalProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (!user) return null;

  const avatarUrl = user.primaryImageTag
    ? getUserAvatarUrl(serverUrl, user.id, user.primaryImageTag, 200)
    : "";
  const avatarBgColor = getAvatarColor(user.name);

  const handleSubmit = async () => {
    hapticService.impactMedium();
    await onSubmit(password);
  };

  const handleClose = () => {
    setPassword("");
    setShowPassword(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardContainer}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <View style={styles.avatarWrapper}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: avatarBgColor }]}>
                    <Text style={styles.avatarInitial}>
                      {(user.name[0] || "?").toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.subtitle}>
                {t("auth.enterPasswordFor", { name: user.name })}
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder={t("auth.enterPasswordPlaceholder")}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                accessibilityLabel={t("auth.enterPasswordPlaceholder")}
              />
              <Pressable
                style={styles.visibilityToggle}
                onPress={() => setShowPassword((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#FF3B30" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.actionsRow}>
              <FinoraButton
                label={t("auth.cancel")}
                variant="secondary"
                size="md"
                onPress={handleClose}
                disabled={isLoading}
                style={styles.actionButton}
              />
              <FinoraButton
                label={t("auth.loginButton")}
                variant="primary"
                size="md"
                loading={isLoading}
                disabled={isLoading}
                onPress={handleSubmit}
                style={styles.actionButton}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  keyboardContainer: {
    width: "100%",
    maxWidth: 360
  },
  modalCard: {
    backgroundColor: "#141418",
    borderRadius: 14,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center"
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg
  },
  avatarWrapper: {
    width: 88,
    height: 88,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: spacing.sm
  },
  avatarImage: {
    width: "100%",
    height: "100%"
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "700"
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center"
  },
  inputContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: spacing.sm,
    height: 48,
    marginBottom: spacing.md
  },
  inputIcon: {
    marginRight: spacing.xs
  },
  textInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 0
  },
  visibilityToggle: {
    padding: spacing.xs
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 59, 48, 0.15)",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    width: "100%",
    marginBottom: spacing.md
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    flex: 1
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
    marginTop: spacing.xs
  },
  actionButton: {
    flex: 1
  }
});
