# FINORA — Regardez à votre façon

<p align="center">
  <img src="./assets/finora-logo-text.png" alt="Logo FINORA" width="380" />
</p>

<p align="center">
  <strong>Un client de streaming personnel moderne et cinématique pour Jellyfin.</strong><br>
  Développé avec Expo SDK 57, React Native 0.86 (Nouvelle Architecture & Hermes) et TypeScript.
</p>

<p align="center">
  <a href="README.md">🇬🇧 English</a> •
  <strong>🇫🇷 Français</strong>
</p>

<p align="center">
  <a href="https://github.com/MEHDImp4/FINORA/releases/latest"><img src="https://img.shields.io/github/v/release/MEHDImp4/FINORA?color=6366f1&label=derni%C3%A8re%20version%20apk" alt="Dernière Release" /></a>
  <a href="https://github.com/MEHDImp4/FINORA/actions/workflows/ci.yml"><img src="https://github.com/MEHDImp4/FINORA/actions/workflows/ci.yml/badge.svg" alt="Statut CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/Licence-GPL--3.0-blue.svg" alt="Licence: GPL-3.0" /></a>
  <a href="https://expo.dev"><img src="https://img.shields.io/badge/Expo-SDK%2057-000020.svg?logo=expo" alt="Expo SDK 57" /></a>
  <a href="https://reactnative.dev"><img src="https://img.shields.io/badge/React%20Native-0.86-61DAFB.svg?logo=react" alt="React Native 0.86" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?logo=typescript" alt="TypeScript Strict" /></a>
  <a href="https://jellyfin.org"><img src="https://img.shields.io/badge/Compatible%20Jellyfin-10.9%20%7C%2010.10-00A4DC.svg?logo=jellyfin" alt="Compatible Jellyfin" /></a>
</p>

<p align="center">
  <a href="https://github.com/MEHDImp4/FINORA/releases/latest">📥 <strong>Télécharger le dernier APK</strong></a> •
  <a href="#-démarrage-rapide">🚀 <strong>Démarrage rapide</strong></a> •
  <a href="CONTRIBUTING.fr.md">🤝 <strong>Contribuer</strong></a> •
  <a href="https://github.com/MEHDImp4/FINORA/discussions">💬 <strong>Discussions</strong></a>
</p>

---

## 📖 Sommaire

- [Présentation](#-présentation)
- [Fonctionnalités Clés](#-fonctionnalités-clés)
- [Téléchargement & Installation](#-téléchargement--installation)
- [Technologies Utilisées](#-technologies-utilisées)
- [Architecture du Projet](#-architecture-du-projet)
- [Démarrage Rapide (Développeurs)](#-démarrage-rapide-développeurs)
- [Tests Automatisés & Intégration Continue](#-tests-automatisés--intégration-continue)
- [Sécurité & Confidentialité](#-sécurité--confidentialité)
- [Contribuer au Projet](#-contribuer-au-projet)
- [Communauté & Support](#-communauté--support)
- [Licence & Remerciements](#-licence--remerciements)

---

## 🌟 Présentation

**FINORA** a été conçu pour remplacer l'interface mobile standard de Jellyfin par une expérience de streaming fluide, moderne et hautement immersive, comparable en finition visuelle et en réactivité à Netflix, Prime Video ou Crunchyroll — tout en restant **100% open-source, privé et personnalisable**.

**Notre promesse centrale :** La boucle de visionnage instantanée et sans friction :
> **Ouvrez FINORA → Parcourez instantanément → Choisissez un contenu → Lancez la lecture → Visionnez en toute fluidité → Reprenez n'importe où.**

- **Performances Ultra-Fluides** : Rendu à 60–120 FPS constant sur écrans à haut rafraîchissement, sans aucun goulot d'étranglement de sérialisation JavaScript (Nouvelle Architecture React Native + Fabric + moteur Hermes).
- **Design Cinématique Liquid Glass** : Cartes volumétriques inspirées d'Apple, barre de navigation en verre translucide et reflets spéculaires lumineux.
- **Moteur de Lecture Robuste** : Moteur natif basé sur `expo-video` (AndroidX Media3 / ExoPlayer sur Android et AVPlayer sur iOS) avec négociation dynamique du Direct Play.
- **Sécurité Matérielle Intégrée** : Zéro jeton en texte clair, secrets protégés par le Keystore matériel (`expo-secure-store`) et absence totale de traceurs publicitaires ou analytiques.

---

## ✨ Fonctionnalités Clés

### 🎬 1. Moteur de Lecture Vidéo Moderne (`FinoraPlayerEngine`)
- **AndroidX Media3 & AVPlayer** : Décodage vidéo natif accéléré matériellement à très faible surcharge mémoire.
- **Négociation Intelligente du Flux** : Pipeline de décision dynamique (`PlaybackPlanner`) priorisant *Direct Play > Direct Stream > Transcodage* selon les capacités de votre appareil.
- **Contrôles Gestuels Intuitifs** :
  - Glissement vertical sur la gauche pour régler la **luminosité de l'écran**.
  - Glissement vertical sur la droite pour régler le **volume audio**.
  - Double-tape sur les bords gauche/droit pour un **saut de 10 secondes** avant/arrière.
- **Détection des Intros & Génériques** : Bouton de saut automatique pour les intros, récapitulatifs et génériques de fin Jellyfin.
- **Sous-Titres & Pistes Audio Multiples** : Prise en charge des formats SubRip (SRT), WebVTT, sous-titres d'images (PGS) et styles Advanced SubStation Alpha (ASS).
- **Synchronisation de Reprise** : Remontée en temps réel de la progression de lecture et points de reprise enregistrés sur le serveur Jellyfin.

### 💎 2. Interface Utilisateur Liquid Glass & Navigation Cinématique
- **Bannières Héros Immersives** : Fonds d'écran dynamiques avec logos haute résolution et barre de progression de visionnage intégrée.
- **Cache d'Images Ultra-Performant** : Propulsé par `expo-image` avec cache multi-niveaux (mémoire + disque), décodage progressif et placeholders Blurhash anti-saccades.
- **Disposition Adaptative** : Grilles et carrousels fluides s'adaptant automatiquement entre modes portrait, paysage et écrans pliables.

### 📥 3. Gestionnaire de Téléchargements Offline Résilient
- **Téléchargements en Arrière-Plan** : Utilise les services de premier plan Android (`react-native-background-actions`) pour télécharger vos films et séries même lorsque l'application est suspendue.
- **Reprise Automatique (HTTP Range)** : Reprend instantanément les téléchargements interrompus par une perte de réseau sans jamais recommencer à zéro.
- **Stockage Sécurisé & Isolé** : Fichiers médias stockés dans le bac à sable privé de l'application (`expo-file-system`) et indexés localement par utilisateur et par serveur.

### 🔍 4. Découverte & Recherche Intelligente
- **Recherche en Temps Réel** : Suggestions instantanées à la frappe, historique récent et résultats multi-bibliothèques.
- **Isolation Complète Multi-Serveurs** : Historiques de recherche, paramètres et téléchargements hermétiquement isolés par compte et par serveur Jellyfin.
- **Fiches Détaillées** : Distribution complète des acteurs, notes de la communauté, badges des studios et indicateurs de résolution (4K, HDR, 1080p, son 5.1).

### 🛡️ 5. Sécurité Zéro-Trust & Confidentialité
- **Keystore Matériel** : Jetons d'accès stockés exclusivement dans le stockage sécurisé matériel (`expo-secure-store`).
- **Purge Mémoire Immédiate** : Les mots de passe sont détruits de la mémoire vive JavaScript immédiatement après l'authentification.
- **Logs Réseau Sanitizés** : Les journaux de débogage masquent automatiquement les en-têtes d'autorisation, mots de passe et jetons d'accès (`[REDACTED]`).
- **Zéro Traqueur Tiers** : Ni télémétrie, ni analytique externe, ni publicité.

### 🔔 6. Notifications d'Arrière-Plan
- Tâches de fond périodiques (`expo-background-task`) pour vous informer des nouveaux films, saisons et épisodes ajoutés sur votre serveur Jellyfin.

---

## 📱 Téléchargement & Installation

### Android (APK Direct)

Des fichiers `.apk` autonomes sont générés et publiés automatiquement à chaque version :

| Canal de Build | Recommandé pour | Lien de Téléchargement |
|---|---|---|
| **Version Stable (Latest)** | Tous les utilisateurs recherchant la stabilité maximale | [**Télécharger le dernier APK**](https://github.com/MEHDImp4/FINORA/releases/latest) |
| **Versions Preview** | Testeurs souhaitant découvrir les fonctionnalités en avant-première | [**Voir toutes les releases**](https://github.com/MEHDImp4/FINORA/releases) |

#### Comment installer l'application :
1. Téléchargez directement le fichier `.apk` sur votre téléphone Android depuis la page de release.
2. Cliquez sur le fichier téléchargé dans vos notifications ou votre gestionnaire de fichiers.
3. Si votre système vous le demande, autorisez votre navigateur ou gestionnaire à **"Installer des applications de sources inconnues"**.
4. Cliquez sur **Installer**, ouvrez FINORA et profitez de vos médias !

### iOS

En raison des restrictions de l'App Store Apple sur les clients de streaming tiers, l'utilisation sur iOS nécessite actuellement une compilation depuis les sources :
1. Clonez le dépôt sur un ordinateur macOS.
2. Lancez `npx expo run:ios` pour déployer sur un iPhone physique ou sur le simulateur iOS.

---

## 🛠️ Technologies Utilisées

| Couche | Technologie | Rôle / Rationale |
|---|---|---|
| **Framework** | [Expo SDK 57](https://expo.dev) | Modules natifs modernes, plugins de compilation gérés |
| **Runtime** | [React Native 0.86+](https://reactnative.dev) + [React 19](https://react.dev) | Composants d'interface natifs, rendu concurrentiel |
| **Architecture**| Nouvelle Architecture (Fabric + Bridgeless) | Élimination du pont JavaScript pour un rendu 120 FPS fluide |
| **Moteur JS** | [Hermes](https://hermesengine.dev) | Démarrage à froid inférieur à 1,5s, faible empreinte RAM |
| **Routage** | [Expo Router v4](https://docs.expo.dev/router/introduction/) | Navigation typée par fichiers avec transitions natives |
| **Lecteur** | [`expo-video`](https://docs.expo.dev/versions/latest/sdk/video/) | AndroidX Media3 / ExoPlayer & Apple AVPlayer |
| **Images** | [`expo-image`](https://docs.expo.dev/versions/latest/sdk/image/) | Mise en cache native (RAM + disque) avec placeholders Blurhash |
| **État** | [TanStack Query v5](https://tanstack.com/query) + [Zustand](https://zustand.docs.pmnd.rs) | Cache d'état serveur & stores atomiques UI légers |
| **Sécurité** | [`expo-secure-store`](https://docs.expo.dev/versions/latest/sdk/securestore/) | Keystore matériel (Android Keystore / iOS Keychain) |
| **SDK** | [`@jellyfin/sdk`](https://github.com/jellyfin/jellyfin-sdk-typescript) | Client API officiel TypeScript du projet Jellyfin |
| **Langage** | [TypeScript](https://www.typescriptlang.org/) | Typage strict sur 100% de la codebase |

---

## 🏗️ Architecture du Projet

FINORA applique une stricte séparation des responsabilités pour garantir maintenabilité, testabilité et performance :

```text
Architecture FINORA
┌────────────────────────────────────────────────────────┐
│                   Pages Expo Router                    │  (app/)
│     Présentation d'Écran & Transitions Reanimated      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                      Hooks Custom                      │  (src/features/*/hooks/)
│        Cycle de Vie UI, Arbitrage Gestuel, Requêtes    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│            Couche Domaine & État (TanStack/Zustand)    │  (src/stores/, src/features/)
│      PlaybackPlanner, DownloadManager, OfflineEngine   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Couche Référentiel                   │  (src/core/repositories/)
│     AuthRepo, MediaRepo, PlaybackRepo, SessionRepo     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│            Modules Natifs & Moteur Jellyfin            │  (expo-video, SecureStore, SDK)
│        AndroidX Media3, Keystore, @jellyfin/sdk        │
└────────────────────────────────────────────────────────┘
```

### Organisation des Dossiers

```text
FINORA/
├── app/                  # Routes et écrans typés Expo Router
├── assets/               # Logos officiels, icônes et visuels de l'application
├── src/
│   ├── core/             # Socle fondamental et infrastructure
│   │   ├── network/      # Client HTTP sanitizé, journalisation sécurisée
│   │   ├── repositories/ # Référentiels d'accès au domaine Jellyfin
│   │   ├── security/     # Chiffrement Keystore & masquage des secrets
│   │   └── storage/      # Gestionnaires de stockage sécurisé
│   ├── features/         # Modules fonctionnels de l'application
│   │   ├── auth/         # Connexion, découverte de serveur, multi-comptes
│   │   ├── player/       # FinoraPlayerEngine, contrôles, gestes, pistes audio/sous-titres
│   │   ├── downloads/    # DownloadManager, service d'arrière-plan, reprise HTTP
│   │   ├── home/         # Bannière héro, carrousels, reprise de lecture
│   │   ├── library/      # Grille responsive de médias, filtres et tri
│   │   └── search/       # Recherche dynamique, historique, suggestions
│   ├── stores/           # Stores atomiques Zustand (lecteur, réglages, téléchargements)
│   └── components/       # Composants du système de design FINORA (cartes Liquid Glass)
├── .github/              # Formulaires d'issues, modèle de PR, bots et workflows CI
└── package.json
```

---

## 🚀 Démarrage Rapide (Développeurs)

> ⚠️ **FINORA nécessite un build de développement Expo — il ne peut pas s'exécuter dans Expo Go.**
> Les modules natifs de FINORA (`expo-video`, `expo-secure-store`, etc.) requièrent la compilation de code natif.

### Prérequis

- [Node.js](https://nodejs.org/) v22+ (version LTS recommandée)
- [npm](https://www.npmjs.com/) v10+
- [JDK 17](https://adoptium.net/) (Temurin 17 recommandé)
- [Android Studio](https://developer.android.com/studio) avec Android SDK Platform 35+ et Android NDK
- Un serveur [Jellyfin](https://jellyfin.org/) actif pour les tests de streaming

### Installation Locale

1. **Clonez le dépôt :**
   ```bash
   git clone https://github.com/MEHDImp4/FINORA.git
   cd FINORA
   ```

2. **Installez les dépendances npm :**
   ```bash
   npm install
   ```

3. **Générez le projet Android natif et lancez le build de dev :**
   ```bash
   npx expo run:android
   ```

4. **Sur iOS (ordinateur macOS requis) :**
   ```bash
   npx expo run:ios
   ```

5. **Démarrez le serveur Metro dev-client :**
   ```bash
   npx expo start --dev-client
   ```

### Commandes npm Utiles

| Commande | Action |
|---|---|
| `npm start` | Démarre le serveur de développement Metro |
| `npm test` | Exécute l'ensemble des 77 suites de tests Jest (478 tests unitaires) |
| `npm run test:watch` | Exécute Jest en mode interactif continu |
| `npm run typecheck` | Valide l'intégralité du typage TypeScript en mode strict |
| `npm run android` | Compile et déploie le build de développement natif Android |
| `npm run ios` | Compile et déploie le build de développement natif iOS |

---

## 🧪 Tests Automatisés & Intégration Continue

FINORA maintient une couverture de tests automatisés rigoureuse couvrant les référentiels, la logique de lecture vidéo, la persistance des téléchargements et la sécurité :

```bash
# Lancer les tests unitaires et d'intégration
npm test

# Valider le typage TypeScript strict
npm run typecheck
```

L'Intégration Continue (CI) s'exécute automatiquement à chaque push et Pull Request vers `master` via GitHub Actions :
- **Validation stricte TypeScript et linters**
- **Exécution complète des 478 tests unitaires Jest**
- **Compilation du projet natif Android via Expo Prebuild**
- **Packaging automatisé des APKs et publication des releases**

---

## 🛡️ Sécurité & Confidentialité

- **Zéro Secret en Texte Clair** : Les mots de passe sont détruits de la mémoire vive dès la fin de l'authentification et ne sont jamais journalisés ni sauvegardés.
- **Keystore Chiffré Matériellement** : Les jetons d'accès résident exclusivement dans le matériel sécurisé (`expo-secure-store`).
- **Masquage Automatique des Logs** : Les journaux réseau masquent systématiquement les en-têtes d'autorisation et les jetons (`[REDACTED]`).
- **Aucun Traqueur Tiers** : Zéro outil d'analyse comportementale, zéro SDK de pistage ou publicitaire.
- **Divulgation Responsable** : Consultez notre [Politique de Sécurité (SECURITY.fr.md)](SECURITY.fr.md) pour nous signaler confidentiellement toute vulnérabilité.

---

## 🤝 Contribuer au Projet

Toutes les contributions de la communauté sont les bienvenues !
- 🐛 Vous avez repéré un bug ? Ouvrez un [Rapport de Bug](https://github.com/MEHDImp4/FINORA/issues/new?template=bug_report.yml) ou un [Problème de Lecture](https://github.com/MEHDImp4/FINORA/issues/new?template=playback_issue.yml).
- 💡 Vous avez une idée d'amélioration ? Proposez une [Demande de Fonctionnalité](https://github.com/MEHDImp4/FINORA/issues/new?template=feature_request.yml).
- 💻 Vous souhaitez contribuer au code ? Consultez notre [Guide de Contribution (CONTRIBUTING.fr.md)](CONTRIBUTING.fr.md) et notre [Code de Conduite (CODE_OF_CONDUCT.fr.md)](CODE_OF_CONDUCT.fr.md).

---

## 💬 Communauté & Support

- **Discussions GitHub** : Échangez sur vos configurations serveur, vos idées et vos retours dans les [Discussions](https://github.com/MEHDImp4/FINORA/discussions).
- **Suivi des Issues** : Suivez les correctifs en cours et les évolutions prévues dans les [Issues](https://github.com/MEHDImp4/FINORA/issues).
- **Releases** : Téléchargez les versions officielles directement depuis [Releases](https://github.com/MEHDImp4/FINORA/releases).

---

## 📄 Licence & Remerciements

FINORA est un logiciel libre publié sous licence **GNU General Public License v3.0** (GPL-3.0). Consultez le fichier [LICENSE](LICENSE) pour plus de détails.

### Remerciements
- L'incroyable équipe et communauté du projet [Jellyfin](https://jellyfin.org/) pour la création du meilleur serveur multimédia libre.
- Les équipes de [Expo](https://expo.dev/) et [React Native](https://reactnative.dev/) pour leur écosystème mobile moderne.
