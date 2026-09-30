# Changelog — FINORA

> 🇬🇧 *An English version of this changelog is available in [CHANGELOG.md](CHANGELOG.md).*

Toutes les modifications notables apportées au projet FINORA sont consignées dans ce document.
Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/).

---

## [1.0.0] - Non publiée

### ✨ Fonctionnalités majeures (Features)
- **Lecteur Vidéo Avancé** : Intégration moderne d'Expo Video / Media3 avec reprise de lecture, contrôle gestuel (luminosité, volume, double-tap seek), changement de pistes audio et sous-titres avec modal de style personnalisable.
- **Téléchargements Offline Fiables** : Gestionnaire de téléchargements (`DownloadManager`) résistant aux interruptions de réseau, aux arrêts d'application et aux redémarrages de l'OS avec reprise de téléchargement (HTTP Range), limitation de bande passante et service d'arrière-plan Android.
- **Navigation & Découverte** : Interface cinématique avec bannière héro dynamique, carrousels par bibliothèque, reprise de lecture rapide, recherche avec suggestions et historique isolé par serveur et utilisateur.
- **Stockage Sécurisé des Identifiants** : Stockage des jetons via `expo-secure-store`, masquage automatique des identifiants sensibles dans les logs (`[REDACTED]`), avertissement strict pour les connexions HTTP locales et absence d’analytics.
- **Distribution Continue** : Workflows GitHub Actions pour la génération automatisée d'APK autonomes (`preview`, `beta`, `release`) publiés directement dans les GitHub Releases avec checksums SHA-256.

### 🔧 Durcissement de la Release
- **Quality Gates Cohérents** : Les pipelines Android stable et RC exécutent le même audit des dépendances de production, TypeScript, version, i18n, Jest et Expo Doctor informatif avant validation du build.
- **Erreurs Player Sanitisées** : Les erreurs des listeners du lecteur passent par le logger FINORA avec masquage des données sensibles au lieu d'un `console.error` direct.
- **Correction de l’Audit Dépendances** : Mise à jour de l’entrée transitive vulnérable `brace-expansion` du lockfile vers 5.0.12 afin que le gate d’audit high severity passe.

### 🐛 Corrections de bugs (Fixes)
- **Écran noir au démarrage (Build Preview)** : Passage de `assembleDebug` à `assembleRelease` pour embarquer le bundle JavaScript Hermes et les assets dans l'APK sans nécessiter de serveur Metro local.
- **Gestion des Timers & Jest Workers** : Hardening des timeouts réseau (`httpClient`, `networkStatusService`) et nettoyage systématique des instances (`FinoraPlayerEngine`, `DownloadManager`) pour une terminaison propre des tests en CI.
- **Sauvegarde et Restauration de Téléchargements** : Correction de l'écrasement intempestif des métadonnées lors des debounce de persistance et isolation par serveur/compte.
- **Luminosité du Système** : Restauration automatique de la luminosité du système lors de la fermeture du lecteur vidéo.
- **Alignement des Tests Expo 57** : Jest 29 reste aligné avec la pile de tests SDK 57. `expo-doctor` reste informatif pour les seuls écarts de patch des paquets Expo, revus séparément avant la stable.

---

## [1.0.0-preview] - 2026-09-16

### 📦 Builds Preview & Tests
- Génération d'APK preview autonomes avec niveau `preview`.
- Publication directe sur GitHub Releases pour installation en 1 clic sans extraction d'archive zip.
