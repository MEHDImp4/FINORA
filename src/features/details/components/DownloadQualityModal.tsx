import React, { useState } from "react";
import { Modal, View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MediaItem } from "../../../types/media";
import {
  DownloadQuality,
  DOWNLOAD_QUALITIES
} from "../../offline/downloadQuality";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { FinoraButton } from "../../../design-system/components/FinoraButton";
import { colors, spacing } from "../../../design-system/tokens";
import { hapticService } from "../../../core/feedback/hapticService";

export interface DownloadQualityModalProps {
  visible: boolean;
  onClose: () => void;
  item: MediaItem;
  onConfirmDownload: (quality: DownloadQuality) => void;
}

export const DownloadQualityModal: React.FC<DownloadQualityModalProps> = ({
  visible,
  onClose,
  item,
  onConfirmDownload
}) => {
  const [selectedQuality, setSelectedQuality] = useState<DownloadQuality>("original");

  const handleConfirm = () => {
    hapticService.impactMedium();
    onConfirmDownload(selectedQuality);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <View style={styles.dialogContainer} testID="download-quality-modal">
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <FinoraText variant="title" style={styles.title}>
                Qualité du téléchargement
              </FinoraText>
              <FinoraText variant="caption" style={styles.subtitle} numberOfLines={1}>
                {item.name}
              </FinoraText>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Qualities List */}
          <View style={styles.content}>
            <FinoraText variant="caption" style={styles.helperText}>
              Choisissez la résolution adaptée à votre stockage et connexion :
            </FinoraText>

            {DOWNLOAD_QUALITIES.map((profile) => {
              const isSelected = selectedQuality === profile.id;

              return (
                <Pressable
                  key={profile.id}
                  style={[
                    styles.qualityOption,
                    isSelected && styles.qualityOptionSelected
                  ]}
                  onPress={() => {
                    hapticService.selection();
                    setSelectedQuality(profile.id);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.qualityInfo}>
                    <View style={styles.qualityHeaderRow}>
                      <FinoraText variant="body" style={styles.qualityTitle}>
                        {profile.title}
                      </FinoraText>
                      {profile.badge ? (
                        <View
                          style={[
                            styles.badge,
                            profile.badge === "Recommandé"
                              ? styles.badgeRecommended
                              : styles.badgeSource
                          ]}
                        >
                          <FinoraText variant="caption" style={styles.badgeText}>
                            {profile.badge}
                          </FinoraText>
                        </View>
                      ) : null}
                    </View>
                    <FinoraText variant="caption" style={styles.qualityDesc}>
                      {profile.description}
                    </FinoraText>
                  </View>

                  <Ionicons
                    name={isSelected ? "radio-button-on" : "radio-button-off"}
                    size={22}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                </Pressable>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <FinoraButton
              label="Annuler"
              variant="secondary"
              size="md"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <FinoraButton
              testID="confirm-quality-download-button"
              label="Télécharger"
              variant="primary"
              size="md"
              onPress={handleConfirm}
              leftIcon={<Ionicons name="download-outline" size={18} color="#FFFFFF" />}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill
  },
  dialogContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#14141E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262638",
    overflow: "hidden"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F2E"
  },
  title: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 18
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2
  },
  closeButton: {
    padding: 6
  },
  content: {
    padding: spacing.md,
    gap: 10
  },
  helperText: {
    color: colors.textSecondary,
    marginBottom: 4
  },
  qualityOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#1A1A28",
    borderWidth: 1,
    borderColor: "#262638"
  },
  qualityOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(229, 9, 20, 0.1)"
  },
  qualityInfo: {
    flex: 1,
    marginRight: spacing.sm
  },
  qualityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2
  },
  qualityTitle: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 14
  },
  qualityDesc: {
    color: colors.textSecondary,
    fontSize: 12
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeRecommended: {
    backgroundColor: "rgba(229, 9, 20, 0.2)"
  },
  badgeSource: {
    backgroundColor: "rgba(46, 204, 113, 0.15)"
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#1F1F2E",
    backgroundColor: "#101018"
  }
});
