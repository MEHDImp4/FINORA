# FINORA — Regardez à votre façon

<p align="center">
  <img src="./assets/finora-logo-text.png" alt="Logo FINORA" width="380" />
</p>

<p align="center">
  <strong>Un client Jellyfin mobile cinématique et premium développé avec Expo &amp; React Native — fluide, privé, prêt pour le hors-ligne et pensé pour une expérience de streaming moderne.</strong><br>
  Développé avec Expo SDK 57, React Native 0.86 (Nouvelle Architecture &amp; Hermes) et TypeScript.
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
  <a href="#-démarrage-rapide-développeurs">🚀 <strong>Démarrage rapide</strong></a> •
  <a href="CONTRIBUTING.fr.md">🤝 <strong>Contribuer</strong></a> •
  <a href="https://github.com/MEHDImp4/FINORA/discussions">💬 <strong>Discussions</strong></a> •
  <a href="SECURITY.fr.md">🛡️ <strong>Sécurité</strong></a>
</p>

---

## 📖 Sommaire

- [Présentation](#-présentation)
- [FINORA en Action](#-finora-en-action)
- [Points Forts](#-points-forts)
- [Téléchargement & Installation](#-téléchargement--installation)
- [Fonctionnalités Détaillées](#-fonctionnalités-détaillées)
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

**FINORA** est un client multimédia personnel open-source conçu pour offrir une expérience de streaming mobile moderne et cinématique pour [Jellyfin](https://jellyfin.org/).

Développé avec Expo SDK 57, React Native 0.86 et TypeScript, il associe lecture vidéo accélérée matériellement, gestionnaire de téléchargements hors-ligne résilient, navigation réactive et stockage sécurisé des identifiants au sein d'une interface soignée.

**Notre engagement central :**
> **Ouvrez FINORA → Parcourez instantanément → Choisissez un contenu → Lancez la lecture → Visionnez en toute fluidité → Reprenez n'importe où.**

- **Navigation Fluide** : Optimisée pour les écrans à haut rafraîchissement (jusqu'à 120 Hz) grâce à la Nouvelle Architecture React Native (moteur de rendu Fabric et runtime Hermes).
- **Design Sombre Cinématique** : Esthétique sombre OLED soignée, navigation fluide inspirée de Netflix, cartes épurées et hiérarchie visuelle claire.
- **Moteur Vidéo Natif** : Propulsé par `expo-video` (basé sur AndroidX Media3 / ExoPlayer sur Android et AVPlayer sur iOS) avec négociation automatisée des flux.
- **Confidentialité par Défaut** : Jetons d'authentification stockés dans le Keystore matériel selon les capacités de l'appareil, mots de passe purgés de la mémoire après connexion et zéro traceur tiers.

---

## 📱 FINORA en Action

<!--
  INSTRUCTIONS POUR LES CAPTURES D'ÉCRAN :
  Pour intégrer les captures d'écran dans cette section :
  1. Réalisez des captures au format 9:16 ou 9:19.5 depuis un appareil ou émulateur.
  2. Enregistrez-les dans le dossier `docs/screenshots/` avec les noms suivants :
     - 01-home.png (Flux d'accueil et carrousels)
     - 02-details.png (Fiche détaillée et liste des épisodes)
     - 03-player.png (Lecteur vidéo avec contrôles gestuels)
     - 04-search.png (Recherche et filtres de bibliothèques)
     - 05-downloads.png (Gestionnaire de téléchargements hors-ligne)
  3. Décommentez les balises img ci-dessous :

  <p align="center">
    <img src="docs/screenshots/01-home.png" alt="Écran d'Accueil" width="19%" />
    <img src="docs/screenshots/02-details.png" alt="Fiche Média" width="19%" />
    <img src="docs/screenshots/03-player.png" alt="Lecteur Vidéo" width="19%" />
    <img src="docs/screenshots/04-search.png" alt="Recherche & Bibliothèque" width="19%" />
    <img src="docs/screenshots/05-downloads.png" alt="Téléchargements Hors-Ligne" width="19%" />
  </p>
-->

| 🏠 Accueil | 🎬 Fiches Détails | ▶️ Lecteur Vidéo | 🔍 Recherche | 📥 Téléchargements |
| :---: | :---: | :---: | :---: | :---: |
| *Bannières héros, reprise de lecture et carrousels* | *Métadonnées riches, sélecteur de saisons et grille d'épisodes* | *Lecture native, gestes intuitifs et saut de chapitres* | *Recherche instantanée multi-bibliothèques avec filtres* | *Gestionnaire d'arrière-plan avec reprise automatique* |

---

## ✨ Points Forts

- 🎬 **Lecture Jellyfin Native** — Décodage matériel basse consommation via AndroidX Media3 (ExoPlayer) et AVPlayer.
- 📥 **Téléchargements Hors-Ligne Résilients** — Mise en cache d'arrière-plan avec reprise HTTP Range en cas de coupure réseau ou redémarrage de l'application.
- 🔐 **Stockage Sécurisé des Identifiants** — Stockage matériel sécurisé (`expo-secure-store`) ; mots de passe immédiatement détruits de la mémoire vive après authentification.
- 🔎 **Recherche Rapide en Bibliothèque** — Suggestions instantanées à la frappe et isolation de l'historique par utilisateur et par serveur.
- 🎞️ **Saut d'Intros et de Génériques** — Boutons de saut dynamiques synchronisés avec les marqueurs de chapitres Jellyfin.
- 🔊 **Pistes Audio & Sous-Titres Multiples** — Sélection fluide des pistes et calque de rendu de sous-titres dédié (SRT, WebVTT, styles ASS).
- 📱 **Interface Responsive Moderne** — Affichage adaptatif pour smartphones en modes portrait, paysage et terminaux pliables.
- 🚫 **Confidentialité Stricte** — Aucune publicité, aucune mesure télémétrique et aucun traqueur tiers.

---

## 📥 Téléchargement & Installation

### Android (APK Direct)

<p align="center">
  <a href="https://github.com/MEHDImp4/FINORA/releases/latest">
    <img src="https://img.shields.io/badge/Télécharger-Dernier%20APK-6366f1?style=for-the-badge&logo=android&logoColor=white" alt="Télécharger le dernier APK" height="40" />
  </a>
</p>

Des fichiers APK autonomes sont générés et publiés automatiquement à chaque version :

| Canal de Build | Recommandé Pour | Lien de Téléchargement |
|---|---|---|
| **Version Stable (Latest)** | Tous les utilisateurs recherchant une stabilité maximale | [**Télécharger le dernier APK**](https://github.com/MEHDImp4/FINORA/releases/latest) |
| **Toutes les Releases** | Historique des versions, préversions et notes de mise à jour | [**Voir toutes les releases**](https://github.com/MEHDImp4/FINORA/releases) |

#### Guide d'installation sous Android :
1. Téléchargez le fichier `.apk` directement sur votre appareil depuis la [page de la dernière version](https://github.com/MEHDImp4/FINORA/releases/latest).
2. Ouvrez le fichier téléchargé depuis le centre de notifications ou votre explorateur de fichiers.
3. Si le système vous y invite, autorisez l'option **"Installer des applications de sources inconnues"** pour votre navigateur.
4. Appuyez sur **Installer** et lancez FINORA.

### iOS

En raison des règles encadrant les clients multimédias tiers sur iOS, l'installation requiert une compilation depuis le code source :
1. Clonez le dépôt sur un ordinateur macOS équipé de Xcode.
2. Exécutez `npx expo run:ios` pour compiler et déployer l'application sur un iPhone connecté ou le simulateur iOS.

---

## 🎬 Fonctionnalités Détaillées

### 1. Moteur de Lecture Vidéo Moderne (`FinoraPlayerEngine`)
- **AndroidX Media3 & AVPlayer** : Décodage vidéo natif avec accélération matérielle et faible utilisation mémoire.
- **Négociation Automatisée du Flux** : Pipeline de décision (`PlaybackPlanner`) priorisant *Direct Play > Direct Stream > Transcodage* selon le profil de l'appareil.
- **Contrôles Gestuels Intuitifs** :
  - Balayage vertical sur le bord gauche pour ajuster la **luminosité de l'écran**.
  - Balayage vertical sur le bord droit pour régler le **volume audio**.
  - Double appui sur les bords gauche/droit pour un **saut de 10 secondes** avant/arrière.
- **Saut d'Intros et de Génériques** : Détection automatique des marqueurs de chapitres Jellyfin pour les intros, récapitulatifs et génériques.
- **Pistes Audio & Sous-Titres** : Prise en charge des formats SubRip (SRT), WebVTT, sous-titres d'images (PGS) et styles Advanced SubStation Alpha (ASS) via un calque dédié.
- **Synchronisation de la Reprise** : Transmission en temps réel de la progression de lecture et points de reprise synchronisés avec le serveur Jellyfin.

### 2. Design d'Interface & Navigation
- **Bannières Héros Dynamiques** : Fonds visuels immersifs, logos haute résolution et barre de progression de lecture intégrée.
- **Mise en Cache d'Images Optimisée** : Propulsé par `expo-image` avec cache multiniveau (RAM et disque), décodage progressif et placeholders Blurhash anti-saccades.
- **Disposition Adaptative** : Grilles et carrousels fluides s'adaptant automatiquement aux orientations portrait, paysage et aux formats pliables.

### 3. Gestionnaire de Téléchargements Hors-Ligne
- **Téléchargements en Arrière-Plan** : Utilise les services de premier plan Android (`react-native-background-actions`) pour maintenir les transferts lorsque l'application est en veille.
- **Reprise Automatique (HTTP Range)** : Reprise des téléchargements interrompus sans réinitialiser le transfert au début du fichier.
- **Stockage Isolé dans le Bac à Sable** : Médias et métadonnées stockés dans le stockage privé de l'application (`expo-file-system`) avec indexation locale étanche par utilisateur et serveur.

### 4. Découverte & Recherche en Bibliothèque
- **Recherche Instantanée** : Résultats rapides en direct, suggestions automatiques et historique récent.
- **Isolation Multi-Serveurs** : Historiques, index de téléchargements et préférences séparés hermétiquement par compte et par serveur Jellyfin.
- **Métadonnées Détaillées** : Distribution des acteurs, notes de la communauté, studios et indicateurs de qualité (4K, HDR, 1080p, audio 5.1).

### 5. Architecture de Sécurité Zéro-Trust
- **Keystore Matériel** : Jetons d'accès conservés dans le stockage sécurisé matériel (`expo-secure-store`) selon les fonctionnalités de l'appareil.
- **Hygiène Mémoire** : Mots de passe supprimés de la mémoire JavaScript dès l'authentification réussie auprès du serveur.
- **Journaux Réseau Protégés** : Masquage systématique des en-têtes d'autorisation, mots de passe et jetons dans les logs (`[REDACTED]`).
- **Absence de Télémétrie** : Aucun outil analytique, aucune publicité et aucun traqueur comportemental.

### 6. Notifications d'Arrière-Plan
- Tâches de fond périodiques (`expo-background-task`) pour signaler l'arrivée de nouveaux films, saisons et épisodes sur votre serveur Jellyfin.

---

## 🛠️ Technologies Utilisées

| Couche | Technologie | Rôle / Justification |
|---|---|---|
| **Framework** | [Expo SDK 57](https://expo.dev) | Plugins de compilation managés, écosystème natif moderne |
| **Runtime** | [React Native 0.86+](https://reactnative.dev) + [React 19](https://react.dev) | Composants d'interface natifs, architecture de rendu moderne |
| **Architecture**| Nouvelle Architecture (Fabric + Bridgeless) | Appels synchrones natifs via JSI, sans surcharge de sérialisation |
| **Moteur JS** | [Hermes](https://hermesengine.dev) | Démarrage rapide et empreinte RAM contenue grâce au bytecode précompilé |
| **Routage** | [Expo Router v4](https://docs.expo.dev/router/introduction/) | Navigation typée par fichiers avec transitions d'écrans natives |
| **Lecteur** | [`expo-video`](https://docs.expo.dev/versions/latest/sdk/video/) | AndroidX Media3 / ExoPlayer sous Android et AVPlayer sous iOS |
| **Images** | [`expo-image`](https://docs.expo.dev/versions/latest/sdk/image/) | Mise en cache mémoire/disque native et prise en charge Blurhash |
| **État** | [TanStack Query v5](https://tanstack.com/query) + [Zustand](https://zustand.docs.pmnd.rs) | Cache d'état serveur et stores d'état atomiques légers |
| **Sécurité** | [`expo-secure-store`](https://docs.expo.dev/versions/latest/sdk/securestore/) | Keystore matériel (Android Keystore / iOS Keychain) selon l'appareil |
| **SDK** | [`@jellyfin/sdk`](https://github.com/jellyfin/jellyfin-sdk-typescript) | Client API officiel du projet Jellyfin en TypeScript typé |
| **Langage** | [TypeScript](https://www.typescriptlang.org/) | Typage strict garantissant la robustesse de l'ensemble du projet |

---

## 🏗️ Architecture du Projet

FINORA applique une séparation rigoureuse des responsabilités pour préserver la maintenabilité et la testabilité du code :

```text
Architecture FINORA
┌────────────────────────────────────────────────────────┐
│                   Pages Expo Router                    │  (src/app/)
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
├── assets/               # Visuels, logos officiels et icônes
├── docs/                 # Documentation technique et listes de vérification
├── src/
│   ├── app/              # Routes et écrans typés Expo Router
│   │   ├── (tabs)/       # Navigation principale par onglets (Accueil, Recherche, Téléchargements, Paramètres)
│   │   ├── details/      # Fiches détaillées des médias et séries
│   │   └── player/       # Route dédiée au lecteur vidéo plein écran
│   ├── core/             # Socle fondamental et infrastructure
│   │   ├── jellyfin/     # Référentiel d'authentification, clients SDK et restauration de session
│   │   ├── network/      # Client HTTP sécurisé, journalisation et état réseau
│   │   ├── repositories/ # Référentiels pour médias, lecture, utilisateurs et données utilisateur
│   │   ├── security/     # Chiffrement Keystore, masquage des secrets et stockage des jetons
│   │   └── storage/      # Gestionnaires de stockage sécurisé et préférences
│   ├── features/         # Modules fonctionnels de l'application
│   │   ├── details/      # Détails des médias, sélecteur de saisons, cartes d'épisodes
│   │   ├── home/         # Bannière héros, carrousels de médias, reprise de lecture
│   │   ├── library/      # Grille adaptative de médias, filtres et tri
│   │   ├── notifications/# Notifications d'arrière-plan pour nouveaux contenus
│   │   ├── offline/      # DownloadManager, service d'arrière-plan, reprise de téléchargement
│   │   ├── onboarding/   # Découverte de serveur et authentification
│   │   ├── player/       # FinoraPlayerEngine, contrôles, gestes, sous-titres
│   │   ├── search/       # Recherche en direct, historique, suggestions
│   │   └── settings/     # Diagnostics serveur, préférences de lecture et sous-titres
│   ├── stores/           # Stores atomiques Zustand (lecteur, réglages, téléchargements)
│   └── components/       # Composants du système de design FINORA (cartes FinoraCard, modales)
├── .github/              # Modèles d'issues, de PR et workflows d'intégration continue
└── package.json
```

---

## 🚀 Démarrage Rapide (Développeurs)

> ⚠️ **FINORA nécessite un build de développement Expo — l'application ne peut pas s'exécuter dans Expo Go.**  
> Les modules natifs exploités par FINORA (`expo-video`, `expo-secure-store`, `expo-background-task`, etc.) exigent une compilation native.

### Prérequis

- [Node.js](https://nodejs.org/) v22+ (LTS recommandée)
- [npm](https://www.npmjs.com/) v10+
- [JDK 17](https://adoptium.net/) (Temurin 17 recommandé)
- [Android Studio](https://developer.android.com/studio) avec Android SDK Platform 35+ et Android NDK
- Un serveur [Jellyfin](https://jellyfin.org/) opérationnel

### Configuration Locale

1. **Cloner le dépôt :**
   ```bash
   git clone https://github.com/MEHDImp4/FINORA.git
   cd FINORA
   ```

2. **Installer les dépendances :**
   ```bash
   npm install
   ```

3. **Lancer sous Android (génère le projet natif et lance le build de dev) :**
   ```bash
   npx expo run:android
   ```

4. **Lancer sous iOS (environnement macOS requis) :**
   ```bash
   npx expo run:ios
   ```

5. **Démarrer le serveur de développement Metro :**
   ```bash
   npx expo start --dev-client
   ```

### Scripts npm Utiles

| Commande | Action |
|---|---|
| `npm start` | Démarre le bundler de développement Metro |
| `npm test` | Exécute l'ensemble de la suite de tests Jest (79 suites, 489 tests) |
| `npm run typecheck` | Vérifie le typage TypeScript en mode strict sans générer de fichiers |
| `npm run android` | Compile et démarre le build de développement natif Android |
| `npm run ios` | Compile et démarre le build de développement natif iOS |

---

## 🧪 Tests Automatisés & Intégration Continue

FINORA intègre une suite de tests automatisés couvrant les référentiels, la planification de lecture, la reprise de téléchargement et les gestionnaires d'état :

```bash
# Exécuter les tests unitaires et d'intégration
npm test

# Valider le typage TypeScript strict
npm run typecheck
```

L'intégration continue est déclenchée sur chaque push et pull request vers la branche `master` via GitHub Actions :
- **Validation TypeScript stricte** (0 erreur)
- **Exécution des tests Jest** (79 suites, 489 tests validés)
- **Audit de sécurité des dépendances** (`npm audit`)
- **Contrôle d'intégrité Expo Doctor**
- **Génération automatisée des APK autonomes** via GitHub Actions (`build-apk.yml`)

---

## 🛡️ Sécurité & Confidentialité

- **Zéro Secret en Texte Clair** : Les mots de passe sont détruits de la mémoire vive dès l'authentification et ne sont jamais journalisés ni persistés.
- **Keystore Chiffré Matériellement** : Les jetons d'accès sont stockés dans le stockage sécurisé de l'appareil (`expo-secure-store`) selon le matériel disponible.
- **Journaux Réseau Sanitizés** : Tous les logs de requêtes et de débogage masquent automatiquement les en-têtes d'autorisation, jetons et identifiants (`[REDACTED]`).
- **Aucun Traqueur Tiers** : Ni télémétrie, ni analytique externe, ni profilage d'usage.
- **Signalement Responsable** : Consultez notre [Politique de Sécurité](SECURITY.fr.md) pour signaler une vulnérabilité de manière confidentielle.

---

## 🤝 Contribuer au Projet

Les contributions de la communauté sont les bienvenues !
- 🐛 Vous constatez un problème ? Ouvrez un [Rapport de Bug](https://github.com/MEHDImp4/FINORA/issues/new?template=bug_report.yml) ou un [Signalement de Problème de Lecture](https://github.com/MEHDImp4/FINORA/issues/new?template=playback_issue.yml).
- 💡 Vous souhaitez proposer une amélioration ? Soumettez une [Demande de Fonctionnalité](https://github.com/MEHDImp4/FINORA/issues/new?template=feature_request.yml).
- 💻 Vous souhaitez contribuer au code ? Consultez notre [Guide de Contribution](CONTRIBUTING.fr.md) et notre [Code de Conduite](CODE_OF_CONDUCT.fr.md).

---

## 💬 Communauté & Support

- **Discussions GitHub** : Échangez sur vos configurations serveur, vos idées et vos retours dans les [Discussions](https://github.com/MEHDImp4/FINORA/discussions).
- **Suivi des Problèmes** : Suivez les résolutions de bugs et évolutions dans les [Issues](https://github.com/MEHDImp4/FINORA/issues).
- **Propositions & Idées** : Échangez autour de nouvelles fonctionnalités via les [Demandes de Fonctionnalités](https://github.com/MEHDImp4/FINORA/issues/new?template=feature_request.yml).
- **Releases** : Téléchargez les versions publiées et consultez les notes de mise à jour dans les [Releases](https://github.com/MEHDImp4/FINORA/releases).

---

## 📄 Licence & Remerciements

FINORA est un logiciel libre distribué sous licence **GNU General Public License v3.0** (GPL-3.0). Consultez [LICENSE](LICENSE) pour plus d'informations.

### Remerciements
- L'équipe et la communauté du projet [Jellyfin](https://jellyfin.org/) pour le développement de leur système multimédia open-source.
- Les équipes de [Expo](https://expo.dev/) et de [React Native](https://reactnative.dev/) pour l'écosystème de développement mobile moderne.
