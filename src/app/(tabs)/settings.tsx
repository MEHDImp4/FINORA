import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FinoraScreen } from "../../design-system/components/FinoraScreen";
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
import { useQueryClient } from "@tanstack/react-query";
import { cacheService } from "../../core/cache/cacheService";
import { useTranslation, SupportedLanguage } from "../../i18n";

const AUDIO_LANG_OPTIONS: SelectionOption<string>[] = [
  { id: "fr", label: "Français", subtitle: "Piste audio française prioritaire" },
  { id: "en", label: "Anglais", subtitle: "Piste audio anglaise" },
  { id: "ja", label: "Japonais", subtitle: "Idéal pour les animations et animes" },
  { id: "es", label: "Espagnol", subtitle: "Piste audio espagnole" },
  { id: "de", label: "Allemand", subtitle: "Piste audio allemande" },
  { id: "auto", label: "Original / Auto", subtitle: "Piste par défaut du média" }
];

const SUBTITLE_LANG_OPTIONS: SelectionOption<string>[] = [
  { id: "fr", label: "Français", subtitle: "Sous-titres complets en français" },
  { id: "en", label: "Anglais", subtitle: "Sous-titres en anglais" },
  { id: "es", label: "Espagnol", subtitle: "Sous-titres en espagnol" },
  { id: "none", label: "Désactivés", subtitle: "Aucun sous-titre par défaut" }
];

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

const PLAYBACK_SPEED_OPTIONS: SelectionOption<number>[] = [
  { id: 1.0, label: "1.0x", subtitle: "Vitesse standard" },
  { id: 1.25, label: "1.25x", subtitle: "Légère accélération" },
  { id: 1.5, label: "1.5x", subtitle: "Visionnage rapide" }
];

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, language, setLanguage, languages } = useTranslation();

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

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [showSubtitleStyleModal, setShowSubtitleStyleModal] = useState(false);
  const [activePicker, setActivePicker] = useState<
    "language" | "audio" | "sub" | "subMode" | "speed" | "downloadQuality" | null
  >(null);

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
          onPress: async () => {
            hapticService.impactHeavy();
            try {
              const result = await cacheService.clearAllCaches(queryClient);
              Alert.alert(
                "Cache libéré",
                result.tempFilesCleared > 0
                  ? `Le cache temporaire a été vidé avec succès (${result.tempFilesCleared} fichier${result.tempFilesCleared > 1 ? "s" : ""} supprimé${result.tempFilesCleared > 1 ? "s" : ""}).`
                  : "Le cache temporaire et les miniatures ont été vidés avec succès."
              );
            } catch {
              Alert.alert("Erreur", "Impossible de vider complètement le cache.");
            }
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

  const handleRemoveAccount = (serverId: string, userId: string, userName: string) => {
    hapticService.impactLight();
    Alert.alert(
      "Retirer ce compte ?",
      `Le compte « ${userName} » sera retiré de FINORA. Vous pourrez toujours vous reconnecter plus tard.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer",
          style: "destructive",
          onPress: async () => {
            await removeAccount(serverId, userId);
          }
        }
      ]
    );
  };

  const currentLanguageOption = languages.find((l) => l.code === language) || languages[0];
  const languageLabel = `${currentLanguageOption.flag} ${currentLanguageOption.nativeName}`;
  const audioLabel = AUDIO_LANG_OPTIONS.find((o) => o.id === preferences.preferredAudioLanguage)?.label || preferences.preferredAudioLanguage;
  const subtitleLabel = SUBTITLE_LANG_OPTIONS.find((o) => o.id === preferences.preferredSubtitleLanguage)?.label || preferences.preferredSubtitleLanguage;
  const subtitleModeLabel = SUBTITLE_MODE_OPTIONS.find((o) => o.id === preferences.subtitleMode)?.label || preferences.subtitleMode;
  const downloadQualityLabel = DOWNLOAD_QUALITY_OPTIONS.find((o) => o.id === preferences.defaultDownloadQuality)?.label || preferences.defaultDownloadQuality;
  const speedLabel = `${preferences.playbackSpeed || 1.0}x`;

  return (
    <FinoraScreen safeBottom={false}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={styles.pageTitle}>{t("settings.title")}</Text>
        </View>

        <SettingsSection title={t("settings.accountSection")}>
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
            iconColor={colors.textSecondary}
            title={t("settings.switchServer")}
            value={session ? t("settings.connected") : t("settings.notConnected")}
            onPress={() => setShowConnectModal(true)}
          />

          {savedAccounts.length > 1 ? (
            <View style={styles.savedAccountsContainer}>
              <Text style={styles.subCategoryHeader}>{t("settings.savedAccounts")}</Text>
              {savedAccounts.map((acc, idx) => {
                const isActive = session?.serverId === acc.serverId && session?.userId === acc.userId;
                return (
                  <View
                    key={`${acc.serverId}-${acc.userId}`}
                    style={[styles.accountItemRow, idx > 0 && styles.accountBorder]}
                  >
                    <Pressable
                      style={styles.accountMainAction}
                      disabled={isActive}
                      onPress={() => {
                        hapticService.selection();
                        switchAccount(acc.serverId, acc.userId);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive, disabled: isActive }}
                      accessibilityLabel={
                        isActive
                          ? t("settings.activeAccount", { username: acc.userName })
                          : t("settings.switchAccountTo", { username: acc.userName })
                      }
                    >
                      <View style={[styles.accountAvatar, isActive && styles.accountAvatarActive]}>
                        <Ionicons
                          name={isActive ? "checkmark" : "person-outline"}
                          size={18}
                          color={isActive ? "#FFFFFF" : colors.textSecondary}
                        />
                      </View>
                      <View style={styles.accountTextContainer}>
                        <Text style={[styles.accountName, isActive && styles.accountNameActive]} numberOfLines={1}>
                          {acc.userName}
                        </Text>
                        <Text style={styles.accountUrl} numberOfLines={1}>
                          {acc.serverUrl}
                        </Text>
                      </View>
                      {!isActive ? (
                        <Ionicons name="swap-horizontal-outline" size={18} color={colors.textSecondary} />
                      ) : null}
                    </Pressable>

                    {!isActive ? (
                      <Pressable
                        style={styles.accountRemoveButton}
                        onPress={() => handleRemoveAccount(acc.serverId, acc.userId, acc.userName)}
                        accessibilityRole="button"
                        accessibilityLabel={t("settings.removeAccount", { username: acc.userName })}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          <SettingsRow
            iconName="pulse-outline"
            iconColor="#FFB800"
            title={t("settings.diagnostics")}
            onPress={() => setShowDiagModal(true)}
          />

          {session ? (
            <SettingsRow
              iconName="log-out-outline"
              title={t("settings.logout")}
              destructive
              showChevron={false}
              isLast
              onPress={handleLogout}
            />
          ) : null}
        </SettingsSection>

        <SettingsSection title={t("settings.playbackSpeed")}>
          <SettingsRow
            iconName="volume-medium-outline"
            iconColor={colors.primary}
            title={t("settings.preferredAudioLanguage")}
            value={audioLabel}
            onPress={() => setActivePicker("audio")}
          />

          <SettingsSwitchRow
            iconName="play-skip-forward-outline"
            iconColor={colors.primary}
            title={t("settings.autoSkipIntro")}
            value={preferences.autoSkipIntro}
            onValueChange={setAutoSkipIntro}
          />

          <SettingsRow
            iconName="speedometer-outline"
            iconColor={colors.primary}
            title={t("settings.playbackSpeed")}
            value={speedLabel}
            isLast
            onPress={() => setActivePicker("speed")}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.subtitleStyle")}>
          <SettingsRow
            iconName="chatbubble-ellipses-outline"
            iconColor={colors.textSecondary}
            title={t("settings.preferredSubtitleLanguage")}
            value={subtitleLabel}
            onPress={() => setActivePicker("sub")}
          />

          <SettingsRow
            iconName="options-outline"
            iconColor={colors.textSecondary}
            title={t("settings.subtitleMode")}
            value={subtitleModeLabel}
            onPress={() => setActivePicker("subMode")}
          />

          <SettingsRow
            iconName="color-wand-outline"
            iconColor={colors.textSecondary}
            title={t("settings.subtitleStyle")}
            isLast
            onPress={() => setShowSubtitleStyleModal(true)}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.downloadsSection")}>
          <SettingsRow
            iconName="film-outline"
            iconColor={colors.textSecondary}
            title={t("settings.defaultDownloadQuality")}
            value={downloadQualityLabel}
            onPress={() => setActivePicker("downloadQuality")}
          />

          <SettingsSwitchRow
            iconName="wifi-outline"
            iconColor={colors.textSecondary}
            title={t("settings.wifiOnly")}
            value={preferences.downloadWifiOnly}
            onValueChange={setDownloadWifiOnly}
          />

          <SettingsRow
            iconName="folder-open-outline"
            iconColor={colors.textSecondary}
            title={t("settings.downloadsSection")}
            onPress={() => router.push("/(tabs)/downloads")}
          />

          <SettingsRow
            iconName="trash-outline"
            iconColor={colors.textSecondary}
            title={t("settings.clearImageCache")}
            isLast
            onPress={handleClearCache}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.notificationsSection")}>
          <SettingsSwitchRow
            iconName="notifications-outline"
            iconColor={colors.primary}
            title={t("settings.notificationsEnabled")}
            value={notifPreferences.enabled}
            onValueChange={handleToggleGlobalNotifs}
            isLast={!notifPreferences.enabled}
          />

          {notifPreferences.enabled ? (
            <>
              <SettingsSwitchRow
                iconName="tv-outline"
                iconColor={colors.textSecondary}
                title="Épisodes de mes séries"
                value={notifPreferences.newEpisodes}
                onValueChange={(val) => updateNotifPreferences({ newEpisodes: val })}
              />

              <SettingsSwitchRow
                iconName="film-outline"
                iconColor={colors.textSecondary}
                title="Nouveaux films ajoutés"
                value={notifPreferences.newMovies}
                onValueChange={(val) => updateNotifPreferences({ newMovies: val })}
              />

              <SettingsSwitchRow
                iconName="sparkles-outline"
                iconColor={colors.textSecondary}
                title="Nouvelles séries ajoutées"
                value={notifPreferences.newSeries}
                onValueChange={(val) => updateNotifPreferences({ newSeries: val })}
              />

              <SettingsSwitchRow
                iconName="arrow-down-circle-outline"
                iconColor={colors.textSecondary}
                title="Téléchargements terminés"
                value={notifPreferences.downloadsCompleted}
                onValueChange={(val) => updateNotifPreferences({ downloadsCompleted: val })}
              />

              <SettingsRow
                iconName="paper-plane-outline"
                iconColor={colors.textSecondary}
                title="Tester une notification"
                showChevron={false}
                isLast
                onPress={handleSendTestNotification}
              />
            </>
          ) : null}
        </SettingsSection>

        <SettingsSection title={t("settings.preferencesSection")}>
          <SettingsRow
            iconName="language-outline"
            iconColor={colors.primary}
            title={t("settings.appLanguage")}
            subtitle={t("settings.appLanguageSubtitle")}
            value={languageLabel}
            onPress={() => setActivePicker("language")}
          />

          <SettingsSwitchRow
            iconName="phone-portrait-outline"
            iconColor={colors.textSecondary}
            title={t("settings.hapticFeedback")}
            value={preferences.hapticsEnabled}
            onValueChange={setHapticsEnabled}
          />

          <SettingsRow
            iconName="hardware-chip-outline"
            iconColor={colors.textSecondary}
            title="Moteur"
            value="ExoPlayer"
            showChevron={false}
          />

          <SettingsRow
            iconName="information-circle-outline"
            iconColor={colors.textSecondary}
            title={t("settings.appVersion")}
            value="1.0.0"
            showChevron={false}
          />

          <SettingsRow
            iconName="sparkles-outline"
            iconColor={colors.primary}
            title="Revoir la présentation FINORA"
            subtitle="Relancer la présentation de bienvenue"
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

      <SelectionPickerModal
        visible={activePicker === "language"}
        title={t("settings.selectLanguageModalTitle")}
        options={languages.map((l) => ({
          id: l.code,
          label: l.nativeName,
          subtitle: l.label,
          badge: l.flag
        }))}
        selectedValue={language}
        onSelect={(newLang) => {
          hapticService.selection();
          setLanguage(newLang as SupportedLanguage);
        }}
        onClose={() => setActivePicker(null)}
      />

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

      <ServerConnectModal
        visible={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />

      <ServerDiagnosticsModal
        visible={showDiagModal}
        onClose={() => setShowDiagModal(false)}
      />

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
    paddingBottom: 120
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
    color: colors.textMuted,
    marginTop: 2
  },
  savedAccountsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "#161622",
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E28"
  },
  subCategoryHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
    marginLeft: 4
  },
  accountItemRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center"
  },
  accountBorder: {
    borderTopWidth: 1,
    borderTopColor: "#20202E"
  },
  accountMainAction: {
    flex: 1,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingRight: 8
  },
  accountAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  accountAvatarActive: {
    backgroundColor: colors.primary
  },
  accountTextContainer: {
    flex: 1,
    marginRight: 8
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
    color: colors.textSecondary,
    marginTop: 2
  },
  accountRemoveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)"
  }
});
