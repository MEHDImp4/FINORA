import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const savedAccounts = useServerStore((state) => state.savedAccounts);
  const loadSavedAccounts = useServerStore((state) => state.loadSavedAccounts);
  const switchAccount = useServerStore((state) => state.switchAccount);
  const removeAccount = useServerStore((state) => state.removeAccount);

  const [isRunning, setIsRunning] = useState(false);
  const [diagResult, setDiagResult] = useState<ServerDiagnosticsResult | null>(null);

  // Connect form state
  const [serverInput, setServerInput] = useState("https://azeur-jelly-web.smp4.xyz");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSavedAccounts();
  }, [loadSavedAccounts]);

  const handleConnect = async () => {
    if (!serverInput.trim()) {
      setLoginError("Please enter a Jellyfin server URL.");
      return;
    }
    if (!usernameInput.trim()) {
      setLoginError("Please enter your username.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);
    setLoginSuccess(null);

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
        const currentSession = useAuthStore.getState().session;
        if (currentSession) {
          const { serverManager } = await import("../../core/jellyfin/serverManager");
          await serverManager.saveAccount({
            serverId: currentSession.serverId,
            serverName: "Jellyfin Server",
            serverUrl: currentSession.serverUrl,
            userId: currentSession.userId,
            userName: currentSession.userName,
            lastUsedAt: Date.now()
          });
        }
        setLoginSuccess("Connected successfully!");
        setPasswordInput("");
        await loadSavedAccounts();
      } else {
        const err = useAuthStore.getState().errorMessage;
        setLoginError(err || "Authentication failed. Check credentials.");
      }
    } catch (e) {
      setLoginError((e as Error).message || "Failed to connect to server.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRunDiagnostics = async () => {
    const url = session?.serverUrl || serverInput.trim() || "https://azeur-jelly-web.smp4.xyz";
    setIsRunning(true);
    try {
      const res = await diagnosticsService.runDiagnostics(url, session?.token);
      setDiagResult(res);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <FinoraScreen safeBottom={false}>
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

        {/* Connect to Server / Login Form */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>
            {session ? "Add Another Server / Switch User" : "Connect to Jellyfin Server"}
          </Text>
          <Text style={styles.cardDescription}>
            Enter your Jellyfin server address and user credentials to connect.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Server URL</Text>
            <TextInput
              style={styles.textInput}
              value={serverInput}
              onChangeText={setServerInput}
              placeholder="https://your-jellyfin-server.com"
              placeholderTextColor="#666680"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.textInput}
              value={usernameInput}
              onChangeText={setUsernameInput}
              placeholder="Username"
              placeholderTextColor="#666680"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              value={passwordInput}
              onChangeText={setPasswordInput}
              placeholder="Password"
              placeholderTextColor="#666680"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {loginError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#FF4D4D" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          ) : null}

          {loginSuccess ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#4BB543" style={{ marginRight: 6 }} />
              <Text style={styles.successText}>{loginSuccess}</Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <FinoraButton
              label={isLoggingIn ? "Connecting..." : "Connect & Log In"}
              variant="primary"
              size="md"
              loading={isLoggingIn}
              onPress={handleConnect}
            />
          </View>
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
  textInput: {
    backgroundColor: "#1C1C26",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2D2D3D",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#FFFFFF"
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229, 9, 20, 0.15)",
    borderColor: "rgba(229, 9, 20, 0.4)",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 13,
    flex: 1
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(75, 181, 67, 0.15)",
    borderColor: "rgba(75, 181, 67, 0.4)",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12
  },
  successText: {
    color: "#4BB543",
    fontSize: 13,
    fontWeight: "600",
    flex: 1
  }
});
