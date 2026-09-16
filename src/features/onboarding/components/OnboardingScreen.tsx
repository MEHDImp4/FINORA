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
import { colors } from "../../../design-system/tokens";
import { DEFAULT_JELLYFIN_SERVER, validateAndDiscoverServer } from "../../../core/jellyfin/serverDiscovery";
import { useAuthStore } from "../../../stores/authStore";
import { useOnboardingStore } from "../../../stores/onboardingStore";
import { useServerStore } from "../../../stores/serverStore";
import { serverManager } from "../../../core/jellyfin/serverManager";
import { hapticService } from "../../../core/feedback/hapticService";
import { useTranslation, SupportedLanguage } from "../../../i18n";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOTAL_SLIDES = 4;
const LAST_SLIDE_INDEX = TOTAL_SLIDES - 1;

export interface OnboardingScreenProps {
  onCompleted?: () => void;
}

export function OnboardingScreen({ onCompleted }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const { t, language, setLanguage, languages } = useTranslation();

  const [serverUrl, setServerUrl] = useState(DEFAULT_JELLYFIN_SERVER);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState<"idle" | "success" | "error">("idle");
  const [serverName, setServerName] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const status = useAuthStore((state) => state.status);
  const session = useAuthStore((state) => state.session);
  const login = useAuthStore((state) => state.login);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const loadSavedAccounts = useServerStore((state) => state.loadSavedAccounts);
  const [showSwitchAccount, setShowSwitchAccount] = useState(false);
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
      setServerError((err as Error).message || t("onboarding.serverErrorFallback"));
      hapticService.notificationError();
    } finally {
      setIsTestingServer(false);
    }
  };

  const handleCompleteExistingSession = async () => {
    if (!session) return;
    hapticService.impactLight();
    await completeOnboarding();
    onCompleted?.();
  };

  const handleLoginAndComplete = async () => {
    if (!serverUrl.trim()) {
      setLoginError(t("onboarding.errorMissingServerUrl"));
      return;
    }
    if (!username.trim()) {
      setLoginError(t("onboarding.errorMissingUsername"));
      return;
    }

    setIsSubmitting(true);
    setLoginError(null);

    try {
      const normalized = serverUrl.trim().replace(/\/+$/, "").replace(/\/web(\/.*)?$/i, "");
      const success = await login(
        {
          username: username.trim(),
          password
        },
        normalized
      );

      if (success) {
        hapticService.notificationSuccess();
        const currentSession = useAuthStore.getState().session;
        if (currentSession) {
          await serverManager.saveAccount({
            serverId: currentSession.serverId,
            serverName: serverName || "Jellyfin Server",
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
        setLoginError(err || t("onboarding.errorInvalidCredentials"));
        hapticService.notificationError();
      }
    } catch (err) {
      setLoginError((err as Error).message || t("onboarding.errorCannotConnect"));
      hapticService.notificationError();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <View style={styles.topHeader}>
        <Image
          source={require("../../../../assets/finora-logo-text.png")}
          style={styles.logoHeader}
          contentFit="contain"
          accessibilityLabel="FINORA"
        />
        {currentSlide < LAST_SLIDE_INDEX && (
          <Pressable
            style={styles.skipButton}
            onPress={() => goToSlide(LAST_SLIDE_INDEX)}
            accessibilityRole="button"
            accessibilityLabel={t("onboarding.skip")}
          >
            <Text style={styles.skipButtonText}>{t("onboarding.skip")}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
      >
        {/* Slide 0: Language Selection */}
        <View style={styles.slide}>
          <View style={styles.slideContent}>
            <View style={styles.badgeContainer}>
              <Ionicons name="language-outline" size={15} color={colors.primary} />
              <Text style={styles.badgeText}>{t("onboarding.languageStepBadge")}</Text>
            </View>

            <Text style={styles.slideTitle}>{t("onboarding.languageSelectTitle")}</Text>

            <Text style={styles.slideDescription}>{t("onboarding.languageSelectSubtitle")}</Text>

            <View style={styles.languageCardsList}>
              {languages.map((langOption) => {
                const isSelected = language === langOption.code;
                return (
                  <Pressable
                    key={langOption.code}
                    style={[
                      styles.languageCard,
                      isSelected && styles.languageCardActive
                    ]}
                    onPress={() => {
                      hapticService.selection();
                      setLanguage(langOption.code as SupportedLanguage);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={langOption.label}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={styles.languageFlag}>{langOption.flag}</Text>
                    <View style={styles.languageTexts}>
                      <Text style={styles.languageName}>{langOption.nativeName}</Text>
                      <Text style={styles.languageSubName}>{langOption.label}</Text>
                    </View>
                    <View style={[styles.languageRadio, isSelected && styles.languageRadioActive]}>
                      {isSelected && <View style={styles.languageRadioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Slide 1: Fast & Cinematic Intro */}
        <View style={styles.slide}>
          <View style={styles.slideContent}>
            <View style={styles.badgeContainer}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={styles.badgeText}>{t("onboarding.slide1Badge")}</Text>
            </View>

            <Text style={styles.slideTitle}>
              {t("onboarding.slide1TitlePrefix")}
              <Text style={styles.highlightText}>{t("onboarding.slide1TitleHighlight")}</Text>
            </Text>

            <Text style={styles.slideDescription}>{t("onboarding.slide1Desc")}</Text>

            <View style={styles.featuresPillsRow}>
              <View style={styles.featureMiniPill}>
                <Ionicons name="flash-outline" size={16} color="#FFB800" />
                <Text style={styles.featureMiniText}>{t("onboarding.fastPill")}</Text>
              </View>
              <View style={styles.featureMiniPill}>
                <Ionicons name="film-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.featureMiniText}>{t("onboarding.directPlayPill")}</Text>
              </View>
              <View style={styles.featureMiniPill}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#34C759" />
                <Text style={styles.featureMiniText}>{t("onboarding.privatePill")}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Slide 2: Playback & Downloads */}
        <View style={styles.slide}>
          <View style={styles.slideContent}>
            <View style={styles.badgeContainer}>
              <Ionicons name="play-circle" size={14} color={colors.primary} />
              <Text style={styles.badgeText}>{t("onboarding.slide2Badge")}</Text>
            </View>

            <Text style={styles.slideTitle}>
              {t("onboarding.slide2TitlePrefix")}
              <Text style={styles.highlightText}>{t("onboarding.slide2TitleHighlight")}</Text>
            </Text>

            <Text style={styles.slideDescription}>{t("onboarding.slide2Desc")}</Text>

            <View style={styles.highlightCardsList}>
              <View style={styles.featureHighlightCard}>
                <Ionicons name="play-skip-forward-circle-outline" size={22} color={colors.primary} />
                <View style={styles.featureHighlightTexts}>
                  <Text style={styles.featureHighlightTitle}>{t("onboarding.introsTitle")}</Text>
                  <Text style={styles.featureHighlightDesc}>{t("onboarding.introsDesc")}</Text>
                </View>
              </View>

              <View style={styles.featureHighlightCard}>
                <Ionicons name="cloud-download-outline" size={22} color={colors.textSecondary} />
                <View style={styles.featureHighlightTexts}>
                  <Text style={styles.featureHighlightTitle}>{t("onboarding.offlineTitle")}</Text>
                  <Text style={styles.featureHighlightDesc}>{t("onboarding.offlineDesc")}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Slide 3: Server Connection */}
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
                <Ionicons name="server" size={14} color={colors.primary} />
                <Text style={styles.badgeText}>{t("onboarding.slide3Badge")}</Text>
              </View>

              {status === "authenticated" && session && !showSwitchAccount ? (
                <>
                  <Text style={styles.connectionTitle}>
                    {t("onboarding.welcomeBackUser", { username: session.userName || "User" })}
                  </Text>
                  <Text style={styles.connectionSubtitle}>
                    {t("onboarding.sessionReadyDesc")}
                  </Text>

                  <View style={styles.activeSessionCard}>
                    <View style={styles.activeSessionRow}>
                      <View style={styles.activeSessionAvatar}>
                        <Ionicons name="person" size={22} color="#FFFFFF" />
                      </View>
                      <View style={styles.activeSessionTexts}>
                        <Text style={styles.activeSessionUser}>
                          {session.userName || "FINORA User"}
                        </Text>
                        <Text style={styles.activeSessionServer} numberOfLines={1}>
                          {session.serverUrl}
                        </Text>
                      </View>
                      <Ionicons name="checkmark-circle" size={22} color="#34C759" />
                    </View>
                  </View>

                  <FinoraButton
                    label={t("onboarding.enterFinora")}
                    variant="primary"
                    size="lg"
                    onPress={handleCompleteExistingSession}
                    style={styles.loginButton}
                  />

                  <Pressable
                    style={styles.secondaryActionButton}
                    onPress={() => setShowSwitchAccount(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t("onboarding.switchAccount")}
                  >
                    <Text style={styles.secondaryActionText}>{t("onboarding.switchAccount")}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.connectionTitle}>{t("onboarding.connectTitle")}</Text>
                  <Text style={styles.connectionSubtitle}>
                    {t("onboarding.connectSubtitle")}
                  </Text>

                  {session && (
                    <Pressable
                      style={styles.returnSessionButton}
                      onPress={() => setShowSwitchAccount(false)}
                      accessibilityRole="button"
                      accessibilityLabel={t("onboarding.keepAccount", { username: session.userName || "" })}
                    >
                      <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
                      <Text style={styles.returnSessionText}>
                        {t("onboarding.keepAccount", { username: session.userName || "" })}
                      </Text>
                    </Pressable>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t("onboarding.serverUrlLabel")}</Text>
                    <View style={styles.inputFieldContainer}>
                      <Ionicons name="globe-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={serverUrl}
                        onChangeText={(val) => {
                          setServerUrl(val);
                          setServerStatus("idle");
                          setServerError(null);
                        }}
                        placeholder={t("onboarding.serverUrlPlaceholder")}
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        accessibilityLabel={t("onboarding.serverUrlLabel")}
                      />
                      <Pressable
                        style={({ pressed }) => [
                          styles.testServerButton,
                          pressed && styles.buttonPressed,
                          (isTestingServer || !serverUrl.trim()) && styles.buttonDisabled
                        ]}
                        onPress={handleTestServer}
                        disabled={isTestingServer || !serverUrl.trim()}
                        accessibilityRole="button"
                        accessibilityLabel={t("onboarding.testServer")}
                      >
                        {isTestingServer ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.testServerText}>{t("onboarding.testServer")}</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>

                  {serverStatus === "success" && (
                    <View style={styles.serverSuccessBanner}>
                      <Ionicons name="checkmark-circle" size={16} color="#34C759" style={{ marginRight: 6 }} />
                      <Text style={styles.serverSuccessText}>
                        {t("onboarding.serverOnline", { name: serverName || "Jellyfin OK" })}
                      </Text>
                    </View>
                  )}
                  {serverStatus === "error" && (
                    <View style={styles.serverErrorBanner}>
                      <Ionicons name="alert-circle" size={16} color="#FF3B30" style={{ marginRight: 6 }} />
                      <Text style={styles.serverErrorText}>{serverError}</Text>
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t("onboarding.usernameLabel")}</Text>
                    <View style={styles.inputFieldContainer}>
                      <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={username}
                        onChangeText={setUsername}
                        placeholder={t("onboarding.usernamePlaceholder")}
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        accessibilityLabel={t("onboarding.usernameLabel")}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t("onboarding.passwordLabel")}</Text>
                    <View style={styles.inputFieldContainer}>
                      <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={password}
                        onChangeText={setPassword}
                        placeholder={t("onboarding.passwordPlaceholder")}
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        accessibilityLabel={t("onboarding.passwordLabel")}
                      />
                    </View>
                  </View>

                  {loginError && (
                    <View style={styles.loginErrorBanner}>
                      <Ionicons name="close-circle" size={16} color="#FF3B30" style={{ marginRight: 6 }} />
                      <Text style={styles.loginErrorText}>{loginError}</Text>
                    </View>
                  )}

                  <FinoraButton
                    label={t("onboarding.loginAndStart")}
                    variant="primary"
                    size="lg"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    onPress={handleLoginAndComplete}
                    style={styles.loginButton}
                  />

                  <Text style={styles.connectionRequirementText}>
                    {t("onboarding.serverRequiredWarning")}
                  </Text>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.paginationDots}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
            <Pressable
              key={idx}
              onPress={() => goToSlide(idx)}
              style={styles.dotTouchTarget}
              accessibilityRole="button"
              accessibilityLabel={`Step ${idx + 1}`}
              accessibilityState={{ selected: currentSlide === idx }}
            >
              <View
                style={[
                  styles.dot,
                  currentSlide === idx ? styles.dotActive : styles.dotInactive
                ]}
              />
            </Pressable>
          ))}
        </View>

        {currentSlide < LAST_SLIDE_INDEX && (
          <FinoraButton
            label={t("onboarding.next")}
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
    backgroundColor: "rgba(229, 9, 20, 0.10)"
  },
  glowBottom: {
    position: "absolute",
    bottom: -100,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255, 255, 255, 0.03)"
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
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  skipButtonText: {
    color: colors.textSecondary,
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
    alignItems: "flex-start",
    width: "100%"
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229, 9, 20, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(229, 9, 20, 0.26)",
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
    letterSpacing: 0.4
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
    color: colors.primary
  },
  slideDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
    marginBottom: 28
  },
  languageCardsList: {
    width: "100%",
    gap: 12
  },
  languageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 24, 34, 0.78)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14
  },
  languageCardActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(229, 9, 20, 0.08)"
  },
  languageFlag: {
    fontSize: 28
  },
  languageTexts: {
    flex: 1
  },
  languageName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  languageSubName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2
  },
  languageRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center"
  },
  languageRadioActive: {
    borderColor: colors.primary
  },
  languageRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary
  },
  featuresPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  featureMiniPill: {
    minHeight: 40,
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
    backgroundColor: "rgba(24, 24, 34, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 14,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    minHeight: 50
  },
  inputIcon: {
    marginRight: 10
  },
  textInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    minHeight: 48
  },
  testServerButton: {
    minHeight: 44,
    minWidth: 68,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonPressed: {
    opacity: 0.8
  },
  buttonDisabled: {
    opacity: 0.45
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
  secondaryActionButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8
  },
  secondaryActionText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600"
  },
  connectionRequirementText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 2,
    paddingHorizontal: 12
  },
  activeSessionCard: {
    backgroundColor: "rgba(24, 24, 34, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20
  },
  activeSessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  activeSessionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(229, 9, 20, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(229, 9, 20, 0.4)",
    alignItems: "center",
    justifyContent: "center"
  },
  activeSessionTexts: {
    flex: 1
  },
  activeSessionUser: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2
  },
  activeSessionServer: {
    color: colors.textSecondary,
    fontSize: 13
  },
  returnSessionButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12
  },
  returnSessionText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600"
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
    minHeight: 70
  },
  paginationDots: {
    flexDirection: "row",
    alignItems: "center"
  },
  dotTouchTarget: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  dot: {
    height: 6,
    borderRadius: 3
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.28)"
  },
  nextButton: {
    minWidth: 130
  }
});
