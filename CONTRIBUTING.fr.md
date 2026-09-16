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
# Exécuter l'ensemble des 77 suites de tests automatisés :
npm test

# Exécuter les tests en mode interactif continu pendant le développement :
npm run test:watch

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

## 🔀 Flux Git & Règles de Commits

### Gestion des Branches
1. Créez toujours votre branche de travail à partir de `master` :
   ```bash
   git checkout master
   git pull upstream master
   git checkout -b fix/synchro-sous-titres
   ```

### Conventions de Commits (Conventional Commits)
Nous appliquons le standard [Conventional Commits](https://www.conventionalcommits.org/fr/) :

- `feat:` Nouvelle fonctionnalité utilisateur
- `fix:` Correction d'un bug
- `perf:` Optimisation de performance
- `refactor:` Restructuration du code sans changement fonctionnel
- `test:` Ajout ou modification de tests unitaires
- `docs:` Documentation
- `chore:` Tâches de maintenance, dépendances, configuration CI

**Exemples :**
- `feat(player): ajout du geste de réglage de luminosité`
- `fix(offline): reprise du téléchargement après perte de réseau`
- `docs(readme): mise à jour du lien vers le guide de contribution`

---

## 🚀 Soumettre une Pull Request

1. Poussez votre branche sur votre fork GitHub :
   ```bash
   git push origin fix/synchro-sous-titres
   ```
2. Ouvrez une Pull Request vers la branche `master` du dépôt principal.
3. Remplissez consciencieusement le **Modèle de Pull Request**.
4. Assurez-vous que tous les checks CI (tests unitaires, TypeScript strict, validation de titre) passent avec succès.
5. Notre équipe examinera votre PR avec soin et vous accompagnera pour son intégration !

Merci de participer à faire de FINORA le meilleur lecteur multimédia Jellyfin ! 🎬🍿
