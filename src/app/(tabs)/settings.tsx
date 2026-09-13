import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FinoraScreen } from "../../design-system/components/FinoraScreen";
import { FinoraButton } from "../../design-system/components/FinoraButton";
import { colors, spacing } from "../../design-system/tokens";
import { useAuthStore } from "../../stores/authStore";
import { useServerStore } from "../../stores/serverStore";
import { useOnboardingStore } from "../../stores/onboardingStore";
import {
  usePlaybackPreferencesStore,
  SubtitleMode
} from "../../stores/playbackPreferencesStore";
import { DownloadQuality } from "../../features/offline/downloadQuality";
import { SubtitleStyleModal } from "../../features/player/components/SubtitleStyleModal";
import {
  SettingsSection,
  SettingsRow,
  SettingsSwitchRow
} from "../../features/settings/components/SettingsComponents";
import {
  SelectionPickerModal,
  SelectionOption
} from "../../features/settings/components/SelectionPickerModal";
import { ServerConnectModal } from "../../features/settings/components/ServerConnectModal";
import { ServerDiagnosticsModal } from "../../features/settings/components/ServerDiagnosticsModal";
import { hapticService } from "../../core/feedback/hapticService";
import { useNotificationStore } from "../../stores/notificationStore";
import { notificationService } from "../../core/notifications/notificationService";

// Options de langues audio (Strictement sans emojis)
const AUDIO_LANG_OPTIONS: SelectionOption<string>[] = [
  { id: "fr", label: "Français", subtitle: "Piste audio française prioritaire" },
  { id: "en", label: "Anglais", subtitle: "Piste audio anglaise" },
  { id: "ja", label: "Japonais", subtitle: "Idéal pour les animations et animes" },
  { id: "es", label: "Espagnol", subtitle: "Piste audio espagnole" },
  { id: "de", label: "Allemand", subtitle: "Piste audio allemande" },
  { id: "auto", label: "Original / Auto", subtitle: "Piste par défaut du média" }
];

// Options de sous-titres (Sans emojis)
const SUBTITLE_LANG_OPTIONS: SelectionOption<string>[] = [
  { id: "fr", label: "Français", subtitle: "Sous-titres complets en français" },
  { id: "en", label: "Anglais", subtitle: "Sous-titres en anglais" },
  { id: "es", label: "Espagnol", subtitle: "Sous-titres en espagnol" },
  { id: "none", label: "Désactivés", subtitle: "Aucun sous-titre par défaut" }
];

// Modes d'activation des sous-titres
const SUBTITLE_MODE_OPTIONS: SelectionOption<SubtitleMode>[] = [
  {
    id: "smart",
    label: "Intelligent",
    subtitle: "Active les sous-titres seulement si l'audio n'est pas dans votre langue",
    badge: "Recommandé"
  },
  {
    id: "always",
    label: "Toujours afficher",
    subtitle: "Affiche systématiquement les sous-titres disponibles"
  },
  {
    id: "off",
    label: "Désactivés",
    subtitle: "Démarre la lecture sans sous-titres"
  }
];

// Profils de qualité de téléchargement
const DOWNLOAD_QUALITY_OPTIONS: SelectionOption<DownloadQuality>[] = [
  {
    id: "original",
    label: "Qualité d'origine",
    subtitle: "Fichier source direct sans transcodage",
    badge: "Optimal"
  },
  {
    id: "1080p",
    label: "1080p Full HD",
    subtitle: "Haute fidélité grand écran"
  },
  {
    id: "720p",
    label: "720p HD",
    subtitle: "Optimal pour mobile"
  },
  {
    id: "480p",
    label: "480p SD",
    subtitle: "Économiseur d'espace"
  }
];

// Vitesse de lecture par défaut
const PLAYBACK_SPEED_OPTIONS: SelectionOption<number>[] = [
  { id: 1.0, label: "1.0x", subtitle: "Vitesse standard" },
  { id: 1.25, label: "1.25x", subtitle: "Légère accélération" },
  { id: 1.5, label: "1.5x", subtitle: "Visionnage rapide" }
];

export default function SettingsScreen() {
  const router = useRouter();

  // Stores
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const savedAccounts = useServerStore((state) => state.savedAccounts);
  const loadSavedAccounts = useServerStore((state) => state.loadSavedAccounts);
  const switchAccount = useServerStore((state) => state.switchAccount);
  const removeAccount = useServerStore((state) => state.removeAccount);

  const preferences = usePlaybackPreferencesStore((state) => state.preferences);
  const setPreferredAudioLanguage = usePlaybackPreferencesStore((state) => state.setPreferredAudioLanguage);
  const setPreferredSubtitleLanguage = usePlaybackPreferencesStore((state) => state.setPreferredSubtitleLanguage);
  const setSubtitleMode = usePlaybackPreferencesStore((state) => state.setSubtitleMode);
  const setAutoSkipIntro = usePlaybackPreferencesStore((state) => state.setAutoSkipIntro);
  const setPlaybackSpeed = usePlaybackPreferencesStore((state) => state.setPlaybackSpeed);
  const setDownloadWifiOnly = usePlaybackPreferencesStore((state) => state.setDownloadWifiOnly);
  const setDefaultDownloadQuality = usePlaybackPreferencesStore((state) => state.setDefaultDownloadQuality);
  const setHapticsEnabled = usePlaybackPreferencesStore((state) => state.setHapticsEnabled);

  // Modals state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [showSubtitleStyleModal, setShowSubtitleStyleModal] = useState(false);
  const [activePicker, setActivePicker] = useState<"audio" | "sub" | "subMode" | "speed" | "downloadQuality" | null>(null);

  useEffect(() => {
    loadSavedAccounts();
  }, [loadSavedAccounts]);

  const notifPreferences = useNotificationStore((state) => state.preferences);
  const updateNotifPreferences = useNotificationStore((state) => state.updatePreferences);

  const handleToggleGlobalNotifs = async (enabled: boolean) => {
    if (enabled) {
      const granted = await notificationService.requestPermissions();
      if (!granted) {
        Alert.alert(
          "Autorisation requise",
          "Veuillez autoriser les notifications dans les paramètres de votre téléphone pour recevoir des alertes."
        );
        return;
      }
    }
    updateNotifPreferences({ enabled });
  };

  const handleSendTestNotification = async () => {
    hapticService.notificationSuccess();
    await notificationService.sendTestNotification();
    Alert.alert(
      "Notification envoyée",
      "Une notification de test a été envoyée sur votre appareil."
    );
  };

  const handleClearCache = () => {
    hapticService.impactMedium();
    Alert.alert(
      "Vider le cache",
      "Supprimer les miniatures et métadonnées temporaires ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Vider",
          style: "destructive",
          onPress: () => {
            hapticService.impactHeavy();
            Alert.alert("Cache libéré", "Le cache temporaire a été vidé.");
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    hapticService.impactHeavy();
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vous déconnecter du serveur actif ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Se déconnecter",
          style: "destructive",
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  const audioLabel = AUDIO_LANG_OPTIONS.find((o) => o.id === preferences.preferredAudioLanguage)?.label || preferences.preferredAudioLanguage;
  const subtitleLabel = SUBTITLE_LANG_OPTIONS.find((o) => o.id === preferences.preferredSubtitleLanguage)?.label || preferences.preferredSubtitleLanguage;
  const subtitleModeLabel = SUBTITLE_MODE_OPTIONS.find((o) => o.id === preferences.subtitleMode)?.label || preferences.subtitleMode;
  const downloadQualityLabel = DOWNLOAD_QUALITY_OPTIONS.find((o) => o.id === preferences.defaultDownloadQuality)?.label || preferences.defaultDownloadQuality;
  const speedLabel = `${preferences.playbackSpeed || 1.0}x`;

  return (
    <FinoraScreen safeBottom={false}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Titre Principal Épuré */}
        <View style={styles.headerContainer}>
          <Text style={styles.pageTitle}>Paramètres</Text>
        </View>

        {/* 1. COMPTE */}
        <SettingsSection title="Compte">
          {session ? (
            <View style={styles.sessionHeaderCard}>
              <View style={styles.sessionAvatar}>
                <Ionicons name="person" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.sessionTextContainer}>
                <Text style={styles.sessionUser} numberOfLines={1}>
                  {session.userName}
                </Text>
                <Text style={styles.sessionUrl} numberOfLines={1}>
                  {session.serverUrl}
                </Text>
              </View>
            </View>
          ) : null}

          <SettingsRow
            iconName="server-outline"
            iconColor="#4F8EF7"
            title="Changer de serveur"
            value={session ? "Connecté" : "Non connecté"}
            onPress={() => setShowConnectModal(true)}
          />

          {savedAccounts.length > 1 ? (
            <View style={styles.savedAccountsContainer}>
              <Text style={styles.subCategoryHeader}>Comptes enregistrés</Text>
              {savedAccounts.map((acc, idx) => {
                const isActive = session?.serverId === acc.serverId && session?.userId === acc.userId;
                return (
                  <View key={`${acc.serverId}-${acc.userId}`} style={[styles.accountItemRow, idx > 0 && styles.accountBorder]}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.accountName, isActive && styles.accountNameActive]} numberOfLines={1}>
                        {acc.userName} {isActive ? "(Actif)" : ""}
                      </Text>
                      <Text style={styles.accountUrl} numberOfLines={1}>{acc.serverUrl}</Text>
                    </View>
                    {!isActive ? (
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <FinoraButton
                          label="Basculer"
                          variant="primary"
                          size="sm"
                          onPress={() => switchAccount(acc.serverId, acc.userId)}
                        />
                        <FinoraButton
                          label="Retirer"
                          variant="secondary"
                          size="sm"
                          onPress={() => removeAccount(acc.serverId, acc.userId)}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          <SettingsRow
            iconName="pulse-outline"
            iconColor="#FFB800"
            title="Diagnostic réseau"
            onPress={() => setShowDiagModal(true)}
          />

          {session ? (
            <SettingsRow
              iconName="log-out-outline"
              title="Déconnexion"
              destructive
              showChevron={false}
              isLast
              onPress={handleLogout}
            />
          ) : null}
        </SettingsSection>

        {/* 2. LECTURE */}
        <SettingsSection title="Lecture">
          <SettingsRow
            iconName="volume-medium-outline"
            iconColor="#E50914"
            title="Audio"
            value={audioLabel}
            onPress={() => setActivePicker("audio")}
          />

          <SettingsSwitchRow
            iconName="play-skip-forward-outline"
            iconColor="#E50914"
            title="Passer les intros"
            value={preferences.autoSkipIntro}
            onValueChange={setAutoSkipIntro}
          />

          <SettingsRow
            iconName="speedometer-outline"
            iconColor="#E50914"
            title="Vitesse"
            value={speedLabel}
            isLast
            onPress={() => setActivePicker("speed")}
          />
        </SettingsSection>

        {/* 3. SOUS-TITRES */}
        <SettingsSection title="Sous-titres">
          <SettingsRow
            iconName="chatbubble-ellipses-outline"
            iconColor="#00E5FF"
            title="Langue"
            value={subtitleLabel}
            onPress={() => setActivePicker("sub")}
          />

          <SettingsRow
            iconName="options-outline"
            iconColor="#00E5FF"
            title="Affichage"
            value={subtitleModeLabel}
            onPress={() => setActivePicker("subMode")}
          />

          <SettingsRow
            iconName="color-wand-outline"
            iconColor="#00E5FF"
            title="Style et apparence"
            isLast
            onPress={() => setShowSubtitleStyleModal(true)}
          />
        </SettingsSection>

        {/* 4. TÉLÉCHARGEMENTS */}
        <SettingsSection title="Téléchargements">
          <SettingsRow
            iconName="film-outline"
            iconColor="#4BB543"
            title="Qualité"
            value={downloadQualityLabel}
            onPress={() => setActivePicker("downloadQuality")}
          />

          <SettingsSwitchRow
            iconName="wifi-outline"
            iconColor="#4BB543"
            title="Wi-Fi uniquement"
            value={preferences.downloadWifiOnly}
            onValueChange={setDownloadWifiOnly}
          />

          <SettingsRow
            iconName="folder-open-outline"
            iconColor="#4BB543"
            title="Mes téléchargements"
            onPress={() => router.push("/(tabs)/downloads")}
          />

          <SettingsRow
            iconName="trash-outline"
            iconColor="#8A8A9E"
            title="Vider le cache"
            isLast
            onPress={handleClearCache}
          />
        </SettingsSection>

        {/* 5. NOTIFICATIONS */}
        <SettingsSection title="Notifications">
          <SettingsSwitchRow
            iconName="notifications-outline"
            iconColor="#FF3B30"
            title="Autoriser les notifications"
            value={notifPreferences.enabled}
            onValueChange={handleToggleGlobalNotifs}
            isLast={!notifPreferences.enabled}
          />

          {notifPreferences.enabled ? (
            <>
              <SettingsSwitchRow
                iconName="tv-outline"
                iconColor="#8B5CF6"
                title="Épisodes de mes séries"
                value={notifPreferences.newEpisodes}
                onValueChange={(val) => updateNotifPreferences({ newEpisodes: val })}
              />

              <SettingsSwitchRow
                iconName="film-outline"
                iconColor="#F59E0B"
                title="Nouveaux films ajoutés"
                value={notifPreferences.newMovies}
                onValueChange={(val) => updateNotifPreferences({ newMovies: val })}
              />

              <SettingsSwitchRow
                iconName="sparkles-outline"
                iconColor="#E50914"
                title="Nouvelles séries ajoutées"
                value={notifPreferences.newSeries}
                onValueChange={(val) => updateNotifPreferences({ newSeries: val })}
              />

              <SettingsSwitchRow
                iconName="arrow-down-circle-outline"
                iconColor="#10B981"
                title="Téléchargements terminés"
                value={notifPreferences.downloadsCompleted}
                onValueChange={(val) => updateNotifPreferences({ downloadsCompleted: val })}
              />

              <SettingsRow
                iconName="paper-plane-outline"
                iconColor="#00E5FF"
                title="Tester une notification"
                showChevron={false}
                isLast
                onPress={handleSendTestNotification}
              />
            </>
          ) : null}
        </SettingsSection>

        {/* 6. APPLICATION */}
        <SettingsSection title="Application">
          <SettingsSwitchRow
            iconName="phone-portrait-outline"
            iconColor="#D1D1E0"
            title="Vibrations"
            value={preferences.hapticsEnabled}
            onValueChange={setHapticsEnabled}
          />

          <SettingsRow
            iconName="hardware-chip-outline"
            iconColor="#D1D1E0"
            title="Moteur"
            value="ExoPlayer"
            showChevron={false}
          />

          <SettingsRow
            iconName="information-circle-outline"
            iconColor="#D1D1E0"
            title="Version"
            value="1.0.0"
            showChevron={false}
          />

          <SettingsRow
            iconName="sparkles-outline"
            iconColor="#E50914"
            title="Revoir la présentation FINORA"
            subtitle="Relancer l'onboarding de bienvenue"
            showChevron
            isLast
            onPress={() => {
              hapticService.impactLight();
              Alert.alert(
                "Présentation FINORA",
                "Souhaitez-vous revoir l'écran de bienvenue et de présentation ?",
                [
                  { text: "Annuler", style: "cancel" },
                  {
                    text: "Revoir",
                    onPress: async () => {
                      await useOnboardingStore.getState().resetOnboarding();
                    }
                  }
                ]
              );
            }}
          />
        </SettingsSection>
      </ScrollView>

      {/* Modal Sélecteur Générique */}
      <SelectionPickerModal
        visible={activePicker === "audio"}
        title="Langue audio"
        options={AUDIO_LANG_OPTIONS}
        selectedValue={preferences.preferredAudioLanguage}
        onSelect={setPreferredAudioLanguage}
        onClose={() => setActivePicker(null)}
      />

      <SelectionPickerModal
        visible={activePicker === "sub"}
        title="Sous-titres"
        options={SUBTITLE_LANG_OPTIONS}
        selectedValue={preferences.preferredSubtitleLanguage}
        onSelect={setPreferredSubtitleLanguage}
        onClose={() => setActivePicker(null)}
      />

      <SelectionPickerModal
        visible={activePicker === "subMode"}
        title="Affichage des sous-titres"
        options={SUBTITLE_MODE_OPTIONS}
        selectedValue={preferences.subtitleMode}
        onSelect={setSubtitleMode}
        onClose={() => setActivePicker(null)}
      />

      <SelectionPickerModal
        visible={activePicker === "downloadQuality"}
        title="Qualité de téléchargement"
        options={DOWNLOAD_QUALITY_OPTIONS}
        selectedValue={preferences.defaultDownloadQuality}
        onSelect={setDefaultDownloadQuality}
        onClose={() => setActivePicker(null)}
      />

      <SelectionPickerModal
        visible={activePicker === "speed"}
        title="Vitesse de lecture"
        options={PLAYBACK_SPEED_OPTIONS}
        selectedValue={preferences.playbackSpeed || 1.0}
        onSelect={setPlaybackSpeed}
        onClose={() => setActivePicker(null)}
      />

      {/* Modal Ajout / Changement de Serveur */}
      <ServerConnectModal
        visible={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />

      {/* Modal Diagnostics */}
      <ServerDiagnosticsModal
        visible={showDiagModal}
        onClose={() => setShowDiagModal(false)}
      />

      {/* Modal Personnalisation Sous-titres */}
      <SubtitleStyleModal
        visible={showSubtitleStyleModal}
        onClose={() => setShowSubtitleStyleModal(false)}
      />
    </FinoraScreen>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 110
  },
  headerContainer: {
    marginBottom: spacing.lg,
    marginTop: spacing.xs
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5
  },
  sessionHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderBottomWidth: 1,
    borderBottomColor: "#1C1C26"
  },
  sessionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  sessionTextContainer: {
    flex: 1,
    justifyContent: "center"
  },
  sessionUser: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF"
  },
  sessionUrl: {
    fontSize: 12,
    color: "#6E6E82",
    marginTop: 2
  },
  savedAccountsContainer: {
    padding: spacing.md,
    backgroundColor: "#161622",
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E28"
  },
  subCategoryHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8A8A9E",
    letterSpacing: 1,
    marginBottom: spacing.sm
  },
  accountItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8
  },
  accountBorder: {
    borderTopWidth: 1,
    borderTopColor: "#20202E"
  },
  accountName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF"
  },
  accountNameActive: {
    color: colors.primary
  },
  accountUrl: {
    fontSize: 12,
    color: "#8A8A9E",
    marginTop: 2
  }
});
