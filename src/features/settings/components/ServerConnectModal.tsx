import React, { useState, useEffect } from "react";
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
  ScrollView,
  ActivityIndicator,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "../../../design-system/tokens";
import { FinoraButton } from "../../../design-system/components/FinoraButton";
import { useAuthStore } from "../../../stores/authStore";
import { useServerStore } from "../../../stores/serverStore";
import { SavedServer } from "../../../core/jellyfin/serverManager";
import { hapticService } from "../../../core/feedback/hapticService";
import {
  validateAndDiscoverServer,
  ServerDiscoveryResult,
  DEFAULT_JELLYFIN_SERVER
} from "../../../core/jellyfin/serverDiscovery";
import { useTranslation } from "../../../i18n";

interface ServerConnectModalProps {
  visible: boolean;
  onClose: () => void;
  onServerChanged?: (newServerUrl: string) => void;
}

export function ServerConnectModal({
  visible,
  onClose,
  onServerChanged
}: ServerConnectModalProps) {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const maxModalHeight = Math.max(
    320,
    Math.min(windowHeight * 0.82, windowHeight - insets.top - insets.bottom - 48)
  );

  const session = useAuthStore((state) => state.session);
  const savedServers = useServerStore((state) => state.savedServers);
  const loadSavedServers = useServerStore((state) => state.loadSavedServers);
  const saveServer = useServerStore((state) => state.saveServer);
  const removeServer = useServerStore((state) => state.removeServer);

  const [serverInput, setServerInput] = useState(DEFAULT_JELLYFIN_SERVER);
  const [isTesting, setIsTesting] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<ServerDiscoveryResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setServerInput(DEFAULT_JELLYFIN_SERVER);
      setDiscoveryResult(null);
      setErrorMsg(null);
      setSuccessMsg(null);
      loadSavedServers();
    }
  }, [visible, loadSavedServers]);

  const handleTestServer = async (urlToTest?: string) => {
    const target = (urlToTest ?? serverInput).trim();
    if (!target) {
      setErrorMsg(t("settings.errorEmptyServerUrl"));
      return null;
    }

    setIsTesting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await validateAndDiscoverServer(target);
      setDiscoveryResult(result);
      setServerInput(result.url);
      hapticService.notificationSuccess();
      return result;
    } catch (err) {
      setDiscoveryResult(null);
      setErrorMsg((err as Error).message || t("errors.serverUnreachableDesc"));
      hapticService.notificationError();
      return null;
    } finally {
      setIsTesting(false);
    }
  };

  const handleSelectServer = async (server: SavedServer) => {
    hapticService.impactMedium();
    const normalizedTarget = server.url.replace(/\/+$/, "");
    const currentNormalized = session?.serverUrl?.replace(/\/+$/, "");

    // Update lastUsedAt
    await saveServer({
      ...server,
      lastUsedAt: Date.now()
    });

    if (currentNormalized === normalizedTarget) {
      setSuccessMsg(t("settings.serverConnectSuccess"));
      setTimeout(() => {
        onClose();
      }, 500);
      return;
    }

    // Switch target server and require password verification for security
    setSuccessMsg(t("settings.serverConnectSwitchSuccess"));
    setTimeout(() => {
      onClose();
      onServerChanged?.(server.url);
    }, 400);
  };

  const handleAddAndConnect = async () => {
    const target = serverInput.trim();
    if (!target) {
      setErrorMsg(t("settings.errorEmptyServerUrl"));
      return;
    }

    let result = discoveryResult;
    if (!result || result.url.replace(/\/+$/, "") !== target.replace(/\/+$/, "")) {
      result = await handleTestServer(target);
      if (!result) return;
    }

    // Persist new server to saved servers list
    await saveServer({
      id: result.serverId,
      name: result.serverName,
      url: result.url,
      lastUsedAt: Date.now()
    });

    hapticService.notificationSuccess();
    setSuccessMsg(t("settings.serverConnectSwitchSuccess"));
    setTimeout(() => {
      onClose();
      onServerChanged?.(result!.url);
    }, 400);
  };

  const handleRemoveServer = async (serverId: string, e: any) => {
    e?.stopPropagation?.();
    hapticService.impactMedium();
    try {
      await removeServer(serverId);
      setSuccessMsg(t("settings.serverConnectRemoveA11y"));
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err) {
      setErrorMsg((err as Error).message);
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
          accessibilityLabel={t("settings.serverConnectCloseA11y")}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardContainer}
          pointerEvents="box-none"
        >
          <View style={[styles.modalCard, { maxHeight: maxModalHeight }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>{t("settings.serverConnectTitle")}</Text>
                <Text style={styles.headerDescription}>
                  {t("settings.serverConnectSubtitle")}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel={t("settings.serverConnectCloseA11y")}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              bounces={false}
            >
              {/* Section 1: Saved Servers */}
              <View style={styles.sectionHeader}>
                <Ionicons name="server" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>
                  {t("settings.serverConnectSavedServersTitle")}
                </Text>
              </View>

              {savedServers.length === 0 ? (
                <View style={styles.emptyServersBox}>
                  <Text style={styles.emptyServersText}>
                    {t("settings.serverConnectNoSavedServers")}
                  </Text>
                </View>
              ) : (
                <View style={styles.serversList}>
                  {savedServers.map((s) => {
                    const isActive =
                      Boolean(session?.serverUrl) &&
                      session!.serverUrl.replace(/\/+$/, "") === s.url.replace(/\/+$/, "");

                    return (
                      <Pressable
                        key={s.id || s.url}
                        style={[styles.serverCard, isActive && styles.serverCardActive]}
                        onPress={() => handleSelectServer(s)}
                        accessibilityRole="button"
                      >
                        <View style={styles.serverIconBox}>
                          <Ionicons
                            name="server-outline"
                            size={20}
                            color={isActive ? colors.primary : "#8A8A9E"}
                          />
                        </View>

                        <View style={styles.serverInfo}>
                          <View style={styles.serverTitleRow}>
                            <Text style={styles.serverName} numberOfLines={1}>
                              {s.name || t("settings.serverConnectDefaultName")}
                            </Text>
                            {isActive && (
                              <View style={styles.activeBadge}>
                                <View style={styles.activeDot} />
                                <Text style={styles.activeBadgeText}>
                                  {t("settings.serverConnectActiveBadge")}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.serverUrl} numberOfLines={1}>
                            {s.url}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.removeServerButton}
                          onPress={(e) => handleRemoveServer(s.id, e)}
                          accessibilityRole="button"
                          accessibilityLabel={t("settings.serverConnectRemoveA11y")}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#6B6B80" />
                        </TouchableOpacity>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Section 2: Add New Server */}
              <View style={[styles.sectionHeader, { marginTop: spacing.md }]}>
                <Ionicons name="add-circle" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>
                  {t("settings.serverConnectAddServerTitle")}
                </Text>
              </View>
              <Text style={styles.sectionDesc}>
                {t("settings.serverConnectAddServerDesc")}
              </Text>

              {/* Input + Test Button */}
              <View style={styles.inputWrapper}>
                <Ionicons name="globe-outline" size={18} color="#8A8A9E" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={serverInput}
                  onChangeText={(val) => {
                    setServerInput(val);
                    setDiscoveryResult(null);
                    setErrorMsg(null);
                  }}
                  placeholder={t("settings.serverUrlPlaceholder")}
                  placeholderTextColor="#666680"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <Pressable
                  style={styles.testButton}
                  onPress={() => handleTestServer()}
                  disabled={isTesting || !serverInput.trim()}
                  accessibilityRole="button"
                  accessibilityLabel={t("settings.serverConnectTestButton")}
                >
                  {isTesting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.testButtonText}>
                      {t("settings.serverConnectTestButton")}
                    </Text>
                  )}
                </Pressable>
              </View>

              {/* Discovery Result Preview Card */}
              {discoveryResult && (
                <View style={styles.discoveryCard}>
                  <View style={styles.discoveryHeader}>
                    <Ionicons name="checkmark-circle" size={18} color="#4BB543" style={{ marginRight: 8 }} />
                    <Text style={styles.discoveryTitle}>
                      {discoveryResult.serverName || t("settings.serverConnectServerDetected")}
                    </Text>
                  </View>
                  <View style={styles.discoveryMeta}>
                    <Text style={styles.metaText}>
                      Version : <Text style={styles.metaValue}>{discoveryResult.version}</Text>
                    </Text>
                    {discoveryResult.operatingSystem ? (
                      <Text style={styles.metaText}>
                        OS : <Text style={styles.metaValue}>{discoveryResult.operatingSystem}</Text>
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.securityBadge, discoveryResult.isHttps ? styles.badgeHttps : styles.badgeHttp]}>
                    <Ionicons
                      name={discoveryResult.isHttps ? "lock-closed" : "alert-circle"}
                      size={13}
                      color={discoveryResult.isHttps ? "#4BB543" : "#FFA500"}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        styles.securityBadgeText,
                        { color: discoveryResult.isHttps ? "#4BB543" : "#FFA500" }
                      ]}
                    >
                      {discoveryResult.isHttps
                        ? t("settings.diagSecureHttps")
                        : t("settings.diagUnencryptedHttp")}
                    </Text>
                  </View>
                </View>
              )}

              {/* Error & Success Messages */}
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

              {/* Save & Connect Action */}
              {serverInput.trim().length > 0 && (
                <View style={styles.actionContainer}>
                  <FinoraButton
                    label={isTesting ? t("settings.serverConnectTesting") : t("settings.serverConnectSaveAndConnect")}
                    variant="primary"
                    size="md"
                    loading={isTesting}
                    disabled={isTesting || !serverInput.trim()}
                    onPress={handleAddAndConnect}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md
  },
  keyboardContainer: {
    width: "100%",
    maxWidth: 440,
    justifyContent: "center",
    alignItems: "center"
  },
  modalCard: {
    backgroundColor: "#14141A",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "#262633",
    overflow: "hidden",
    width: "100%",
    display: "flex",
    flexDirection: "column"
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 1
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
    padding: spacing.md,
    paddingBottom: spacing.xl
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B3B3CC",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  sectionDesc: {
    fontSize: 12,
    color: "#8A8A9E",
    marginBottom: 10,
    lineHeight: 16
  },
  emptyServersBox: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#1A1A24",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#262633",
    marginBottom: 8
  },
  emptyServersText: {
    fontSize: 13,
    color: "#8A8A9E",
    textAlign: "center"
  },
  serversList: {
    marginBottom: 8
  },
  serverCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A24",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262633",
    padding: 12,
    marginBottom: 8
  },
  serverCardActive: {
    borderColor: "rgba(229, 9, 20, 0.5)",
    backgroundColor: "#1E1A22"
  },
  serverIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  serverInfo: {
    flex: 1,
    marginRight: 8
  },
  serverTitleRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  serverName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    flexShrink: 1,
    marginRight: 8
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(75, 181, 67, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4BB543",
    marginRight: 4
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4BB543"
  },
  serverUrl: {
    fontSize: 12,
    color: "#8A8A9E",
    marginTop: 2
  },
  removeServerButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.04)"
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A24",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2D2D3D",
    paddingLeft: 12,
    paddingRight: 6,
    height: 48,
    marginBottom: 12
  },
  inputIcon: {
    marginRight: 8
  },
  textInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: "#FFFFFF"
  },
  testButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 6
  },
  testButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600"
  },
  discoveryCard: {
    backgroundColor: "rgba(75, 181, 67, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(75, 181, 67, 0.3)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14
  },
  discoveryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6
  },
  discoveryTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  },
  discoveryMeta: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8
  },
  metaText: {
    color: "#8A8A9E",
    fontSize: 12
  },
  metaValue: {
    color: "#FFFFFF",
    fontWeight: "600"
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  badgeHttps: {
    backgroundColor: "rgba(75, 181, 67, 0.15)"
  },
  badgeHttp: {
    backgroundColor: "rgba(255, 165, 0, 0.15)"
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: "600"
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
    marginTop: 4,
    marginBottom: 8
  }
});
