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
import { hapticService } from "../../../core/feedback/hapticService";

interface ServerDiagnosticsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ServerDiagnosticsModal({ visible, onClose }: ServerDiagnosticsModalProps) {
  const session = useAuthStore((state) => state.session);
  const [isRunning, setIsRunning] = useState(false);
  const [diagResult, setDiagResult] = useState<ServerDiagnosticsResult | null>(null);

  const handleRunDiagnostics = async () => {
    const url = session?.serverUrl;
    if (!url) return; // No server configured — nothing to diagnose
    setIsRunning(true);
    try {
      const res = await diagnosticsService.runDiagnostics(url, session?.token);
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
              <Text style={styles.headerTitle}>Diagnostic Réseau & Serveur</Text>
              <Text style={styles.headerDescription}>
                Vérification de la connectivité, latence, chiffrement et statut de l'API.
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

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.actionContainer}>
              <FinoraButton
                label={isRunning ? "Analyse en cours..." : "Lancer le test de connexion"}
                variant="primary"
                size="md"
                loading={isRunning}
                onPress={handleRunDiagnostics}
              />
            </View>

            {diagResult ? (
              <View style={styles.resultsContainer}>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Serveur cible</Text>
                  <Text style={styles.metricValue} numberOfLines={1}>
                    {diagResult.serverUrl}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Chiffrement / Sécurité</Text>
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
                      {diagResult.isHttps ? "HTTPS Sécurisé" : "HTTP Non chiffré"}
                    </Text>
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Latence aller-retour</Text>
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
                  <Text style={styles.metricLabel}>Nom du serveur</Text>
                  <Text style={styles.metricValue}>
                    {diagResult.serverName || "Serveur Jellyfin"}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Version Jellyfin</Text>
                  <Text style={styles.metricValue}>{diagResult.version || "Inconnue"}</Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Santé de l'API</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      { color: diagResult.apiHealthy ? "#4BB543" : "#FF4D4D" }
                    ]}
                  >
                    {diagResult.apiHealthy ? "Opérationnelle" : "Inaccessible"}
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
                  Appuyez sur le bouton ci-dessus pour inspecter les métriques réseau et serveur.
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
