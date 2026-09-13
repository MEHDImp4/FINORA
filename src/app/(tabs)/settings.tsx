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

// Options de langues audio (Strictement sans emojis)
const AUDIO_LANG_OPTIONS: SelectionOption<string>[] = [
  { id: "fr", label: "Français", subtitle: "Piste audio française prioritaire" },
  { id: "en", label: "Anglais", subtitle: "Piste audio anglaise" },
  { id: "ja", label: "Japonais", subtitle: "Recommandé pour les animations et animes" },
  { id: "es", label: "Espagnol", subtitle: "Piste audio espagnole" },
  { id: "de", label: "Allemand", subtitle: "Piste audio allemande" },
  { id: "auto", label: "Original / Automatique", subtitle: "Conserve la piste par défaut du média" }
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
    label: "Désactivés par défaut",
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
    subtitle: "Idéal pour grand écran ou tablette"
  },
  {
    id: "720p",
    label: "720p HD",
    subtitle: "Compromis idéal taille / netteté sur mobile"
  },
  {
    id: "480p",
    label: "480p SD",
    subtitle: "Économiseur d'espace et stockage réduit"
  }
];

// Vitesse de lecture par défaut
const PLAYBACK_SPEED_OPTIONS: SelectionOption<number>[] = [
  { id: 1.0, label: "1.0x", subtitle: "Vitesse standard normale" },
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

  const handleClearCache = () => {
    hapticService.impactMedium();
    Alert.alert(
      "Vider le cache",
      "Cette action supprime les miniatures et les requêtes mises en cache pour libérer de l'espace.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Vider le cache",
          style: "destructive",
          onPress: () => {
            hapticService.impactHeavy();
            Alert.alert("Cache vidé", "Le cache temporaire a été libéré avec succès.");
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    hapticService.impactHeavy();
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter du serveur Jellyfin actif ?",
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
        {/* Titre Principal */}
        <View style={styles.headerContainer}>
          <Text style={styles.pageTitle}>Paramètres</Text>
          <Text style={styles.pageSubtitle}>Configuration de lecture, serveur et compte</Text>
        </View>

        {/* 1. SERVEUR & COMPTE */}
        <SettingsSection
          title="Serveur et Compte"
          description="Gérez votre session Jellyfin active, vos serveurs enregistrés et l'état de connexion."
        >
          {session ? (
            <View style={styles.sessionHeaderCard}>
              <View style={styles.sessionAvatar}>
                <Ionicons name="person" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionUser}>{session.userName}</Text>
                <Text style={styles.sessionUrl} numberOfLines={1}>
                  {session.serverUrl}
                </Text>
              </View>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusPillText}>En ligne</Text>
              </View>
            </View>
          ) : (
            <View style={styles.disconnectedBanner}>
              <Ionicons name="cloud-offline-outline" size={24} color="#8A8A9E" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.disconnectedTitle}>Non connecté</Text>
                <Text style={styles.disconnectedSubtitle}>Connectez-vous à une instance Jellyfin.</Text>
              </View>
            </View>
          )}

          <SettingsRow
            iconName="add-circle-outline"
            iconColor="#4F8EF7"
            title="Changer ou ajouter un serveur"
            subtitle="Basculer vers une autre instance Jellyfin"
            onPress={() => setShowConnectModal(true)}
          />

          {savedAccounts.length > 1 ? (
            <View style={styles.savedAccountsContainer}>
              <Text style={styles.subCategoryHeader}>Comptes enregistrés</Text>
              {savedAccounts.map((acc, idx) => {
                const isActive = session?.serverId === acc.serverId && session?.userId === acc.userId;
                return (
                  <View key={`${acc.serverId}-${acc.userId}`} style={[styles.accountItemRow, idx > 0 && styles.accountBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.accountName, isActive && styles.accountNameActive]}>
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
            title="Diagnostic de connexion"
            subtitle="Latence ms, sécurité TLS/HTTPS, état de l'API"
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

        {/* 2. LECTURE & AUDIO */}
        <SettingsSection
          title="Lecture et Audio"
          description="Personnalisez vos préférences de lecture audio et de visionnage."
        >
          <SettingsRow
            iconName="volume-medium-outline"
            iconColor="#E50914"
            title="Langue audio préférée"
            subtitle="Priorité automatique pour les films et séries"
            value={audioLabel}
            onPress={() => setActivePicker("audio")}
          />

          <SettingsSwitchRow
            iconName="play-skip-forward-outline"
            iconColor="#E50914"
            title="Passer automatiquement les intros"
            subtitle="Saute automatiquement les génériques au démarrage"
            value={preferences.autoSkipIntro}
            onValueChange={setAutoSkipIntro}
          />

          <SettingsRow
            iconName="speedometer-outline"
            iconColor="#E50914"
            title="Vitesse de lecture standard"
            value={speedLabel}
            isLast
            onPress={() => setActivePicker("speed")}
          />
        </SettingsSection>

        {/* 3. SOUS-TITRES & STYLE */}
        <SettingsSection
          title="Sous-titres"
          description="Langue, mode d'activation et personnalisation graphique."
        >
          <SettingsRow
            iconName="chatbubble-ellipses-outline"
            iconColor="#00E5FF"
            title="Langue des sous-titres"
            value={subtitleLabel}
            onPress={() => setActivePicker("sub")}
          />

          <SettingsRow
            iconName="options-outline"
            iconColor="#00E5FF"
            title="Activation des sous-titres"
            value={subtitleModeLabel}
            onPress={() => setActivePicker("subMode")}
          />

          <SettingsRow
            iconName="color-wand-outline"
            iconColor="#00E5FF"
            title="Personnaliser l'apparence"
            subtitle="Polices, ombres, fonds et opacité des sous-titres"
            isLast
            onPress={() => setShowSubtitleStyleModal(true)}
          />
        </SettingsSection>

        {/* 4. TÉLÉCHARGEMENTS & STOCKAGE */}
        <SettingsSection
          title="Téléchargements et Stockage"
          description="Gestion du stockage hors-ligne et des limites réseau."
        >
          <SettingsRow
            iconName="film-outline"
            iconColor="#4BB543"
            title="Qualité par défaut"
            value={downloadQualityLabel}
            onPress={() => setActivePicker("downloadQuality")}
          />

          <SettingsSwitchRow
            iconName="wifi-outline"
            iconColor="#4BB543"
            title="Télécharger en Wi-Fi uniquement"
            subtitle="Préserve votre forfait de données mobiles"
            value={preferences.downloadWifiOnly}
            onValueChange={setDownloadWifiOnly}
          />

          <SettingsRow
            iconName="folder-open-outline"
            iconColor="#4BB543"
            title="Gérer les téléchargements"
            subtitle="Voir les films et séries stockés hors-ligne"
            onPress={() => router.push("/(tabs)/downloads")}
          />

          <SettingsRow
            iconName="trash-outline"
            iconColor="#8A8A9E"
            title="Vider le cache de l'application"
            subtitle="Supprime les images et métadonnées temporaires"
            isLast
            onPress={handleClearCache}
          />
        </SettingsSection>

        {/* 5. EXPÉRIENCE & SYSTÈME */}
        <SettingsSection
          title="Système et Accessibilité"
          description="Paramètres de retours haptiques et spécifications de l'application."
        >
          <SettingsSwitchRow
            iconName="phone-portrait-outline"
            iconColor="#D1D1E0"
            title="Retours haptiques"
            subtitle="Vibrations subtiles lors des interactions tactiles"
            value={preferences.hapticsEnabled}
            onValueChange={setHapticsEnabled}
          />

          <SettingsRow
            iconName="hardware-chip-outline"
            iconColor="#D1D1E0"
            title="Moteur de lecture"
            value="ExoPlayer / Media3"
            showChevron={false}
          />

          <SettingsRow
            iconName="information-circle-outline"
            iconColor="#D1D1E0"
            title="Version de l'application"
            value="FINORA 1.0.0 (Fabric)"
            showChevron={false}
            isLast
          />
        </SettingsSection>
      </ScrollView>

      {/* Modal Sélecteur Générique */}
      <SelectionPickerModal
        visible={activePicker === "audio"}
        title="Langue audio préférée"
        description="Choisissez la langue audio qui sera sélectionnée par défaut lors du lancement d'un média."
        options={AUDIO_LANG_OPTIONS}
        selectedValue={preferences.preferredAudioLanguage}
        onSelect={setPreferredAudioLanguage}
        onClose={() => setActivePicker(null)}
      />

      <SelectionPickerModal
        visible={activePicker === "sub"}
        title="Langue des sous-titres"
        description="Sélectionnez la langue des sous-titres à charger automatiquement."
        options={SUBTITLE_LANG_OPTIONS}
        selectedValue={preferences.preferredSubtitleLanguage}
        onSelect={setPreferredSubtitleLanguage}
        onClose={() => setActivePicker(null)}
      />

      <SelectionPickerModal
        visible={activePicker === "subMode"}
        title="Mode d'affichage des sous-titres"
        description="Définissez les conditions d'affichage automatique des sous-titres."
        options={SUBTITLE_MODE_OPTIONS}
        selectedValue={preferences.subtitleMode}
        onSelect={setSubtitleMode}
        onClose={() => setActivePicker(null)}
      />

      <SelectionPickerModal
        visible={activePicker === "downloadQuality"}
        title="Qualité de téléchargement"
        description="Définissez la résolution et le format des médias téléchargés pour l'accès hors-ligne."
        options={DOWNLOAD_QUALITY_OPTIONS}
        selectedValue={preferences.defaultDownloadQuality}
        onSelect={setDefaultDownloadQuality}
        onClose={() => setActivePicker(null)}
      />

      <SelectionPickerModal
        visible={activePicker === "speed"}
        title="Vitesse de lecture"
        description="Vitesse standard lors du démarrage de la vidéo."
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
    marginBottom: spacing.xl,
    marginTop: spacing.sm
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#8A8A9E",
    marginTop: 4
  },
  sessionHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E28"
  },
  sessionAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md
  },
  sessionUser: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  sessionUrl: {
    fontSize: 12,
    color: "#8A8A9E",
    marginTop: 2
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(75, 181, 67, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(75, 181, 67, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4BB543",
    marginRight: 6
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4BB543"
  },
  disconnectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E28"
  },
  disconnectedTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#D1D1E0"
  },
  disconnectedSubtitle: {
    fontSize: 12,
    color: "#8A8A9E",
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
