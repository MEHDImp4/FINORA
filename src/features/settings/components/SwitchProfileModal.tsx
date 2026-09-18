import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PublicUser, authRepository } from "../../../core/jellyfin/authRepository";
import { serverManager } from "../../../core/jellyfin/serverManager";
import { useAuthStore } from "../../../stores/authStore";
import { useServerStore } from "../../../stores/serverStore";
import { ProfilePickerView } from "../../auth/components/ProfilePickerView";
import { ProfilePasswordModal } from "../../auth/components/ProfilePasswordModal";
import { colors, spacing, borderRadius } from "../../../design-system/tokens";
import { FinoraButton } from "../../../design-system/components/FinoraButton";
import { hapticService } from "../../../core/feedback/hapticService";
import { useTranslation } from "../../../i18n";

interface SwitchProfileModalProps {
  visible: boolean;
  onClose: () => void;
  targetServerUrl?: string;
  requirePassword?: boolean;
}

export function SwitchProfileModal({
  visible,
  onClose,
  targetServerUrl,
  requirePassword
}: SwitchProfileModalProps) {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const maxModalHeight = Math.max(
    320,
    Math.min(windowHeight * 0.85, windowHeight - insets.top - insets.bottom - 48)
  );

  const session = useAuthStore((s) => s.session);
  const login = useAuthStore((s) => s.login);
  const switchAccount = useServerStore((s) => s.switchAccount);
  const loadSavedAccounts = useServerStore((s) => s.loadSavedAccounts);
  const savedAccounts = useServerStore((s) => s.savedAccounts);

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<PublicUser | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);

  // Manual fallback inputs
  const [manualUsername, setManualUsername] = useState("");
  const [manualPassword, setManualPassword] = useState("");

  const effectiveServerUrl = targetServerUrl || session?.serverUrl || "";
  const serverId = session?.serverId || "";
  const currentUserId = session?.userId;

  const fetchUsers = useCallback(async () => {
    if (!effectiveServerUrl) return;
    setIsLoadingUsers(true);
    setAuthError(null);
    try {
      const isCurrentSessionServer = Boolean(
        session?.serverUrl &&
        session.serverUrl.replace(/\/+$/, "") === effectiveServerUrl.replace(/\/+$/, "") &&
        session.token
      );
      const discoveredUsers = await authRepository.getAvailableUsers(
        effectiveServerUrl,
        isCurrentSessionServer
      );

      const allSaved = useServerStore.getState().savedAccounts;
      const normalizedTarget = effectiveServerUrl.replace(/\/+$/, "");
      const serverSaved = allSaved.filter(
        (a) =>
          (a.serverUrl && a.serverUrl.replace(/\/+$/, "") === normalizedTarget) ||
          (serverId && a.serverId === serverId)
      );

      const userMap = new Map<string, PublicUser>();

      // Pre-populate with saved accounts on this server
      for (const saved of serverSaved) {
        userMap.set(saved.userId, {
          id: saved.userId,
          name: saved.userName,
          serverId: saved.serverId,
          hasPassword: true
        });
      }

      // Merge / enrich with discovered users (which have primaryImageTag, accurate hasPassword, etc.)
      for (const u of discoveredUsers) {
        const existing = userMap.get(u.id);
        userMap.set(u.id, {
          id: u.id,
          name: u.name || existing?.name || "User",
          serverId: u.serverId || existing?.serverId,
          primaryImageTag: u.primaryImageTag || existing?.primaryImageTag,
          hasPassword: u.hasPassword ?? existing?.hasPassword ?? false
        });
      }

      setUsers(Array.from(userMap.values()));
    } catch {
      const allSaved = useServerStore.getState().savedAccounts;
      const normalizedTarget = effectiveServerUrl.replace(/\/+$/, "");
      const serverSaved = allSaved.filter(
        (a) =>
          (a.serverUrl && a.serverUrl.replace(/\/+$/, "") === normalizedTarget) ||
          (serverId && a.serverId === serverId)
      );
      setUsers(
        serverSaved.map((s) => ({
          id: s.userId,
          name: s.userName,
          serverId: s.serverId,
          hasPassword: true
        }))
      );
    } finally {
      setIsLoadingUsers(false);
    }
  }, [effectiveServerUrl, session?.serverUrl, session?.token, serverId]);

  useEffect(() => {
    if (visible) {
      setIsManualMode(false);
      setManualUsername("");
      setManualPassword("");
      setAuthError(null);
      fetchUsers();
      loadSavedAccounts();
    }
  }, [visible, fetchUsers, loadSavedAccounts]);

  const handleSelectUser = async (user: PublicUser) => {
    if (user.id === currentUserId && !targetServerUrl && !requirePassword) {
      // Already active account on the active server
      onClose();
      return;
    }

    const isSwitchingServer = Boolean(
      targetServerUrl &&
      session?.serverUrl &&
      session.serverUrl.replace(/\/+$/, "") !== targetServerUrl.replace(/\/+$/, "")
    );
    const forcePassword = Boolean(requirePassword || isSwitchingServer);

    // When switching servers, require password for security if profile has a password
    if (forcePassword) {
      if (user.hasPassword !== false) {
        setSelectedUserForPassword(user);
        return;
      }
      // If the user has no password configured on Jellyfin, authenticate directly
      try {
        setIsAuthenticating(true);
        const success = await login({ username: user.name, password: "" }, effectiveServerUrl);
        if (success) {
          const currentSession = useAuthStore.getState().session;
          if (currentSession) {
            await serverManager.saveAccount({
              serverId: currentSession.serverId,
              serverName: user.serverId || "Jellyfin Server",
              serverUrl: currentSession.serverUrl,
              userId: currentSession.userId,
              userName: currentSession.userName,
              lastUsedAt: Date.now()
            });
          }
          await loadSavedAccounts();
          hapticService.notificationSuccess();
          onClose();
        } else {
          setSelectedUserForPassword(user);
        }
      } catch {
        setSelectedUserForPassword(user);
      } finally {
        setIsAuthenticating(false);
      }
      return;
    }

    // Check if account is already saved on this device (token available) for fast 1-tap switch
    const normalizedTarget = effectiveServerUrl.replace(/\/+$/, "");
    const existingSaved = savedAccounts.find(
      (a) =>
        ((a.serverUrl && a.serverUrl.replace(/\/+$/, "") === normalizedTarget) ||
          (serverId && a.serverId === serverId)) &&
        a.userId === user.id
    );

    if (existingSaved) {
      // Fast 1-tap switch
      try {
        hapticService.impactMedium();
        await switchAccount(existingSaved.serverId, existingSaved.userId);
        onClose();
      } catch {
        // Token might have expired, prompt for password
        setSelectedUserForPassword(user);
      }
      return;
    }

    // Account not yet saved on device
    if (!user.hasPassword) {
      // Instant login without password
      try {
        setIsAuthenticating(true);
        const success = await login({ username: user.name, password: "" }, effectiveServerUrl);
        if (success) {
          const currentSession = useAuthStore.getState().session;
          if (currentSession) {
            await serverManager.saveAccount({
              serverId: currentSession.serverId,
              serverName: session?.serverUrl || "Jellyfin Server",
              serverUrl: currentSession.serverUrl,
              userId: currentSession.userId,
              userName: currentSession.userName,
              lastUsedAt: Date.now()
            });
          }
          await loadSavedAccounts();
          hapticService.notificationSuccess();
          onClose();
        }
      } catch (err) {
        setAuthError((err as Error).message);
      } finally {
        setIsAuthenticating(false);
      }
    } else {
      setSelectedUserForPassword(user);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!selectedUserForPassword) return;
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const success = await login(
        { username: selectedUserForPassword.name, password },
        effectiveServerUrl
      );

      if (success) {
        const currentSession = useAuthStore.getState().session;
        if (currentSession) {
          await serverManager.saveAccount({
            serverId: currentSession.serverId,
            serverName: session?.serverUrl || "Jellyfin Server",
            serverUrl: currentSession.serverUrl,
            userId: currentSession.userId,
            userName: currentSession.userName,
            lastUsedAt: Date.now()
          });
        }
        await loadSavedAccounts();
        hapticService.notificationSuccess();
        setSelectedUserForPassword(null);
        onClose();
      } else {
        const err = useAuthStore.getState().errorMessage;
        setAuthError(err || t("settings.errorAuthFailed"));
        hapticService.notificationError();
      }
    } catch (err) {
      setAuthError((err as Error).message);
      hapticService.notificationError();
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleManualLogin = async () => {
    if (!manualUsername.trim()) return;
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const success = await login(
        { username: manualUsername.trim(), password: manualPassword },
        effectiveServerUrl
      );

      if (success) {
        const currentSession = useAuthStore.getState().session;
        if (currentSession) {
          await serverManager.saveAccount({
            serverId: currentSession.serverId,
            serverName: session?.serverUrl || "Jellyfin Server",
            serverUrl: currentSession.serverUrl,
            userId: currentSession.userId,
            userName: currentSession.userName,
            lastUsedAt: Date.now()
          });
        }
        await loadSavedAccounts();
        hapticService.notificationSuccess();
        onClose();
      } else {
        const err = useAuthStore.getState().errorMessage;
        setAuthError(err || t("settings.errorAuthFailed"));
        hapticService.notificationError();
      }
    } catch (err) {
      setAuthError((err as Error).message);
      hapticService.notificationError();
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.backdrop,
          {
            paddingTop: Math.max(insets.top + spacing.sm, spacing.md),
            paddingBottom: Math.max(insets.bottom + spacing.sm, spacing.md)
          }
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common.closeA11y")}
        />
        <View style={[styles.modalCard, { maxHeight: maxModalHeight }]}>
          <View style={styles.topBar}>
            {effectiveServerUrl ? (
              <View style={styles.serverBadge}>
                <Ionicons name="server-outline" size={13} color="#8A8A9E" style={{ marginRight: 6 }} />
                <Text style={styles.serverBadgeText} numberOfLines={1}>
                  {session?.userName ? `${session.userName} • Jellyfin` : "Jellyfin"}
                </Text>
              </View>
            ) : <View />}
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={t("common.closeA11y")}
            >
              <Ionicons name="close" size={18} color="#CCCCCC" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {isManualMode ? (
              <View style={styles.manualContainer}>
                <Text style={styles.manualTitle}>{t("auth.manualLogin")}</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t("onboarding.usernameLabel")}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={manualUsername}
                    onChangeText={setManualUsername}
                    placeholder={t("onboarding.usernamePlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t("onboarding.passwordLabel")}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={manualPassword}
                    onChangeText={setManualPassword}
                    placeholder={t("onboarding.passwordPlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {authError && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#FF3B30" style={{ marginRight: 6 }} />
                    <Text style={styles.errorText}>{authError}</Text>
                  </View>
                )}

                <View style={styles.manualActions}>
                  <FinoraButton
                    label={t("auth.cancel")}
                    variant="secondary"
                    size="md"
                    onPress={() => setIsManualMode(false)}
                    style={{ flex: 1 }}
                  />
                  <FinoraButton
                    label={t("auth.loginButton")}
                    variant="primary"
                    size="md"
                    loading={isAuthenticating}
                    disabled={isAuthenticating || !manualUsername.trim()}
                    onPress={handleManualLogin}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : users.length > 0 ? (
              <ProfilePickerView
                users={users}
                serverUrl={effectiveServerUrl}
                activeUserId={currentUserId}
                onSelectUser={handleSelectUser}
                onManualLoginPress={() => setIsManualMode(true)}
                isLoading={isLoadingUsers}
              />
            ) : isLoadingUsers ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>{t("auth.scanningUsers")}</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={44} color={colors.textMuted} style={{ marginBottom: spacing.sm }} />
                <Text style={styles.emptyTitle}>{t("auth.noPublicUsersFound")}</Text>
                <FinoraButton
                  label={t("auth.manualLogin")}
                  variant="primary"
                  size="md"
                  onPress={() => setIsManualMode(true)}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            )}
          </ScrollView>
        </View>

        <ProfilePasswordModal
          visible={Boolean(selectedUserForPassword)}
          user={selectedUserForPassword}
          serverUrl={effectiveServerUrl}
          onClose={() => setSelectedUserForPassword(null)}
          onSubmit={handlePasswordSubmit}
          isLoading={isAuthenticating}
          errorMessage={authError}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 10, 14, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md
  },
  modalCard: {
    backgroundColor: "#111115",
    borderRadius: 18,
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 1
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs
  },
  serverBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  serverBadgeText: {
    color: "#8A8A9E",
    fontSize: 12,
    fontWeight: "500"
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center"
  },
  scrollContent: {
    padding: spacing.md,
    alignItems: "center"
  },
  centerLoading: {
    paddingVertical: spacing.xxl,
    alignItems: "center"
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: "center"
  },
  emptyTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center"
  },
  manualContainer: {
    width: "100%",
    maxWidth: 320,
    paddingVertical: spacing.md
  },
  manualTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: spacing.lg
  },
  inputGroup: {
    marginBottom: spacing.md
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs
  },
  textInput: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: spacing.sm,
    height: 46,
    color: "#FFFFFF",
    fontSize: 15
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 59, 48, 0.15)",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    flex: 1
  },
  manualActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs
  }
});
