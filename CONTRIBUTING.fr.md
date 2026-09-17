# Contribuer à FINORA

> 🇬🇧 *An English version of this guide is available in [CONTRIBUTING.md](CONTRIBUTING.md).*

Merci de vous intéresser au projet **FINORA** et de souhaiter y contribuer ! 🎉

FINORA est un client de streaming personnel pour [Jellyfin](https://jellyfin.org/) développé avec Expo SDK 57, React Native 0.86 (Nouvelle Architecture & Hermes) et TypeScript.

Notre ambition centrale est d'offrir une expérience utilisateur fluide et sans compromis :
> **Ouvrez FINORA → Parcourez instantanément → Choisissez un contenu → Lancez la lecture → Visionnez en toute fluidité → Reprenez n'importe où.**

Merci de lire ce guide avant de soumettre du code ou d'ouvrir une issue.

---

## 📜 Code de Conduite

En participant à ce projet, vous vous engagez à respecter notre [Code de Conduite (CODE_OF_CONDUCT.fr.md)](CODE_OF_CONDUCT.fr.md). Merci de faire preuve d'empathie, de bienveillance et de respect envers chaque membre de la communauté.

---

## 🚀 Comment Contribuer ?

### 1. Signaler des Bugs
- Vérifiez d'abord les [Issues GitHub existantes](https://github.com/MEHDImp4/FINORA/issues) pour éviter les doublons.
- Utilisez notre [Formulaire de Rapport de Bug](https://github.com/MEHDImp4/FINORA/issues/new?template=bug_report.yml) ou notre [Formulaire de Problème de Lecture](https://github.com/MEHDImp4/FINORA/issues/new?template=playback_issue.yml).
- Fournissez des étapes de reproduction claires, votre modèle d'appareil, la version de Jellyfin et les logs (sanitizés sans mot de passe ni token).

### 2. Suggérer des Fonctionnalités
- Nous adorons les propositions qui améliorent la réactivité, le design ou la fiabilité du lecteur !
- Utilisez notre [Formulaire de Demande de Fonctionnalité](https://github.com/MEHDImp4/FINORA/issues/new?template=feature_request.yml).
- Expliquez le besoin utilisateur et partagez des maquettes ou références si possible.

### 3. Proposer du Code (Pull Requests)
Que vous corrigiez une anomalie ou ajoutiez une amélioration, suivez le flux de travail décrit ci-dessous.

---

## 💻 Configuration de l'Environnement Local

### Prérequis
1. **Node.js** : v22+ (LTS recommandé)
2. **npm** : v10+
3. **Java** : JDK 17 (ex: Eclipse Temurin 17)
4. **Android Studio** : Android SDK Build-Tools 35+, Platform 35+, NDK
5. **EAS CLI** (optionnel pour les builds cloud) : `npm install -g eas-cli`
6. Un serveur [Jellyfin](https://jellyfin.org/) actif pour les tests réels.

> ⚠️ **Note importante :** FINORA utilise des TurboModules natifs de la Nouvelle Architecture React Native (`expo-video`, `expo-secure-store`, etc.). L'application **ne peut pas** s'exécuter dans Expo Go : vous devez obligatoirement utiliser un **build de développement Expo natif**.

### Récupération du Code

```bash
# 1. Forkez le dépôt sur GitHub, puis clonez votre fork :
git clone https://github.com/<VOTRE_PSEUDO>/FINORA.git
cd FINORA

# 2. Ajoutez le dépôt distant upstream :
git remote add upstream https://github.com/MEHDImp4/FINORA.git

# 3. Installez les dépendances npm :
npm install
```

### Exécution sur Android

```bash
# Générer le projet natif Android et compiler le build de développement :
npx expo run:android

# Une fois l'application installée sur votre appareil ou émulateur, lancez Metro :
npx expo start --dev-client
```

### Exécution sur iOS (ordinateur macOS requis)

```bash
# Compiler et lancer sur simulateur iOS :
npx expo run:ios
```

---

## 🧪 Tests & Vérifications

FINORA applique une rigueur stricte sur les tests automatisés et le typage TypeScript. Tous les voyants doivent être au vert pour qu'une Pull Request soit acceptée :

```bash
# Exécuter l'ensemble des 79 suites de tests automatisés :
npm test

# Exécuter les tests en mode interactif continu pendant le développement :
npm test -- --watch

# Valider le typage TypeScript en mode strict :
npm run typecheck
```

---

## 📐 Architecture & Bonnes Pratiques de Code

Pour préserver des animations à 60/120 FPS et une stabilité irréprochable :

### 1. Séparation des Couches
```text
Écran (Présentation & Animations)
  └── Hook Custom (Cycle de vie & État local)
        └── TanStack Query / Cas d'usage (Données & Règles métier)
              └── Référentiel Repository (Abstraction du domaine)
                    └── Jellyfin SDK & Moteurs de stockage
```
- Les **écrans** se concentrent uniquement sur l'affichage et les animations.
- Les **hooks** orchestrent l'état local et les requêtes.
- Les **référentiels** encapsulent les appels réseau, le cache et la base de données.

### 2. Sécurité & Données Sensibles
- **Ne stockez jamais de jetons d'authentification ou de mots de passe dans `AsyncStorage` ou dans SQLite en clair.**
- Utilisez obligatoirement `expo-secure-store` pour les jetons d'accès.
- Ne journalisez jamais de mots de passe ou de tokens. Tout en-tête d'autorisation dans les logs doit afficher `[REDACTED]`.

### 3. Performance de l'Interface & Animations
- Minimisez les re-renders JavaScript. Utilisez les sélecteurs TanStack Query plutôt que de stocker de gros payloads API dans l'état global.
- Utilisez systématiquement `expo-image` pour charger les affiches et bannières (jamais la balise native basique `<Image />`).
- Exécutez les animations gestuelles sur le thread UI via React Native Reanimated (v3).

---

## 🤖 Contributions Assistées par IA

FINORA accueille favorablement les contributions assistées par des outils modernes d'intelligence artificielle (tels que GitHub Copilot, Claude Code, Cursor, Codex, ChatGPT, Gemini, etc.). Nous reconnaissons que ces assistants accélèrent l'exploration du code, la rédaction de documentation, le débogage et l'écriture de tests.

Cependant, **l'assistance par IA ne remplace en aucun cas la relecture, les tests et la compréhension humaine.** Chaque contributeur demeure entièrement responsable de chaque ligne de code, de test et de documentation qu'il soumet.

### 1. Périmètre de Déclaration
Nous distinguons une assistance ponctuelle d'une contribution substantielle :

- **Aucune déclaration requise** :
  - Autocomplétion de noms de variables, fonctions ou types
  - Formatage de syntaxe ou corrections de linter
  - Suggestions automatiques d'imports
  - Corrections mineures d'orthographe ou de formulation
- **Déclaration requise** :
  - Implémentation complète d'une fonctionnalité ou d'un composant
  - Correction significative de bug et algorithmes complexes
  - Refactorisation d'architecture, de stores ou de référentiels
  - Génération de suites de tests complètes
  - Rédaction d'une part substantielle de la documentation

Lors de la soumission d'une Pull Request impliquant une assistance IA significative, cochez simplement la case correspondante dans la section **AI Assistance** du modèle de PR et décrivez brièvement l'outil employé et son rôle.

> ℹ️ **Confidentialité & Prompts** : FINORA ne vous demandera **jamais** de partager vos prompts privés, historiques de discussion, clés API ou conversations personnelles. Une brève description honnête d'une phrase suffit amplement.

### 2. Responsabilités du Contributeur
Avant de soumettre du code assisté par IA, vous devez vous assurer des points suivants :

1. **Compréhension Complète** : Vous devez comprendre personnellement chaque modification soumise. Ne soumettez jamais de code que vous ne seriez pas en mesure d'expliquer, de déboguer ou de maintenir lors de la revue de code.
2. **Vérification des APIs (Anti-Hallucination)** : Vérifiez que toutes les APIs, méthodes SDK, options et endpoints Jellyfin référencés existent réellement. Les mainteneurs ne perdront pas de temps à déboguer des fonctions inexistantes ou des bibliothèques inventées.
3. **Tests Obligatoires** : Toute contribution doit impérativement passer les vérifications locales :
   ```bash
   npm test
   npm run typecheck
   ```
   *Affirmer « Je n'ai pas testé parce que l'IA l'a généré » est inacceptable et entraînera la fermeture immédiate de la PR.*
4. **Validation Visuelle de l'Interface** : Pour toute modification graphique, testez le rendu sur appareil physique ou émulateur. Fournissez des captures d'écran ou vidéos avant/après, et précisez les plateformes réellement testées.
5. **Contrôle des Dépendances Suggérées par l'IA** : Si un assistant IA recommande un nouveau paquet npm, vérifiez que :
   - Le paquet est activement maintenu avec une licence open-source compatible.
   - Il est compatible avec React Native 0.86+ (Nouvelle Architecture Fabric / TurboModules) et Expo SDK 57.
   - Une dépendance existante dans `package.json` ne remplit pas déjà ce rôle.
6. **Sécurité & Confidentialité Stricte** :
   - **Ne jamais transmettre de données sensibles aux IA** : Les jetons d'accès Jellyfin, identifiants, mots de passe de serveur, clés de signature Android ou secrets `.env` ne doivent **jamais** être transmis à une IA ni commités dans le dépôt.
   - Les logs internes et requêtes réseau doivent être rigoureusement sanitizés (`[REDACTED]`).

> [!IMPORTANT]
> Le code généré par IA doit être consciencieusement relu et testé par le contributeur avant toute soumission. Déposer en masse du code généré par IA non vérifié ou non testé entraînera la fermeture de la Pull Request.

---

## 🔀 Workflow de Contribution
 
```text
Fork du Dépôt
      │
      ▼
Création de Branche Thématique (ex: feat/offline-download-ui)
      │
      ▼
Implémentation & Ajout de Tests
      │
      ▼
Validation Locale (npm test && npm run typecheck)
      │
      ▼
Commit (Conventional Commits)
      │
      ▼
Push vers le Fork & Ouverture de la PR
      │
      ▼
Vérifications Automatisées CI & Linters
      │
      ▼
Revue par les Mainteneurs & Retouches
      │
      ▼
Squash & Merge dans master
```

### Conventions de Nommage des Branches
Créez systématiquement votre branche depuis `master` :
```bash
git checkout master
git pull upstream master
git checkout -b <type>/<description>
```

**Exemples de noms de branches recommandés :**
- `feat/offline-download-ui`
- `fix/player-audio-track`
- `perf/carousel-render-optimization`
- `docs/readme-installation`

### Conventions de Commits (Conventional Commits)
Nous appliquons la spécification [Conventional Commits](https://www.conventionalcommits.org/) :

- `feat:` Nouvelle fonctionnalité visible par l'utilisateur
- `fix:` Correction d'un bug
- `perf:` Optimisation des performances ou de la mémoire
- `refactor:` Réorganisation du code sans changement fonctionnel
- `docs:` Modifications apportées à la documentation
- `test:` Ajout ou mise à jour de tests
- `chore:` Tâches de maintenance, dépendances, configuration
- `ci:` Workflows d'intégration continue ou actions GitHub
- `security:` Correctif de sécurité ou durcissement

**Exemples :**
- `feat(offline): add background resume support`
- `fix(player): sync playback position correctly`
- `docs: improve Android setup instructions`
- `perf(home): optimize carousel memoization`

---

## 🚀 Soumettre une Pull Request

1. Poussez votre branche sur votre fork GitHub :
   ```bash
   git push origin feat/offline-download-ui
   ```
2. Ouvrez une Pull Request ciblant la branche `master` du dépôt principal.
3. Remplissez scrupuleusement le **Modèle de Pull Request**.
4. Vérifiez que tous les contrôles automatisés CI passent au vert.
5. Un mainteneur étudiera votre proposition, suggérera d'éventuels ajustements et validera l'intégration !

Merci de contribuer à faire de FINORA le meilleur client de streaming personnel ! 🎬🍿
