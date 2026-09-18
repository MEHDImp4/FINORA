import React, { useState, useRef, useEffect } from "react";
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
  ActivityIndicator,
  Switch,
  Animated
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
import { usePlaybackPreferencesStore, SubtitleMode } from "../../../stores/playbackPreferencesStore";
import { useNotificationStore } from "../../../stores/notificationStore";
import { notificationService } from "../../../core/notifications/notificationService";
import { DownloadQuality } from "../../offline/downloadQuality";
import { serverManager } from "../../../core/jellyfin/serverManager";
import { authRepository, PublicUser } from "../../../core/jellyfin/authRepository";
import { ProfilePickerView } from "../../auth/components/ProfilePickerView";
import { ProfilePasswordModal } from "../../auth/components/ProfilePasswordModal";
import { hapticService } from "../../../core/feedback/hapticService";
import { useTranslation, SupportedLanguage } from "../../../i18n";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOTAL_SLIDES = 4;
const LAST_SLIDE_INDEX = TOTAL_SLIDES - 1;

export interface OnboardingScreenProps {
  onCompleted?: () => void;
}

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: any;
  containerStyle?: any;
  onPress: () => void;
  isSelected?: boolean;
  scaleOnPress?: number;
  accessibilityRole?: any;
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean; checked?: boolean };
}

/**
 * Animated interactive card with spring touch feedback and selection pop
 */
function AnimatedCard({
  children,
  style,
  containerStyle,
  onPress,
  isSelected,
  scaleOnPress = 0.96,
  accessibilityRole = "button",
  accessibilityLabel,
  accessibilityState
}: AnimatedCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevSelected = useRef(isSelected);

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;
    if (isSelected && !prevSelected.current) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.025,
          duration: 90,
          useNativeDriver: true
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 140,
          useNativeDriver: true
        })
      ]).start();
    }
    prevSelected.current = isSelected;
  }, [isSelected, scale]);

  const handlePressIn = () => {
    if (process.env.NODE_ENV === "test") return;
    Animated.spring(scale, {
      toValue: scaleOnPress,
      useNativeDriver: true,
      friction: 6,
      tension: 140
    }).start();
  };

  const handlePressOut = () => {
    if (process.env.NODE_ENV === "test") return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 100
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, containerStyle]}>
      <Pressable
        style={style}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Animated selection radio dot popping into view
 */
function AnimatedRadioDot({ visible, dotStyle }: { visible: boolean; dotStyle: any }) {
  const scale = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;
    if (visible) {
      scale.setValue(0);
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 160,
        useNativeDriver: true
      }).start();
    }
  }, [visible, scale]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        dotStyle,
        { transform: [{ scale }] }
      ]}
    />
  );
}

/**
 * Animated dynamic pagination pill
 */
function AnimatedPaginationDot({
  isActive,
  onPress,
  a11yLabel
}: {
  isActive: boolean;
  onPress: () => void;
  a11yLabel: string;
}) {
  const animWidth = useRef(new Animated.Value(isActive ? 24 : 6)).current;
  const animOpacity = useRef(new Animated.Value(isActive ? 1 : 0.35)).current;

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      animWidth.setValue(isActive ? 24 : 6);
      animOpacity.setValue(isActive ? 1 : 0.35);
      return;
    }
    Animated.parallel([
      Animated.spring(animWidth, {
        toValue: isActive ? 24 : 6,
        friction: 7,
        tension: 80,
        useNativeDriver: false
      }),
      Animated.timing(animOpacity, {
        toValue: isActive ? 1 : 0.35,
        duration: 200,
        useNativeDriver: false
      })
    ]).start();
  }, [isActive, animWidth, animOpacity]);

  return (
    <Pressable
      onPress={onPress}
      style={styles.dotTouchTarget}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View
        style={[
          styles.dot,
          {
            width: animWidth,
            opacity: animOpacity,
            backgroundColor: isActive ? colors.primary : "rgba(255, 255, 255, 0.45)"
          }
        ]}
      />
    </Pressable>
  );
}

export function OnboardingScreen({ onCompleted }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const { t, language, setLanguage, languages } = useTranslation();

  // Smooth slide transition animated values
  const slideAnim = useRef(new Animated.Value(1)).current;
  const slideTranslateY = useRef(new Animated.Value(0)).current;
  const slideScale = useRef(new Animated.Value(1)).current;

  // Next button pulse animation
  const nextButtonScale = useRef(new Animated.Value(1)).current;

  // Ambient breathing glow animation
  const ambientPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientPulse, {
          toValue: 1.15,
          duration: 3500,
          useNativeDriver: true
        }),
        Animated.timing(ambientPulse, {
          toValue: 0.95,
          duration: 3500,
          useNativeDriver: true
        })
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [ambientPulse]);

  const triggerNextButtonPulse = () => {
    Animated.sequence([
      Animated.timing(nextButtonScale, {
        toValue: 1.06,
        duration: 120,
        useNativeDriver: true
      }),
      Animated.spring(nextButtonScale, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: true
      })
    ]).start();
  };

  // Animate content when current slide changes
  const animateSlideChange = (toIndex: number) => {
    slideAnim.setValue(0.25);
    slideTranslateY.setValue(16);
    slideScale.setValue(0.96);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true
      }),
      Animated.spring(slideTranslateY, {
        toValue: 0,
        friction: 7,
        tension: 60,
        useNativeDriver: true
      }),
      Animated.spring(slideScale, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true
      })
    ]).start();
    triggerNextButtonPulse();
  };

  const [serverUrl, setServerUrl] = useState(DEFAULT_JELLYFIN_SERVER);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState<"idle" | "success" | "error">("idle");
  const [serverName, setServerName] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const [publicUsers, setPublicUsers] = useState<PublicUser[]>([]);
  const [selectedProfileForPassword, setSelectedProfileForPassword] = useState<PublicUser | null>(null);
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [isLoadingPublicUsers, setIsLoadingPublicUsers] = useState(false);

  const status = useAuthStore((state) => state.status);
  const session = useAuthStore((state) => state.session);
  const login = useAuthStore((state) => state.login);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const loadSavedAccounts = useServerStore((state) => state.loadSavedAccounts);
  const [showSwitchAccount, setShowSwitchAccount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const playbackPreferences = usePlaybackPreferencesStore((s) => s.preferences);
  const setPreferredAudioLanguage = usePlaybackPreferencesStore((s) => s.setPreferredAudioLanguage);
  const setPreferredSubtitleLanguage = usePlaybackPreferencesStore((s) => s.setPreferredSubtitleLanguage);
  const setSubtitleMode = usePlaybackPreferencesStore((s) => s.setSubtitleMode);
  const setAutoSkipIntro = usePlaybackPreferencesStore((s) => s.setAutoSkipIntro);
  const setDownloadWifiOnly = usePlaybackPreferencesStore((s) => s.setDownloadWifiOnly);
  const defaultDownloadQuality = playbackPreferences.defaultDownloadQuality || "1080p";
  const setDefaultDownloadQuality = usePlaybackPreferencesStore((s) => s.setDefaultDownloadQuality);

  const notifPreferences = useNotificationStore((s) => s.preferences);
  const updateNotifPreferences = useNotificationStore((s) => s.updatePreferences);

  const handleToggleNotifications = async (enabled: boolean) => {
    hapticService.impactLight();
    if (enabled) {
      const granted = await notificationService.requestPermissions();
      if (!granted) {
        updateNotifPreferences({ enabled: false });
        return;
      }
    }
    updateNotifPreferences({ enabled });
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (page !== currentSlide) {
      setCurrentSlide(page);
      animateSlideChange(page);
    }
  };

  const goToSlide = (slideIndex: number) => {
    hapticService.selection();
    scrollViewRef.current?.scrollTo({
      x: slideIndex * SCREEN_WIDTH,
      animated: true
    });
    setCurrentSlide(slideIndex);
    animateSlideChange(slideIndex);
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

      // Scan public user accounts on the validated server
      const targetUrl = discovery.url || serverUrl.trim();
      setServerUrl(targetUrl);
      setIsLoadingPublicUsers(true);
      try {
        const users = await authRepository.getPublicUsers(targetUrl);
        setPublicUsers(users);
        if (users.length > 0) {
          setShowManualLogin(false);
        }
      } catch {
        setPublicUsers([]);
      } finally {
        setIsLoadingPublicUsers(false);
      }
    } catch (err) {
      setServerStatus("error");
      setServerError((err as Error).message || t("onboarding.serverErrorFallback"));
      setPublicUsers([]);
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

  const handleSelectPublicProfile = async (user: PublicUser) => {
    if (!user.hasPassword) {
      setIsSubmitting(true);
      setLoginError(null);
      try {
        const normalized = serverUrl.trim().replace(/\/+$/, "").replace(/\/web(\/.*)?$/i, "");
        const success = await login({ username: user.name, password: "" }, normalized);
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
    } else {
      setSelectedProfileForPassword(user);
    }
  };

  const handleProfilePasswordSubmit = async (password: string) => {
    if (!selectedProfileForPassword) return;
    setIsSubmitting(true);
    setLoginError(null);
    try {
      const normalized = serverUrl.trim().replace(/\/+$/, "").replace(/\/web(\/.*)?$/i, "");
      const success = await login(
        { username: selectedProfileForPassword.name, password },
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
        setSelectedProfileForPassword(null);
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
      <Animated.View
        style={[
          styles.glowTop,
          {
            transform: [{ scale: ambientPulse }],
            opacity: ambientPulse.interpolate({
              inputRange: [0.95, 1.15],
              outputRange: [0.7, 1.0]
            })
          }
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.glowBottom,
          {
            transform: [
              {
                scale: ambientPulse.interpolate({
                  inputRange: [0.95, 1.15],
                  outputRange: [1.1, 0.95]
                })
              }
            ]
          }
        ]}
        pointerEvents="none"
      />

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
        {/* Slide 0: Question 1 — Language Selection */}
        <View style={styles.slide}>
          <Animated.View
            style={[
              styles.slideContent,
              currentSlide === 0 && {
                opacity: slideAnim,
                transform: [
                  { translateY: slideTranslateY },
                  { scale: slideScale }
                ]
              }
            ]}
          >
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
                  <AnimatedCard
                    key={langOption.code}
                    style={[
                      styles.languageCard,
                      isSelected && styles.languageCardActive
                    ]}
                    containerStyle={{ width: "100%" }}
                    isSelected={isSelected}
                    onPress={() => {
                      hapticService.selection();
                      setLanguage(langOption.code as SupportedLanguage);
                      triggerNextButtonPulse();
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
                      <AnimatedRadioDot visible={isSelected} dotStyle={styles.languageRadioDot} />
                    </View>
                  </AnimatedCard>
                );
              })}
            </View>
          </Animated.View>
        </View>

        {/* Slide 1: Question 2 — Playback Style & Automation */}
        <View style={styles.slide}>
          <ScrollView
            style={styles.slideScroll}
            contentContainerStyle={styles.slideScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={
                currentSlide === 1
                  ? {
                      opacity: slideAnim,
                      transform: [
                        { translateY: slideTranslateY },
                        { scale: slideScale }
                      ]
                    }
                  : undefined
              }
            >
              <View style={styles.badgeContainer}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
                <Text style={styles.badgeText}>{t("onboarding.slide1Badge")}</Text>
              </View>

              <Text style={styles.slideTitle}>
                {t("onboarding.question1Title") || t("onboarding.slide1TitlePrefix")}
              </Text>

              <Text style={styles.slideDescription}>
                {t("onboarding.question1Subtitle") || t("onboarding.slide1Desc")}
              </Text>

              {/* Auto Skip Intro Choice Card */}
              <AnimatedCard
                style={[
                  styles.interactiveQuestionCard,
                  playbackPreferences.autoSkipIntro && styles.interactiveQuestionCardActive
                ]}
                containerStyle={{ width: "100%" }}
                isSelected={playbackPreferences.autoSkipIntro}
                onPress={() => {
                  hapticService.impactLight();
                  setAutoSkipIntro(!playbackPreferences.autoSkipIntro);
                  triggerNextButtonPulse();
                }}
                accessibilityRole="switch"
                accessibilityLabel={t("onboarding.autoSkipIntroLabel")}
                accessibilityState={{ checked: playbackPreferences.autoSkipIntro }}
              >
                <View style={styles.cardIconBox}>
                  <Ionicons name="play-skip-forward-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.cardTexts}>
                  <Text style={styles.cardTitle}>{t("onboarding.autoSkipIntroLabel")}</Text>
                  <Text style={styles.cardSubtitle}>{t("onboarding.autoSkipIntroDesc")}</Text>
                </View>
                <Switch
                  value={playbackPreferences.autoSkipIntro}
                  onValueChange={(val) => {
                    hapticService.impactLight();
                    setAutoSkipIntro(val);
                    triggerNextButtonPulse();
                  }}
                  trackColor={{ false: "#2A2A38", true: colors.primary }}
                  thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
                />
              </AnimatedCard>

              {/* Instant Direct Play Feature Showcase */}
              <View style={styles.featureShowcaseCard}>
                <View style={styles.featureShowcaseRow}>
                  <Animated.View
                    style={[
                      styles.cardIconBox,
                      {
                        backgroundColor: "rgba(255, 184, 0, 0.12)",
                        transform: [{ scale: ambientPulse }]
                      }
                    ]}
                  >
                    <Ionicons name="flash-outline" size={20} color="#FFB800" />
                  </Animated.View>
                  <View style={styles.cardTexts}>
                    <Text style={styles.cardTitle}>Direct Play Native 4K / HD</Text>
                    <Text style={styles.cardSubtitle}>
                      Lecture directe sans transcodage inutile avec décodage matériel sur puce.
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={22} color="#34C759" />
                </View>
              </View>

              {/* Preferred Audio Language Chips */}
              <View style={styles.prefSection}>
                <Text style={styles.prefSectionLabel}>{t("onboarding.audioLanguageLabel")}</Text>
                <View style={styles.chipsRow}>
                  {[
                    { id: "fr", label: "Français", flag: "🇫🇷" },
                    { id: "en", label: "English", flag: "🇬🇧" },
                    { id: "ja", label: "日本語", flag: "🇯🇵" },
                    { id: "auto", label: "Original", flag: "🌐" }
                  ].map((item) => {
                    const isSelected = (playbackPreferences.preferredAudioLanguage || "fr") === item.id;
                    return (
                      <AnimatedCard
                        key={item.id}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        containerStyle={{ alignSelf: "flex-start" }}
                        scaleOnPress={0.92}
                        isSelected={isSelected}
                        onPress={() => {
                          hapticService.selection();
                          setPreferredAudioLanguage(item.id);
                          triggerNextButtonPulse();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.label} audio`}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text style={styles.chipFlag}>{item.flag}</Text>
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {item.label}
                        </Text>
                      </AnimatedCard>
                    );
                  })}
                </View>
              </View>

              {/* Subtitles Behavior Question */}
              <View style={styles.prefSection}>
                <Text style={styles.prefSectionLabel}>{t("onboarding.subtitlesModeLabel")}</Text>
                <View style={styles.chipsRow}>
                  {[
                    { id: "smart" as SubtitleMode, label: t("onboarding.subtitlesSmart"), icon: "flash-outline" },
                    { id: "always" as SubtitleMode, label: t("onboarding.subtitlesAlways"), icon: "chatbubble-ellipses-outline" },
                    { id: "off" as SubtitleMode, label: t("onboarding.subtitlesOff"), icon: "close-circle-outline" }
                  ].map((item) => {
                    const isSelected = (playbackPreferences.subtitleMode || "smart") === item.id;
                    return (
                      <AnimatedCard
                        key={item.id}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        containerStyle={{ alignSelf: "flex-start" }}
                        scaleOnPress={0.92}
                        isSelected={isSelected}
                        onPress={() => {
                          hapticService.selection();
                          setSubtitleMode(item.id);
                          triggerNextButtonPulse();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={item.label}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={14}
                          color={isSelected ? colors.primary : "#8A8A9E"}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {item.label}
                        </Text>
                      </AnimatedCard>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </View>

        {/* Slide 2: Question 3 — Offline Downloads */}
        <View style={styles.slide}>
          <ScrollView
            style={styles.slideScroll}
            contentContainerStyle={styles.slideScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={
                currentSlide === 2
                  ? {
                      opacity: slideAnim,
                      transform: [
                        { translateY: slideTranslateY },
                        { scale: slideScale }
                      ]
                    }
                  : undefined
              }
            >
              <View style={styles.badgeContainer}>
                <Ionicons name="play-circle" size={14} color={colors.primary} />
                <Text style={styles.badgeText}>{t("onboarding.slide2Badge")}</Text>
              </View>

              <Text style={styles.slideTitle}>
                {t("onboarding.question3Title") || t("onboarding.slide2TitlePrefix")}
              </Text>

              <Text style={styles.slideDescription}>
                {t("onboarding.question3Subtitle") || t("onboarding.playbackPreferencesSubtitle")}
              </Text>

              {/* Download Quality Selection Cards */}
              <View style={styles.prefSection}>
                <Text style={styles.prefSectionLabel}>{t("onboarding.downloadQualityTitle")}</Text>
                <View style={styles.qualityCardsList}>
                  {([
                    {
                      id: "1080p" as DownloadQuality,
                      title: t("onboarding.quality1080pTitle"),
                      desc: t("onboarding.quality1080pDesc"),
                      badge: t("onboarding.quality1080pBadge")
                    },
                    {
                      id: "720p" as DownloadQuality,
                      title: t("onboarding.quality720pTitle"),
                      desc: t("onboarding.quality720pDesc")
                    },
                    {
                      id: "original" as DownloadQuality,
                      title: t("onboarding.qualityOriginalTitle"),
                      desc: t("onboarding.qualityOriginalDesc")
                    }
                  ]).map((opt) => {
                    const isSelected = defaultDownloadQuality === opt.id;
                    return (
                      <AnimatedCard
                        key={opt.id}
                        style={[
                          styles.qualityCard,
                          isSelected && styles.qualityCardActive
                        ]}
                        containerStyle={{ width: "100%" }}
                        isSelected={isSelected}
                        onPress={() => {
                          hapticService.selection();
                          setDefaultDownloadQuality(opt.id);
                          triggerNextButtonPulse();
                        }}
                        accessibilityRole="radio"
                        accessibilityLabel={`${opt.title} - ${opt.desc}`}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <View style={styles.qualityTexts}>
                          <View style={styles.qualityTitleRow}>
                            <Text style={styles.qualityName}>{opt.title}</Text>
                            {opt.badge ? (
                              <View style={styles.qualityBadge}>
                                <Text style={styles.qualityBadgeText}>{opt.badge}</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.qualitySubName}>{opt.desc}</Text>
                        </View>
                        <View style={[styles.qualityRadio, isSelected && styles.qualityRadioActive]}>
                          <AnimatedRadioDot visible={isSelected} dotStyle={styles.qualityRadioDot} />
                        </View>
                      </AnimatedCard>
                    );
                  })}
                </View>
              </View>

              {/* Wi-Fi Only Downloads Card */}
              <AnimatedCard
                style={[
                  styles.interactiveQuestionCard,
                  playbackPreferences.downloadWifiOnly && styles.interactiveQuestionCardActive
                ]}
                containerStyle={{ width: "100%" }}
                isSelected={playbackPreferences.downloadWifiOnly}
                onPress={() => {
                  hapticService.impactLight();
                  setDownloadWifiOnly(!playbackPreferences.downloadWifiOnly);
                  triggerNextButtonPulse();
                }}
                accessibilityRole="switch"
                accessibilityLabel={t("onboarding.wifiOnlyLabel")}
                accessibilityState={{ checked: playbackPreferences.downloadWifiOnly }}
              >
                <View style={styles.cardIconBox}>
                  <Ionicons name="wifi-outline" size={20} color="#FFB800" />
                </View>
                <View style={styles.cardTexts}>
                  <Text style={styles.cardTitle}>{t("onboarding.wifiOnlyLabel")}</Text>
                  <Text style={styles.cardSubtitle}>{t("onboarding.wifiOnlyDesc")}</Text>
                </View>
                <Switch
                  value={playbackPreferences.downloadWifiOnly}
                  onValueChange={(val) => {
                    hapticService.impactLight();
                    setDownloadWifiOnly(val);
                    triggerNextButtonPulse();
                  }}
                  trackColor={{ false: "#2A2A38", true: colors.primary }}
                  thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
                />
              </AnimatedCard>

              {/* Notifications Card */}
              <AnimatedCard
                style={[
                  styles.interactiveQuestionCard,
                  notifPreferences.enabled && styles.interactiveQuestionCardActive
                ]}
                containerStyle={{ width: "100%" }}
                isSelected={notifPreferences.enabled}
                onPress={() => {
                  handleToggleNotifications(!notifPreferences.enabled);
                  triggerNextButtonPulse();
                }}
                accessibilityRole="switch"
                accessibilityLabel={t("onboarding.notificationsLabel")}
                accessibilityState={{ checked: notifPreferences.enabled }}
              >
                <View style={[styles.cardIconBox, { backgroundColor: "rgba(52, 199, 89, 0.12)" }]}>
                  <Ionicons name="notifications-outline" size={20} color="#34C759" />
                </View>
                <View style={styles.cardTexts}>
                  <Text style={styles.cardTitle}>{t("onboarding.notificationsLabel")}</Text>
                  <Text style={styles.cardSubtitle}>{t("onboarding.notificationsDesc")}</Text>
                </View>
                <Switch
                  value={notifPreferences.enabled}
                  onValueChange={(val) => {
                    handleToggleNotifications(val);
                    triggerNextButtonPulse();
                  }}
                  trackColor={{ false: "#2A2A38", true: colors.primary }}
                  thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
                />
              </AnimatedCard>
            </Animated.View>
          </ScrollView>
        </View>

        {/* Slide 3: Question 4 — Server Connection */}
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
              <Animated.View
                style={
                  currentSlide === 3
                    ? {
                        opacity: slideAnim,
                        transform: [
                          { translateY: slideTranslateY },
                          { scale: slideScale }
                        ]
                      }
                    : undefined
                }
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
                            (isTestingServer || !serverUrl?.trim()) && styles.buttonDisabled
                          ]}
                          onPress={handleTestServer}
                          disabled={isTestingServer || !serverUrl?.trim()}
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

                    {serverStatus === "success" && publicUsers.length > 0 && !showManualLogin ? (
                      <ProfilePickerView
                        users={publicUsers}
                        serverUrl={serverUrl}
                        isLoading={isLoadingPublicUsers || isSubmitting}
                        onSelectUser={handleSelectPublicProfile}
                        onManualLoginPress={() => setShowManualLogin(true)}
                      />
                    ) : (
                      <>
                        {publicUsers.length > 0 && (
                          <Pressable
                            style={styles.returnSessionButton}
                            onPress={() => setShowManualLogin(false)}
                            accessibilityRole="button"
                            accessibilityLabel={t("auth.selectProfile")}
                          >
                            <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
                            <Text style={styles.returnSessionText}>
                              {t("auth.selectProfile")}
                            </Text>
                          </Pressable>
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
                  </>
                )}
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.paginationDots}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
            <AnimatedPaginationDot
              key={idx}
              isActive={currentSlide === idx}
              onPress={() => goToSlide(idx)}
              a11yLabel={t("onboarding.stepA11y", { step: idx + 1, total: TOTAL_SLIDES })}
            />
          ))}
        </View>

        {currentSlide < LAST_SLIDE_INDEX && (
          <Animated.View style={{ transform: [{ scale: nextButtonScale }] }}>
            <FinoraButton
              label={t("onboarding.next")}
              variant="primary"
              size="md"
              rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
              onPress={() => goToSlide(currentSlide + 1)}
              style={styles.nextButton}
            />
          </Animated.View>
        )}
      </View>

      <ProfilePasswordModal
        visible={Boolean(selectedProfileForPassword)}
        user={selectedProfileForPassword}
        serverUrl={serverUrl}
        onClose={() => setSelectedProfileForPassword(null)}
        onSubmit={handleProfilePasswordSubmit}
        isLoading={isSubmitting}
        errorMessage={loginError}
      />
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
  slideScroll: {
    width: "100%",
    flex: 1
  },
  slideScrollContent: {
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 40
  },
  slideContent: {
    paddingHorizontal: 28,
    justifyContent: "center",
    alignItems: "flex-start",
    width: "100%"
  },
  prefSection: {
    width: "100%",
    marginBottom: 16
  },
  prefSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B3B3CC",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(229, 9, 20, 0.15)"
  },
  chipFlag: {
    fontSize: 15,
    marginRight: 6
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8A8A9E"
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  prefSwitchCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  prefSwitchIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  prefSwitchTextBox: {
    flex: 1,
    marginRight: 8
  },
  prefSwitchTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF"
  },
  prefSwitchSubtitle: {
    fontSize: 11,
    color: "#8A8A9E",
    marginTop: 2
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
  interactiveQuestionCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 24, 34, 0.78)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    gap: 12
  },
  interactiveQuestionCardActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(229, 9, 20, 0.08)"
  },
  featureShowcaseCard: {
    width: "100%",
    backgroundColor: "rgba(255, 184, 0, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.25)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20
  },
  featureShowcaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(229, 9, 20, 0.15)",
    alignItems: "center",
    justifyContent: "center"
  },
  cardTexts: {
    flex: 1
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17
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
  qualityCardsList: {
    width: "100%",
    gap: 12
  },
  qualityCard: {
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
  qualityCardActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(229, 9, 20, 0.08)"
  },
  qualityTexts: {
    flex: 1
  },
  qualityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  qualityName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  qualityBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  qualityBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700"
  },
  qualitySubName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16
  },
  qualityRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center"
  },
  qualityRadioActive: {
    borderColor: colors.primary
  },
  qualityRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary
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
