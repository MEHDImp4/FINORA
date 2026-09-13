import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Dimensions,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FinoraButton } from "../../../design-system/components/FinoraButton";
import { colors, spacing } from "../../../design-system/tokens";
import { glass } from "../../../design-system/tokens/glass";
import { DEFAULT_JELLYFIN_SERVER, validateAndDiscoverServer } from "../../../core/jellyfin/serverDiscovery";
import { useAuthStore } from "../../../stores/authStore";
import { useOnboardingStore } from "../../../stores/onboardingStore";
import { useServerStore } from "../../../stores/serverStore";
import { serverManager } from "../../../core/jellyfin/serverManager";
import { hapticService } from "../../../core/feedback/hapticService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface OnboardingScreenProps {
  onCompleted?: () => void;
}

export function OnboardingScreen({ onCompleted }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Form State for Jellyfin Connection
  const [serverUrl, setServerUrl] = useState(DEFAULT_JELLYFIN_SERVER);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState<"idle" | "success" | "error">("idle");
  const [serverName, setServerName] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Auth & Onboarding stores
  const login = useAuthStore((state) => state.login);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const loadSavedAccounts = useServerStore((state) => state.loadSavedAccounts);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (page !== currentSlide) {
      setCurrentSlide(page);
    }
  };

  const goToSlide = (slideIndex: number) => {
    hapticService.selection();
    scrollViewRef.current?.scrollTo({
      x: slideIndex * SCREEN_WIDTH,
      animated: true
    });
    setCurrentSlide(slideIndex);
  };

  const handleTestServer = async () => {
    if (!serverUrl.trim()) return;
    setIsTestingServer(true);
    setServerError(null);
    setServerStatus("idle");
    try {
      const discovery = await validateAndDiscoverServer(serverUrl.trim());
      setServerStatus("success");
      setServerName(discovery.serverName);
      hapticService.impactMedium();
    } catch (err) {
      setServerStatus("error");
      setServerError((err as Error).message || "Serveur injoignable");
      hapticService.notificationError();
    } finally {
      setIsTestingServer(false);
    }
  };

  const handleFinishWithoutAccount = async () => {
    hapticService.impactLight();
    await completeOnboarding();
    onCompleted?.();
  };

  const handleLoginAndComplete = async () => {
    if (!serverUrl.trim()) {
      setLoginError("Veuillez spécifier l'adresse du serveur Jellyfin.");
      return;
    }
    if (!username.trim()) {
      setLoginError("Veuillez renseigner votre nom d'utilisateur.");
      return;
    }

    setIsSubmitting(true);
    setLoginError(null);

    try {
      const normalized = serverUrl.trim().replace(/\/+$/, "").replace(/\/web(\/.*)?$/i, "");
      const success = await login(
        {
          username: username.trim(),
          password: password
        },
        normalized
      );

      if (success) {
        hapticService.notificationSuccess();
        const currentSession = useAuthStore.getState().session;
        if (currentSession) {
          await serverManager.saveAccount({
            serverId: currentSession.serverId,
            serverName: serverName || "Serveur Jellyfin",
            serverUrl: currentSession.serverUrl,
            userId: currentSession.userId,
            userName: currentSession.userName,
            lastUsedAt: Date.now()
          });
        }
        await loadSavedAccounts();
        await completeOnboarding();
        onCompleted?.();
      } else {
        const err = useAuthStore.getState().errorMessage;
        setLoginError(err || "Échec de connexion. Vérifiez vos identifiants.");
        hapticService.notificationError();
      }
    } catch (err) {
      setLoginError((err as Error).message || "Impossible de se connecter au serveur.");
      hapticService.notificationError();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Background Ambience Glow */}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <Image
          source={require("../../../../assets/finora-logo-text.png")}
          style={styles.logoHeader}
          contentFit="contain"
          accessibilityLabel="FINORA"
        />
        {currentSlide < 2 && (
          <Pressable
            style={styles.skipButton}
            onPress={() => goToSlide(2)}
            accessibilityRole="button"
            accessibilityLabel="Passer la présentation"
          >
            <Text style={styles.skipButtonText}>Passer</Text>
          </Pressable>
        )}
      </View>

      {/* Slides Horizontal ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
      >
        {/* SLIDE 1 : Bienvenue & Vision */}
        <View style={styles.slide}>
          <View style={styles.slideContent}>
            <View style={styles.badgeContainer}>
              <Ionicons name="sparkles" size={14} color="#E50914" />
              <Text style={styles.badgeText}>Streaming Haute Fidélité</Text>
            </View>

            <Text style={styles.slideTitle}>
              Votre univers cinématique{"\n"}
              <Text style={styles.highlightText}>sans compromis.</Text>
            </Text>

            <Text style={styles.slideDescription}>
              FINORA transforme votre serveur personnel Jellyfin en une expérience de streaming d'une fluidité absolue jusqu'à 120 FPS, digne des plus grands services premium.
            </Text>

            <View style={styles.featuresPillsRow}>
              <View style={styles.featureMiniPill}>
                <Ionicons name="flash-outline" size={16} color="#FFB800" />
                <Text style={styles.featureMiniText}>Ultra Réactif</Text>
              </View>
              <View style={styles.featureMiniPill}>
                <Ionicons name="film-outline" size={16} color="#4F8EF7" />
                <Text style={styles.featureMiniText}>Qualité Directe</Text>
              </View>
              <View style={styles.featureMiniPill}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#34C759" />
                <Text style={styles.featureMiniText}>100% Privé</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SLIDE 2 : Lecteur & Expérience */}
        <View style={styles.slide}>
          <View style={styles.slideContent}>
            <View style={styles.badgeContainer}>
              <Ionicons name="play-circle" size={14} color="#E50914" />
              <Text style={styles.badgeText}>Lecteur Intelligent</Text>
            </View>

            <Text style={styles.slideTitle}>
              Contrôle total{"\n"}
              <Text style={styles.highlightText}>au bout des doigts.</Text>
            </Text>

            <Text style={styles.slideDescription}>
              Profitez du saut d'intro dynamique, du choix automatique de vos pistes audio et sous-titres préférés, ainsi que du téléchargement hors-ligne sécurisé.
            </Text>

            <View style={styles.highlightCardsList}>
              <View style={styles.featureHighlightCard}>
                <Ionicons name="fast-food-outline" size={20} color="#E50914" style={{ display: "none" }} />
                <Ionicons name="play-skip-forward-circle-outline" size={22} color="#E50914" />
                <View style={styles.featureHighlightTexts}>
                  <Text style={styles.featureHighlightTitle}>Saut d'introduction & crédits</Text>
                  <Text style={styles.featureHighlightDesc}>Reprenez instantanément le fil de vos épisodes.</Text>
                </View>
              </View>

              <View style={styles.featureHighlightCard}>
                <Ionicons name="cloud-download-outline" size={22} color="#4F8EF7" />
                <View style={styles.featureHighlightTexts}>
                  <Text style={styles.featureHighlightTitle}>Visionnage hors-connexion</Text>
                  <Text style={styles.featureHighlightDesc}>Emportez vos films et séries partout avec vous.</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* SLIDE 3 : Serveur & Connexion */}
        <View style={styles.slide}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.connectionKeyboardAvoid}
          >
            <ScrollView
              contentContainerStyle={styles.connectionScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.badgeContainer}>
                <Ionicons name="server" size={14} color="#E50914" />
                <Text style={styles.badgeText}>Connexion au Serveur</Text>
              </View>

              <Text style={styles.connectionTitle}>Connectez votre Jellyfin</Text>
              <Text style={styles.connectionSubtitle}>
                Le serveur par défaut est pré-rempli. Saisissez vos identifiants pour démarrer.
              </Text>

              {/* Server URL Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Serveur Jellyfin</Text>
                <View style={styles.inputFieldContainer}>
                  <Ionicons name="globe-outline" size={18} color="#8A8A9E" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={serverUrl}
                    onChangeText={(val) => {
                      setServerUrl(val);
                      setServerStatus("idle");
                      setServerError(null);
                    }}
                    placeholder="https://votre-serveur.com"
                    placeholderTextColor="#666680"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                  <Pressable
                    style={styles.testServerButton}
                    onPress={handleTestServer}
                    disabled={isTestingServer || !serverUrl.trim()}
                  >
                    {isTestingServer ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.testServerText}>Tester</Text>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Server Test Feedback */}
              {serverStatus === "success" && (
                <View style={styles.serverSuccessBanner}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" style={{ marginRight: 6 }} />
                  <Text style={styles.serverSuccessText}>
                    {`Serveur en ligne : ${serverName || "Jellyfin OK"}`}
                  </Text>
                </View>
              )}
              {serverStatus === "error" && (
                <View style={styles.serverErrorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#FF3B30" style={{ marginRight: 6 }} />
                  <Text style={styles.serverErrorText}>{serverError}</Text>
                </View>
              )}

              {/* Username Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom d'utilisateur</Text>
                <View style={styles.inputFieldContainer}>
                  <Ionicons name="person-outline" size={18} color="#8A8A9E" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Votre identifiant"
                    placeholderTextColor="#666680"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mot de passe</Text>
                <View style={styles.inputFieldContainer}>
                  <Ionicons name="lock-closed-outline" size={18} color="#8A8A9E" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Mot de passe (si configuré)"
                    placeholderTextColor="#666680"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Login Error Banner */}
              {loginError && (
                <View style={styles.loginErrorBanner}>
                  <Ionicons name="close-circle" size={16} color="#FF3B30" style={{ marginRight: 6 }} />
                  <Text style={styles.loginErrorText}>{loginError}</Text>
                </View>
              )}

              {/* Submit Button */}
              <FinoraButton
                label="Se connecter et commencer"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                disabled={isSubmitting}
                onPress={handleLoginAndComplete}
                style={styles.loginButton}
              />

              {/* Skip / Guest button */}
              <Pressable
                style={styles.guestButton}
                onPress={handleFinishWithoutAccount}
                accessibilityRole="button"
                accessibilityLabel="Explorer sans compte"
              >
                <Text style={styles.guestButtonText}>Explorer sans se connecter</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ScrollView>

      {/* Bottom Navigation & Indicator */}
      <View style={styles.bottomBar}>
        <View style={styles.paginationDots}>
          {[0, 1, 2].map((idx) => (
            <Pressable
              key={idx}
              onPress={() => goToSlide(idx)}
              style={[
                styles.dot,
                currentSlide === idx ? styles.dotActive : styles.dotInactive
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Étape ${idx + 1}`}
            />
          ))}
        </View>

        {currentSlide < 2 && (
          <FinoraButton
            label="Continuer"
            variant="primary"
            size="md"
            rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
            onPress={() => goToSlide(currentSlide + 1)}
            style={styles.nextButton}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0C"
  },
  glowTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(229, 9, 20, 0.12)",
    filter: "blur(60px)" as any
  },
  glowBottom: {
    position: "absolute",
    bottom: -100,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(79, 142, 247, 0.08)",
    filter: "blur(50px)" as any
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    height: 60
  },
  logoHeader: {
    width: 140,
    height: 44
  },
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)"
  },
  skipButtonText: {
    color: "#8A8A9E",
    fontSize: 13,
    fontWeight: "600"
  },
  carousel: {
    flex: 1
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: "center"
  },
  slideContent: {
    paddingHorizontal: 28,
    justifyContent: "center",
    alignItems: "flex-start"
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229, 9, 20, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(229, 9, 20, 0.28)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 20,
    gap: 6
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 40,
    marginBottom: 16,
    letterSpacing: -0.5
  },
  highlightText: {
    color: "#E50914"
  },
  slideDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: "#8A8A9E",
    marginBottom: 32
  },
  featuresPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  featureMiniPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8
  },
  featureMiniText: {
    color: "#E2E2E8",
    fontSize: 13,
    fontWeight: "600"
  },
  highlightCardsList: {
    width: "100%",
    gap: 14
  },
  featureHighlightCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 24, 34, 0.68)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 18,
    padding: 16,
    gap: 16
  },
  featureHighlightTexts: {
    flex: 1
  },
  featureHighlightTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4
  },
  featureHighlightDesc: {
    color: "#8A8A9E",
    fontSize: 13,
    lineHeight: 18
  },
  connectionKeyboardAvoid: {
    flex: 1,
    width: SCREEN_WIDTH
  },
  connectionScroll: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    justifyContent: "center"
  },
  connectionTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6
  },
  connectionSubtitle: {
    fontSize: 14,
    color: "#8A8A9E",
    lineHeight: 20,
    marginBottom: 20
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#C2C2D0",
    marginBottom: 6
  },
  inputFieldContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 24, 34, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48
  },
  inputIcon: {
    marginRight: 10
  },
  textInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    height: "100%"
  },
  testServerButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  testServerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600"
  },
  serverSuccessBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(52, 199, 89, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(52, 199, 89, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14
  },
  serverSuccessText: {
    color: "#34C759",
    fontSize: 13,
    fontWeight: "600"
  },
  serverErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 59, 48, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14
  },
  serverErrorText: {
    color: "#FF3B30",
    fontSize: 13,
    fontWeight: "500",
    flex: 1
  },
  loginErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 59, 48, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16
  },
  loginErrorText: {
    color: "#FF3B30",
    fontSize: 13,
    fontWeight: "600",
    flex: 1
  },
  loginButton: {
    marginTop: 6,
    marginBottom: 12
  },
  guestButton: {
    alignItems: "center",
    paddingVertical: 10
  },
  guestButtonText: {
    color: "#8A8A9E",
    fontSize: 14,
    fontWeight: "600"
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 16,
    height: 70
  },
  paginationDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  dot: {
    height: 6,
    borderRadius: 3
  },
  dotActive: {
    width: 24,
    backgroundColor: "#E50914"
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.24)"
  },
  nextButton: {
    minWidth: 130
  }
});
