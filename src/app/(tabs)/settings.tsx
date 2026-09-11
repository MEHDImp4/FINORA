import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView
} from "react-native";
import { FinoraScreen } from "../../design-system/components/FinoraScreen";
import { FinoraButton } from "../../design-system/components/FinoraButton";
import { useAuthStore } from "../../stores/authStore";
import { useServerStore } from "../../stores/serverStore";
import {
  diagnosticsService,
  ServerDiagnosticsResult
} from "../../core/jellyfin/diagnosticsService";

export default function SettingsScreen() {
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const savedAccounts = useServerStore((state) => state.savedAccounts);
  const loadSavedAccounts = useServerStore((state) => state.loadSavedAccounts);
  const switchAccount = useServerStore((state) => state.switchAccount);
  const removeAccount = useServerStore((state) => state.removeAccount);

  const [isRunning, setIsRunning] = useState(false);
  const [diagResult, setDiagResult] = useState<ServerDiagnosticsResult | null>(null);

  useEffect(() => {
    loadSavedAccounts();
  }, [loadSavedAccounts]);

  const handleRunDiagnostics = async () => {
    const url = session?.serverUrl || "https://demo.jellyfin.org";
    setIsRunning(true);
    try {
      const res = await diagnosticsService.runDiagnostics(url, session?.token);
      setDiagResult(res);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <FinoraScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.headerTitle}>Settings</Text>

        {/* Active Account Section */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Active Session</Text>
          {session ? (
            <View style={styles.sessionInfo}>
              <Text style={styles.infoLabel}>
                User: <Text style={styles.infoValue}>{session.userName}</Text>
              </Text>
              <Text style={styles.infoLabel}>
                Server URL: <Text style={styles.infoValue}>{session.serverUrl}</Text>
              </Text>
              <Text style={styles.infoLabel}>
                Server ID: <Text style={styles.infoValue}>{session.serverId}</Text>
              </Text>
              <View style={styles.actionRow}>
                <FinoraButton
                  label="Log Out"
                  variant="secondary"
                  size="sm"
                  onPress={logout}
                />
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Not connected to any Jellyfin server.</Text>
          )}
        </View>

        {/* Saved Accounts / Multi-Server Switching (AUTH-04) */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Saved Accounts (AUTH-04)</Text>
          <Text style={styles.cardDescription}>
            Switch between configured Jellyfin servers and user profiles without re-entering credentials.
          </Text>
          {savedAccounts.length > 0 ? (
            savedAccounts.map((account) => {
              const isActive =
                session?.serverId === account.serverId && session?.userId === account.userId;
              return (
                <View
                  key={`${account.serverId}-${account.userId}`}
                  style={styles.accountRow}
                  testID={`saved-account-${account.userId}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoValue}>
                      {account.userName} {isActive ? "(Active)" : ""}
                    </Text>
                    <Text style={styles.infoLabel}>{account.serverUrl}</Text>
                  </View>
                  {!isActive ? (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <FinoraButton
                        label="Switch"
                        variant="primary"
                        size="sm"
                        onPress={() => switchAccount(account.serverId, account.userId)}
                      />
                      <FinoraButton
                        label="Remove"
                        variant="secondary"
                        size="sm"
                        onPress={() => removeAccount(account.serverId, account.userId)}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No other accounts saved.</Text>
          )}
        </View>

        {/* Server Diagnostics Section */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Server Diagnostics (DIAG-01)</Text>
          <Text style={styles.cardDescription}>
            Inspect connection latency, TLS/HTTPS security status, and Jellyfin API health.
          </Text>

          <View style={styles.actionRow}>
            <FinoraButton
              label="Run Diagnostics"
              variant="primary"
              size="md"
              loading={isRunning}
              onPress={handleRunDiagnostics}
            />
          </View>

          {diagResult && (
            <View style={styles.resultsContainer}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Target URL:</Text>
                <Text style={styles.metricValue}>{diagResult.serverUrl}</Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Security / TLS:</Text>
                <Text
                  style={[
                    styles.metricValue,
                    { color: diagResult.isHttps ? "#4BB543" : "#FFB800" }
                  ]}
                >
                  {diagResult.isHttps ? "Secure (HTTPS)" : "Unencrypted (HTTP Warning)"}
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Round-Trip Latency:</Text>
                <Text style={styles.metricValue}>{diagResult.pingMs} ms</Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Server Name:</Text>
                <Text style={styles.metricValue}>{diagResult.serverName}</Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Version:</Text>
                <Text style={styles.metricValue}>{diagResult.version}</Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>API Status:</Text>
                <Text
                  style={[
                    styles.metricValue,
                    { color: diagResult.apiHealthy ? "#4BB543" : "#E50914" }
                  ]}
                >
                  {diagResult.apiHealthy ? "Healthy" : "Degraded / Unreachable"}
                </Text>
              </View>

              <Text style={styles.statusMessage}>{diagResult.statusMessage}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </FinoraScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 20
  },
  card: {
    backgroundColor: "#14141A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262633",
    padding: 18,
    marginBottom: 20
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8
  },
  cardDescription: {
    fontSize: 14,
    color: "#8A8A9E",
    marginBottom: 16,
    lineHeight: 20
  },
  sessionInfo: {
    marginTop: 8
  },
  infoLabel: {
    fontSize: 14,
    color: "#8A8A9E",
    marginBottom: 4
  },
  infoValue: {
    color: "#FFFFFF",
    fontWeight: "600"
  },
  emptyText: {
    fontSize: 14,
    color: "#8A8A9E",
    fontStyle: "italic"
  },
  actionRow: {
    marginTop: 14,
    flexDirection: "row"
  },
  resultsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#262633"
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  metricLabel: {
    fontSize: 14,
    color: "#8A8A9E"
  },
  metricValue: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600"
  },
  statusMessage: {
    marginTop: 8,
    fontSize: 13,
    color: "#8A8A9E",
    fontStyle: "italic"
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E26"
  }
});
