import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../../design-system/tokens";
import { FinoraButton } from "../../../design-system/components/FinoraButton";
import {
  diagnosticsService,
  ServerDiagnosticsResult
} from "../../../core/jellyfin/diagnosticsService";
import { useAuthStore } from "../../../stores/authStore";
import { useServerStore } from "../../../stores/serverStore";
import { hapticService } from "../../../core/feedback/hapticService";
import { useTranslation } from "../../../i18n";

interface ServerDiagnosticsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ServerDiagnosticsModal({ visible, onClose }: ServerDiagnosticsModalProps) {
  const { t } = useTranslation();
  const session = useAuthStore((state) => state.session);
  const autoDetectActiveConnection = useServerStore((state) => state.autoDetectActiveConnection);
  const isLocalConnection = useServerStore((state) => state.isLocalConnection);
  const [isRunning, setIsRunning] = useState(false);
  const [diagResult, setDiagResult] = useState<ServerDiagnosticsResult | null>(null);

  const handleRunDiagnostics = async () => {
    const url = session?.serverUrl;
    if (!url) return; // No server configured — nothing to diagnose
    setIsRunning(true);
    try {
      const [res] = await Promise.all([
        diagnosticsService.runDiagnostics(url, session?.token),
        autoDetectActiveConnection(session?.serverId)
      ]);
      setDiagResult(res);
      hapticService.impactMedium();
    } finally {
      setIsRunning(false);
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
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{t("settings.diagTitle")}</Text>
              <Text style={styles.headerDescription}>
                {t("settings.diagDesc")}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel={t("common.close")}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.actionContainer}>
              <FinoraButton
                label={isRunning ? t("settings.diagRunning") : t("settings.diagRunTest")}
                variant="primary"
                size="md"
                loading={isRunning}
                onPress={handleRunDiagnostics}
              />
            </View>

            {diagResult ? (
              <View style={styles.resultsContainer}>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{t("settings.diagTargetServer")}</Text>
                  <Text style={styles.metricValue} numberOfLines={1}>
                    {diagResult.serverUrl}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{t("settings.autoDetectConnection")}</Text>
                  <View style={styles.badgeRow}>
                    <Ionicons
                      name={isLocalConnection ? "flash-outline" : "globe-outline"}
                      size={16}
                      color={isLocalConnection ? "#00D26A" : "#3B82F6"}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.metricValue,
                        { color: isLocalConnection ? "#00D26A" : "#3B82F6" }
                      ]}
                    >
                      {isLocalConnection
                        ? t("settings.connectionTypeLocal")
                        : t("settings.connectionTypeRemote")}
                    </Text>
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{t("settings.diagSecurity")}</Text>
                  <View style={styles.badgeRow}>
                    <Ionicons
                      name={diagResult.isHttps ? "shield-checkmark" : "warning"}
                      size={16}
                      color={diagResult.isHttps ? "#4BB543" : "#FFB800"}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.metricValue,
                        { color: diagResult.isHttps ? "#4BB543" : "#FFB800" }
                      ]}
                    >
                      {diagResult.isHttps ? t("settings.diagSecureHttps") : t("settings.diagUnencryptedHttp")}
                    </Text>
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{t("settings.diagLatency")}</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color:
                          diagResult.pingMs < 100
                            ? "#4BB543"
                            : diagResult.pingMs < 300
                            ? "#FFB800"
                            : "#FF4D4D"
                      }
                    ]}
                  >
                    {diagResult.pingMs} ms
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{t("settings.diagServerName")}</Text>
                  <Text style={styles.metricValue}>
                    {diagResult.serverName || t("settings.defaultServerName")}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{t("settings.diagVersion")}</Text>
                  <Text style={styles.metricValue}>{diagResult.version || t("common.unknown")}</Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{t("settings.diagApiHealth")}</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      { color: diagResult.apiHealthy ? "#4BB543" : "#FF4D4D" }
                    ]}
                  >
                    {diagResult.apiHealthy ? t("settings.diagOnline") : t("settings.diagUnreachable")}
                  </Text>
                </View>

                <View style={styles.statusBox}>
                  <Text style={styles.statusMessage}>{diagResult.statusMessage}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="pulse-outline" size={40} color="#3D3D52" />
                <Text style={styles.placeholderText}>
                  {t("settings.diagPlaceholder")}
                </Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
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
  modalCard: {
    width: "100%",
    maxWidth: 440,
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
  actionContainer: {
    marginBottom: spacing.md
  },
  resultsContainer: {
    backgroundColor: "#191924",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#252536",
    padding: 14
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#222233"
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  metricLabel: {
    fontSize: 13,
    color: "#8A8A9E"
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF"
  },
  statusBox: {
    marginTop: 10,
    paddingTop: 8
  },
  statusMessage: {
    fontSize: 12,
    color: "#A0A0B8",
    fontStyle: "italic",
    lineHeight: 16
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 13,
    color: "#6E6E82",
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 18
  }
});
