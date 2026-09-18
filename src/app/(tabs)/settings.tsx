import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  Linking
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
import { SwitchProfileModal } from "../../features/settings/components/SwitchProfileModal";
import { hapticService } from "../../core/feedback/hapticService";
import { useNotificationStore } from "../../stores/notificationStore";
import { notificationService } from "../../core/notifications/notificationService";
import { useQueryClient } from "@tanstack/react-query";
import { cacheService } from "../../core/cache/cacheService";
import { useTranslation, SupportedLanguage } from "../../i18n";

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, language, setLanguage, languages } = useTranslation();

  const audioOptions: SelectionOption<string>[] = useMemo(
    () => [
      { id: "fr", label: t("settings.langFrench"), subtitle: t("settings.langFrenchSub") },
      { id: "en", label: t("settings.langEnglish"), subtitle: t("settings.langEnglishSub") },
      { id: "ja", label: t("settings.langJapanese"), subtitle: t("settings.langJapaneseSub") },
      { id: "es", label: t("settings.langSpanish"), subtitle: t("settings.langSpanishSub") },
      { id: "de", label: t("settings.langGerman"), subtitle: t("settings.langGermanSub") },
      { id: "auto", label: t("settings.langAuto"), subtitle: t("settings.langAutoSub") }
    ],
    [t]
  );

  const subtitleOptions: SelectionOption<string>[] = useMemo(
    () => [
      { id: "fr", label: t("settings.subFrench"), subtitle: t("settings.subFrenchDesc") },
      { id: "en", label: t("settings.subEnglish"), subtitle: t("settings.subEnglishDesc") },
      { id: "es", label: t("settings.subSpanish"), subtitle: t("settings.subSpanishDesc") },
      { id: "none", label: t("settings.subNone"), subtitle: t("settings.subNoneDesc") }
    ],
    [t]
  );

  const subtitleModeOptions: SelectionOption<SubtitleMode>[] = useMemo(
    () => [
      {
        id: "smart",
        label: t("settings.subModeSmart"),
        subtitle: t("settings.subModeSmartDesc"),
        badge: t("settings.subModeSmartBadge")
      },
      {
        id: "always",
        label: t("settings.subModeAlways"),
        subtitle: t("settings.subModeAlwaysDesc")
      },
      {
        id: "off",
        label: t("settings.subModeOff"),
        subtitle: t("settings.subModeOffDesc")
      }
    ],
    [t]
  );

  const downloadQualityOptions: SelectionOption<DownloadQuality>[] = useMemo(
    () => [
      {
        id: "original",
        label: t("settings.qualityOriginal"),
        subtitle: t("settings.qualityOriginalDesc"),
        badge: t("settings.qualityOptimalBadge")
      },
      {
        id: "1080p",
        label: t("settings.quality1080p"),
        subtitle: t("settings.quality1080pDesc")
      },
      {
        id: "720p",
        label: t("settings.quality720p"),
        subtitle: t("settings.quality720pDesc")
      },
      {
        id: "480p",
        label: t("settings.quality480p"),
        subtitle: t("settings.quality480pDesc")
      }
    ],
    [t]
  );

  const playbackSpeedOptions: SelectionOption<number>[] = useMemo(
    () => [
      { id: 1.0, label: "1.0x", subtitle: t("settings.speedStandardDesc") },
      { id: 1.25, label: "1.25x", subtitle: t("settings.speedSlightDesc") },
      { id: 1.5, label: "1.5x", subtitle: t("settings.speedFastDesc") }
    ],
    [t]
  );

  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const savedAccounts = useServerStore((state) => state.savedAccounts);
  const loadSavedAccounts = useServerStore((state) => state.loadSavedAccounts);
  const loadSavedServers = useServerStore((state) => state.loadSavedServers);
  const isLocalConnection = useServerStore((state) => state.isLocalConnection);
  const autoDetectActiveConnection = useServerStore((state) => state.autoDetectActiveConnection);
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
  const [showSwitchProfileModal, setShowSwitchProfileModal] = useState(false);
  const [targetServerForProfile, setTargetServerForProfile] = useState<string | undefined>(undefined);
  const [requirePasswordForProfile, setRequirePasswordForProfile] = useState(false);
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [showSubtitleStyleModal, setShowSubtitleStyleModal] = useState(false);
  const [activePicker, setActivePicker] = useState<
    "language" | "audio" | "sub" | "subMode" | "speed" | "downloadQuality" | null
  >(null);

  useEffect(() => {
    loadSavedAccounts();
    loadSavedServers();
    if (session?.serverUrl) {
      autoDetectActiveConnection(session.serverId);
    }
  }, [loadSavedAccounts, loadSavedServers, autoDetectActiveConnection, session?.serverId, session?.serverUrl]);

  const notifPreferences = useNotificationStore((state) => state.preferences);
  const updateNotifPreferences = useNotificationStore((state) => state.updatePreferences);

  const handleToggleGlobalNotifs = async (enabled: boolean) => {
    if (enabled) {
      const granted = await notificationService.requestPermissions();
      if (!granted) {
        Alert.alert(
          t("settings.notificationsPermissionTitle"),
          t("settings.notificationsPermissionDesc")
        );
        return;
      }
    }
    updateNotifPreferences({ enabled });
  };

  const handleClearCache = () => {
    hapticService.impactMedium();
    Alert.alert(
      t("settings.clearCacheConfirmTitle"),
      t("settings.clearCacheConfirmDesc"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.clearCacheButton"),
          style: "destructive",
          onPress: async () => {
            hapticService.impactHeavy();
            try {
              const result = await cacheService.clearAllCaches(queryClient);
              Alert.alert(
                t("settings.cacheClearedTitle"),
                result.tempFilesCleared > 0
                  ? t("settings.cacheClearedDesc", { count: result.tempFilesCleared })
                  : t("settings.clearCacheSuccessNoCount")
              );
            } catch {
              Alert.alert(t("settings.cacheClearedErrorTitle"), t("settings.cacheClearedErrorDesc"));
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    hapticService.impactHeavy();
    Alert.alert(
      t("settings.logoutConfirmTitle"),
      t("settings.logoutConfirmDesc"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.logout"),
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
      t("settings.removeAccountConfirmTitle"),
      t("settings.removeAccountConfirmDesc", { username: userName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.removeButton"),
          style: "destructive",
          onPress: async () => {
            await removeAccount(serverId, userId);
          }
        }
      ]
    );
  };

  const handleOpenExternalUrl = async (url: string) => {
    hapticService.impactLight();
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t("common.error"), t("settings.cannotOpenUrl"));
      }
    } catch {
      Alert.alert(t("common.error"), t("settings.cannotOpenUrl"));
    }
  };

  const currentLanguageOption = languages.find((l) => l.code === language) || languages[0];
  const languageLabel = `${currentLanguageOption.flag} ${currentLanguageOption.nativeName}`;
  const audioLabel = audioOptions.find((o) => o.id === preferences.preferredAudioLanguage)?.label || preferences.preferredAudioLanguage;
  const subtitleLabel = subtitleOptions.find((o) => o.id === preferences.preferredSubtitleLanguage)?.label || preferences.preferredSubtitleLanguage;
  const subtitleModeLabel = subtitleModeOptions.find((o) => o.id === preferences.subtitleMode)?.label || preferences.subtitleMode;
  const downloadQualityLabel = downloadQualityOptions.find((o) => o.id === preferences.defaultDownloadQuality)?.label || preferences.defaultDownloadQuality;
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

          {session ? (
            <SettingsRow
              iconName="people-outline"
              iconColor={colors.primary}
              title={t("settings.switchProfile")}
              subtitle={t("settings.switchProfileSubtitle")}
              onPress={() => setShowSwitchProfileModal(true)}
            />
          ) : null}

          <SettingsRow
            iconName="server-outline"
            iconColor={colors.textSecondary}
            title={t("settings.switchServer")}
            subtitle={
              session
                ? isLocalConnection
                  ? `⚡ ${t("settings.connectionTypeLocal")}`
                  : `🌐 ${t("settings.connectionTypeRemote")}`
                : undefined
            }
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

        <SettingsSection title={t("settings.playbackSection")}>
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

        <SettingsSection title={t("settings.subtitlesSection")}>
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
            title={t("settings.manageDownloads")}
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
                title={t("settings.notifEpisodesOfMySeries")}
                value={notifPreferences.newEpisodes}
                onValueChange={(val) => updateNotifPreferences({ newEpisodes: val })}
              />

              <SettingsSwitchRow
                iconName="film-outline"
                iconColor={colors.textSecondary}
                title={t("settings.notifNewMoviesAdded")}
                value={notifPreferences.newMovies}
                onValueChange={(val) => updateNotifPreferences({ newMovies: val })}
              />

              <SettingsSwitchRow
                iconName="sparkles-outline"
                iconColor={colors.textSecondary}
                title={t("settings.notifNewSeriesAdded")}
                value={notifPreferences.newSeries}
                onValueChange={(val) => updateNotifPreferences({ newSeries: val })}
              />

              <SettingsSwitchRow
                iconName="arrow-down-circle-outline"
                iconColor={colors.textSecondary}
                title={t("settings.notifDownloadsCompleted")}
                value={notifPreferences.downloadsCompleted}
                onValueChange={(val) => updateNotifPreferences({ downloadsCompleted: val })}
                isLast
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
            title={t("settings.engine")}
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
            title={t("settings.replayOnboarding")}
            subtitle={t("settings.replayOnboardingDesc")}
            showChevron
            isLast
            onPress={() => {
              hapticService.impactLight();
              Alert.alert(
                t("settings.replayOnboardingConfirmTitle"),
                t("settings.replayOnboardingConfirmDesc"),
                [
                  { text: t("common.cancel"), style: "cancel" },
                  {
                    text: t("settings.replayButton"),
                    onPress: async () => {
                      await useOnboardingStore.getState().resetOnboarding();
                    }
                  }
                ]
              );
            }}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.communitySection")}>
          <SettingsRow
            iconName="bug-outline"
            iconColor="#FF6B6B"
            title={t("settings.reportBug")}
            subtitle={t("settings.reportBugDesc")}
            showChevron
            onPress={() =>
              handleOpenExternalUrl("https://github.com/MEHDImp4/FINORA/issues/new?template=bug_report.yml")
            }
          />

          <SettingsRow
            iconName="bulb-outline"
            iconColor="#FFB800"
            title={t("settings.suggestFeature")}
            subtitle={t("settings.suggestFeatureDesc")}
            showChevron
            onPress={() =>
              handleOpenExternalUrl("https://github.com/MEHDImp4/FINORA/issues/new?template=feature_request.yml")
            }
          />

          <SettingsRow
            iconName="logo-github"
            iconColor="#FFFFFF"
            title={t("settings.githubRepo")}
            subtitle={t("settings.githubRepoDesc")}
            showChevron
            isLast
            onPress={() => handleOpenExternalUrl("https://github.com/MEHDImp4/FINORA")}
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
        title={t("settings.audioLanguageModalTitle")}
        options={audioOptions}
        selectedValue={preferences.preferredAudioLanguage}
        onSelect={setPreferredAudioLanguage}
        onClose={() => setActivePicker(null)}
      />

      <SelectionPickerModal
        visible={activePicker === "sub"}
        title={t("settings.subtitlesModalTitle")}
        options={subtitleOptions}
        selectedValue={preferences.preferredSubtitleLanguage}
        onSelect={setPreferredSubtitleLanguage}
        onClose={() => setActivePicker(null)}
      />

      <SelectionPickerModal
        visible={activePicker === "subMode"}
        title={t("settings.subtitleModeModalTitle")}
        options={subtitleModeOptions}
        selectedValue={preferences.subtitleMode}
        onSelect={setSubtitleMode}
        onClose={() => setActivePicker(null)}
      />

      <SelectionPickerModal
        visible={activePicker === "downloadQuality"}
        title={t("settings.downloadQualityModalTitle")}
        options={downloadQualityOptions}
        selectedValue={preferences.defaultDownloadQuality}
        onSelect={setDefaultDownloadQuality}
        onClose={() => setActivePicker(null)}
      />

      <SelectionPickerModal
        visible={activePicker === "speed"}
        title={t("settings.playbackSpeedModalTitle")}
        options={playbackSpeedOptions}
        selectedValue={preferences.playbackSpeed || 1.0}
        onSelect={setPlaybackSpeed}
        onClose={() => setActivePicker(null)}
      />

      <ServerConnectModal
        visible={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onServerChanged={(newUrl) => {
          setShowConnectModal(false);
          setTargetServerForProfile(newUrl);
          setRequirePasswordForProfile(true);
          setShowSwitchProfileModal(true);
        }}
      />

      <SwitchProfileModal
        visible={showSwitchProfileModal}
        targetServerUrl={targetServerForProfile}
        requirePassword={requirePasswordForProfile}
        onClose={() => {
          setShowSwitchProfileModal(false);
          setTargetServerForProfile(undefined);
          setRequirePasswordForProfile(false);
        }}
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
