import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../../design-system/tokens";
import { FinoraButton } from "../../../design-system/components/FinoraButton";
import { useAuthStore } from "../../../stores/authStore";
import { useServerStore } from "../../../stores/serverStore";
import { hapticService } from "../../../core/feedback/hapticService";
import { DEFAULT_JELLYFIN_SERVER } from "../../../core/jellyfin/serverDiscovery";

interface ServerConnectModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ServerConnectModal({ visible, onClose }: ServerConnectModalProps) {
  const login = useAuthStore((state) => state.login);
  const loadSavedAccounts = useServerStore((state) => state.loadSavedAccounts);

  const [serverInput, setServerInput] = useState(DEFAULT_JELLYFIN_SERVER);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!serverInput.trim()) {
      setErrorMsg("Veuillez saisir l'adresse du serveur Jellyfin.");
      return;
    }
    if (!usernameInput.trim()) {
      setErrorMsg("Veuillez renseigner votre nom d'utilisateur.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const normalizedUrl = serverInput.trim().replace(/\/+$/, "").replace(/\/web(\/.*)?$/i, "");
      const success = await login(
        {
          username: usernameInput.trim(),
          password: passwordInput
        },
        normalizedUrl
      );

      if (success) {
        hapticService.impactMedium();
        const currentSession = useAuthStore.getState().session;
        if (currentSession) {
          const { serverManager } = await import("../../../core/jellyfin/serverManager");
          await serverManager.saveAccount({
            serverId: currentSession.serverId,
            serverName: "Serveur Jellyfin",
            serverUrl: currentSession.serverUrl,
            userId: currentSession.userId,
            userName: currentSession.userName,
            lastUsedAt: Date.now()
          });
        }
        await loadSavedAccounts();
        setSuccessMsg("Connexion établie avec succès.");
        setPasswordInput("");
        setTimeout(() => {
          onClose();
          setSuccessMsg(null);
        }, 800);
      } else {
        const err = useAuthStore.getState().errorMessage;
        setErrorMsg(err || "Échec de l'authentification. Vérifiez vos identifiants.");
      }
    } catch (err) {
      setErrorMsg((err as Error).message || "Impossible de joindre le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardContainer}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Connexion Serveur</Text>
                <Text style={styles.headerDescription}>
                  Saisissez l'adresse et vos identifiants pour ajouter ou changer de serveur.
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Adresse du serveur (URL)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="server-outline" size={18} color="#8A8A9E" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={serverInput}
                    onChangeText={setServerInput}
                    placeholder="https://votre-serveur.com"
                    placeholderTextColor="#666680"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Nom d'utilisateur</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#8A8A9E" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={usernameInput}
                    onChangeText={setUsernameInput}
                    placeholder="Identifiant Jellyfin"
                    placeholderTextColor="#666680"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Mot de passe</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color="#8A8A9E" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    placeholder="Mot de passe"
                    placeholderTextColor="#666680"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {errorMsg ? (
                <View style={styles.bannerError}>
                  <Ionicons name="alert-circle" size={18} color="#FF4D4D" style={{ marginRight: 8 }} />
                  <Text style={styles.bannerErrorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {successMsg ? (
                <View style={styles.bannerSuccess}>
                  <Ionicons name="checkmark-circle" size={18} color="#4BB543" style={{ marginRight: 8 }} />
                  <Text style={styles.bannerSuccessText}>{successMsg}</Text>
                </View>
              ) : null}

              <View style={styles.actionContainer}>
                <FinoraButton
                  label={isLoading ? "Connexion en cours..." : "Se connecter"}
                  variant="primary"
                  size="md"
                  loading={isLoading}
                  onPress={handleConnect}
                />
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  keyboardContainer: {
    width: "100%",
    maxWidth: 440
  },
  modalCard: {
    backgroundColor: "#14141A",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#262633",
    overflow: "hidden"
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E28"
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  headerDescription: {
    fontSize: 13,
    color: "#8A8A9E",
    marginTop: 4,
    lineHeight: 18
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm
  },
  body: {
    padding: spacing.md
  },
  formGroup: {
    marginBottom: 14
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B3B3CC",
    marginBottom: 6
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C26",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2D2D3D",
    paddingHorizontal: 12
  },
  inputIcon: {
    marginRight: 10
  },
  textInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: "#FFFFFF"
  },
  bannerError: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229, 9, 20, 0.15)",
    borderColor: "rgba(229, 9, 20, 0.35)",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12
  },
  bannerErrorText: {
    color: "#FF6B6B",
    fontSize: 13,
    flex: 1
  },
  bannerSuccess: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(75, 181, 67, 0.15)",
    borderColor: "rgba(75, 181, 67, 0.35)",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12
  },
  bannerSuccessText: {
    color: "#4BB543",
    fontSize: 13,
    fontWeight: "600",
    flex: 1
  },
  actionContainer: {
    marginTop: 10
  }
});
