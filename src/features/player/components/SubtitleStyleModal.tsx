import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  TouchableOpacity
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { FinoraIconButton } from "../../../design-system/components/FinoraIconButton";
import { colors, spacing } from "../../../design-system/tokens";
import { hapticService } from "../../../core/feedback/hapticService";
import { useTranslation } from "../../../i18n";
import {
  useSubtitleSettingsStore,
  SubtitleSize,
  SubtitleColor,
  SubtitleBackground,
  SubtitleShadow,
  SubtitlePosition,
  SubtitlePreset,
  SUBTITLE_SIZE_VALUES
} from "../../../stores/subtitleSettingsStore";

interface SubtitleStyleModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SubtitleStyleModal({ visible, onClose }: SubtitleStyleModalProps) {
  const { t } = useTranslation();
  const { settings, updateSettings, applyPreset, resetToDefaults } = useSubtitleSettingsStore();
  const [previewDarkScene, setPreviewDarkScene] = useState(true);

  const colorOptions = useMemo<{ label: string; value: SubtitleColor; hex: string }[]>(() => [
    { label: t("player.colorWhite"), value: "#FFFFFF", hex: "#FFFFFF" },
    { label: t("player.colorYellow"), value: "#FFE600", hex: "#FFE600" },
    { label: t("player.colorCyan"), value: "#00E5FF", hex: "#00E5FF" },
    { label: t("player.colorGreen"), value: "#A7F3D0", hex: "#A7F3D0" }
  ], [t]);

  const sizeOptions = useMemo<{ label: string; value: SubtitleSize; sizeLabel: string }[]>(() => [
    { label: t("player.sizeSmall"), value: "small", sizeLabel: "16px" },
    { label: t("player.sizeMedium"), value: "medium", sizeLabel: "20px" },
    { label: t("player.sizeLarge"), value: "large", sizeLabel: "26px" },
    { label: t("player.sizeExtraLarge"), value: "extraLarge", sizeLabel: "32px" }
  ], [t]);

  const backgroundOptions = useMemo<{ label: string; value: SubtitleBackground; icon: string }[]>(() => [
    { label: t("player.bgNone"), value: "none", icon: "ban-outline" },
    { label: t("player.bgSemiBlack"), value: "semi_black", icon: "square-outline" },
    { label: t("player.bgSolidBlack"), value: "solid_black", icon: "square" },
    { label: t("player.bgPill"), value: "pill", icon: "ellipse-outline" }
  ], [t]);

  const shadowOptions = useMemo<{ label: string; value: SubtitleShadow }[]>(() => [
    { label: t("player.shadowNetflix"), value: "netflix_shadow" },
    { label: t("player.shadowOutline"), value: "thick_outline" },
    { label: t("player.shadowNone"), value: "none" }
  ], [t]);

  const positionOptions = useMemo<{ label: string; value: SubtitlePosition }[]>(() => [
    { label: t("player.positionStandard"), value: "standard" },
    { label: t("player.positionElevated"), value: "elevated" }
  ], [t]);

  const presets = useMemo<{ key: SubtitlePreset; label: string; subtitle: string }[]>(() => [
    { key: "netflix", label: t("player.presetNetflix"), subtitle: t("player.presetNetflixDesc") },
    { key: "netflix_box", label: t("player.presetNetflixBox"), subtitle: t("player.presetNetflixBoxDesc") },
    { key: "cinema_yellow", label: t("player.presetCinemaYellow"), subtitle: t("player.presetCinemaYellowDesc") },
    { key: "high_contrast", label: t("player.presetHighContrast"), subtitle: t("player.presetHighContrastDesc") }
  ], [t]);

  if (!visible) return null;

  const handleApplyPreset = (preset: SubtitlePreset) => {
    hapticService.impactMedium();
    applyPreset(preset);
  };

  const handleUpdate = (partial: Parameters<typeof updateSettings>[0]) => {
    hapticService.impactLight();
    updateSettings(partial);
  };

  const handleReset = () => {
    hapticService.impactMedium();
    resetToDefaults();
  };

  // Preview styling calculations
  const previewFontSize = SUBTITLE_SIZE_VALUES[settings.size] || 20;

  const previewBoxStyle =
    settings.background === "semi_black"
      ? styles.previewBoxSemiBlack
      : settings.background === "solid_black"
      ? styles.previewBoxSolidBlack
      : settings.background === "pill"
      ? styles.previewBoxPill
      : styles.previewBoxNone;

  const previewShadowStyle =
    settings.shadow === "netflix_shadow"
      ? styles.shadowNetflix
      : settings.shadow === "thick_outline"
      ? styles.shadowThick
      : styles.shadowNone;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID="subtitle-style-modal"
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <FinoraText variant="title" weight="700" color="textPrimary">
                {t("player.subtitleStyle")}
              </FinoraText>
              <FinoraText variant="caption" color="textSecondary">
                {t("player.subtitlesAppearanceDesc")}
              </FinoraText>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleReset}
                style={styles.resetButton}
                testID="subtitle-reset-button"
              >
                <Ionicons name="refresh-outline" size={14} color={colors.textMuted} />
                <FinoraText variant="caption" color="textMuted" style={{ marginLeft: 4 }}>
                  {t("common.default")}
                </FinoraText>
              </TouchableOpacity>

              <FinoraIconButton
                accessibilityLabel={t("common.close")}
                onPress={onClose}
                size={36}
                backgroundColor={colors.surface}
                testID="subtitle-style-close-button"
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </FinoraIconButton>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Live Interactive Preview */}
            <View style={styles.previewSection}>
              <View style={styles.previewHeader}>
                <FinoraText variant="caption" color="textSecondary" weight="700">
                  {t("player.livePreview")}
                </FinoraText>
                <Pressable
                  onPress={() => setPreviewDarkScene(!previewDarkScene)}
                  style={styles.sceneToggle}
                  testID="toggle-preview-scene"
                >
                  <Ionicons
                    name={previewDarkScene ? "sunny-outline" : "moon-outline"}
                    size={14}
                    color="#FFFFFF"
                  />
                  <FinoraText variant="caption" color="textPrimary" style={{ marginLeft: 4, fontSize: 11 }}>
                    {previewDarkScene ? t("player.testLightScene") : t("player.testDarkScene")}
                  </FinoraText>
                </Pressable>
              </View>

              <View
                style={[
                  styles.previewScreen,
                  previewDarkScene ? styles.previewDarkScene : styles.previewLightScene
                ]}
                testID="subtitle-preview-box"
              >
                <View
                  style={[
                    styles.previewSubtitleContainer,
                    settings.position === "elevated" && { marginBottom: 28 }
                  ]}
                >
                  <View style={[styles.previewBoxBase, previewBoxStyle]}>
                    <FinoraText
                      style={[
                        styles.previewText,
                        {
                          fontSize: previewFontSize,
                          lineHeight: Math.round(previewFontSize * 1.35),
                          color: settings.textColor
                        },
                        previewShadowStyle
                      ]}
                    >
                      {t("player.previewSampleText")}
                    </FinoraText>
                  </View>
                </View>
              </View>
            </View>

            {/* 1-Click Presets */}
            <View style={styles.section}>
              <FinoraText variant="caption" color="textSecondary" weight="700" style={styles.sectionTitle}>
                {t("player.presets")}
              </FinoraText>
              <View style={styles.presetGrid}>
                {presets.map((p) => (
                  <TouchableOpacity
                    key={p.key}
                    style={styles.presetCard}
                    onPress={() => handleApplyPreset(p.key)}
                    activeOpacity={0.7}
                    testID={`preset-${p.key}`}
                  >
                    <FinoraText variant="caption" weight="700" color="textPrimary">
                      {p.label}
                    </FinoraText>
                    <FinoraText variant="caption" color="textMuted" style={{ fontSize: 11, marginTop: 2 }}>
                      {p.subtitle}
                    </FinoraText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Text Color Selection */}
            <View style={styles.section}>
              <FinoraText variant="caption" color="textSecondary" weight="700" style={styles.sectionTitle}>
                {t("player.textColor")}
              </FinoraText>
              <View style={styles.optionsRow}>
                {colorOptions.map((c) => {
                  const selected = settings.textColor === c.value;
                  return (
                    <TouchableOpacity
                      key={c.value}
                      style={[styles.colorChip, selected && styles.chipSelected]}
                      onPress={() => handleUpdate({ textColor: c.value })}
                      testID={`color-${c.value}`}
                    >
                      <View style={[styles.colorDot, { backgroundColor: c.hex }]} />
                      <FinoraText
                        variant="caption"
                        color={selected ? "textPrimary" : "textSecondary"}
                        weight={selected ? "700" : "400"}
                      >
                        {c.label}
                      </FinoraText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Font Size Selection */}
            <View style={styles.section}>
              <FinoraText variant="caption" color="textSecondary" weight="700" style={styles.sectionTitle}>
                {t("player.textSize")}
              </FinoraText>
              <View style={styles.optionsRow}>
                {sizeOptions.map((s) => {
                  const selected = settings.size === s.value;
                  return (
                    <TouchableOpacity
                      key={s.value}
                      style={[styles.optionChip, selected && styles.chipSelected]}
                      onPress={() => handleUpdate({ size: s.value })}
                      testID={`size-${s.value}`}
                    >
                      <FinoraText
                        variant="caption"
                        color={selected ? "textPrimary" : "textSecondary"}
                        weight={selected ? "700" : "400"}
                      >
                        {s.label}
                      </FinoraText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Background / Box ("Carré derrière") */}
            <View style={styles.section}>
              <FinoraText variant="caption" color="textSecondary" weight="700" style={styles.sectionTitle}>
                {t("player.textBackground")}
              </FinoraText>
              <View style={styles.optionsRow}>
                {backgroundOptions.map((b) => {
                  const selected = settings.background === b.value;
                  return (
                    <TouchableOpacity
                      key={b.value}
                      style={[styles.optionChip, selected && styles.chipSelected]}
                      onPress={() => handleUpdate({ background: b.value })}
                      testID={`bg-${b.value}`}
                    >
                      <Ionicons
                        name={b.icon as any}
                        size={14}
                        color={selected ? colors.primary : colors.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <FinoraText
                        variant="caption"
                        color={selected ? "textPrimary" : "textSecondary"}
                        weight={selected ? "700" : "400"}
                      >
                        {b.label}
                      </FinoraText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Shadow & Outline */}
            <View style={styles.section}>
              <FinoraText variant="caption" color="textSecondary" weight="700" style={styles.sectionTitle}>
                {t("player.textShadow")}
              </FinoraText>
              <View style={styles.optionsRow}>
                {shadowOptions.map((sh) => {
                  const selected = settings.shadow === sh.value;
                  return (
                    <TouchableOpacity
                      key={sh.value}
                      style={[styles.optionChip, selected && styles.chipSelected]}
                      onPress={() => handleUpdate({ shadow: sh.value })}
                      testID={`shadow-${sh.value}`}
                    >
                      <FinoraText
                        variant="caption"
                        color={selected ? "textPrimary" : "textSecondary"}
                        weight={selected ? "700" : "400"}
                      >
                        {sh.label}
                      </FinoraText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Position */}
            <View style={styles.section}>
              <FinoraText variant="caption" color="textSecondary" weight="700" style={styles.sectionTitle}>
                {t("player.textPosition")}
              </FinoraText>
              <View style={styles.optionsRow}>
                {positionOptions.map((pos) => {
                  const selected = settings.position === pos.value;
                  return (
                    <TouchableOpacity
                      key={pos.value}
                      style={[styles.optionChip, selected && styles.chipSelected]}
                      onPress={() => handleUpdate({ position: pos.value })}
                      testID={`pos-${pos.value}`}
                    >
                      <FinoraText
                        variant="caption"
                        color={selected ? "textPrimary" : "textSecondary"}
                        weight={selected ? "700" : "400"}
                      >
                        {pos.label}
                      </FinoraText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end"
  },
  modalCard: {
    backgroundColor: "#111116",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "88%",
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.1)"
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginRight: 4
  },
  scrollBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  previewSection: {
    marginBottom: spacing.lg
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  sceneToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  previewScreen: {
    height: 120,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)"
  },
  previewDarkScene: {
    backgroundColor: "#181822"
  },
  previewLightScene: {
    backgroundColor: "#D1D5DB"
  },
  previewSubtitleContainer: {
    alignItems: "center",
    maxWidth: "92%"
  },
  previewBoxBase: {
    alignItems: "center",
    justifyContent: "center"
  },
  previewBoxNone: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  previewBoxSemiBlack: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  previewBoxSolidBlack: {
    backgroundColor: "rgba(4, 4, 6, 0.95)",
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  previewBoxPill: {
    backgroundColor: "rgba(18, 18, 24, 0.88)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.15)"
  },
  previewText: {
    fontWeight: "700",
    textAlign: "center"
  },
  section: {
    marginBottom: spacing.lg
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 10
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  presetCard: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  colorChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(229, 9, 20, 0.15)"
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.4)"
  },
  shadowNetflix: {
    textShadowColor: "rgba(0, 0, 0, 0.95)",
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 3.5
  },
  shadowThick: {
    textShadowColor: "#000000",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1
  },
  shadowNone: {
    textShadowColor: "transparent",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0
  }
});
