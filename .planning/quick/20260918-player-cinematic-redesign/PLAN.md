# Plan — Refonte Visuelle & UX Premium du Player Vidéo FINORA

## Objectif
Refondre visuellement et ergonomiquement le lecteur vidéo FINORA pour en faire une expérience cinématique, haut de gamme, fluide et minimaliste digne de Netflix / Prime Video / Crunchyroll avec l'ADN FINORA, sans casser aucune logique métier ni aucun test unitaire.

## 1. Audit du Player Actuel
- **Absence de dégradés d'overlay** : L'écran actuel utilise un conteneur d'overlay transparent sans ombres de fond ni vignettage linéaire. Sur des scènes claires ou chargées, les contrôles et les textes perdent en lisibilité.
- **Seek bar élémentaire** : Track de 4px simple, couleur plate, poignée statique, temps au-dessus basiques, pas de fluidité ni de sensation tactile moderne.
- **Top bar & header condensé** : Bouton retour et menu basiques, informations séries un peu serrées, icônes sans micro-surfaces douces translucides.
- **Contrôles centraux rigides** : Boutons de saut 10s et play/pause standard sans effet de respiration, de halo doux ou d'animation tactile.
- **Modals & Bottom Sheets** : `TrackSelectionModal` et menus secondaires un peu bruts avec des séparateurs durs et un design qui mériterait une finition glass/sombre beaucoup plus soignée (coins arrondis, pill tabs élégants, hiérarchie typographique fine).
- **États Pause, Loading & Error** : Écrans fonctionnels mais austères (simple ActivityIndicator au centre, boîte d'erreur basique).

## 2. Nouvelle Architecture Visuelle & Composants
- `PlayerTopBar` : Dégradé descendant sombre immersif (`expo-linear-gradient`), retour dynamique, titre média & métadonnées hiérarchisées (badge série, tag saison/épisode), badges direct-play/stream fluides, actions rapides unifiées.
- `PlayerCenterControls` : Triade cinématique seek -10s / Play-Pause héroïque / seek +10s avec anneau doux translucide, micro-effets de press, typographie 10s gravée dans le bouton.
- `PlayerTimeline` (Seek Bar Premium) : Hauteur progressive au touch/scrub, dégradé de buffer visible, temps actuel & temps restant/total précis, thumb lumineux avec glow subtil, support chapitres visuels par découpes / marqueurs sur la piste.
- `PlayerBottomBar` : Timeline intégrée avec row d'actions secondaires épurées ou rapides, dans un dégradé montant cinématique.
- `TrackSelectionModal` & `StatsForNerdsModal` : Redesign dark glass / luxury streaming (poignée de swipe élégante, tabs pills modernes, row sélectionnée avec accent Finora et micro-checkmark).
- `PlayerLoadingState` & `PlayerErrorState` : Spinner pulsé cinématique, badge élégant, écran pause enrichi avec fade subtil.

## 3. Plan d'Exécution
1. Mettre à jour `TimelineScrubber.tsx` pour en faire une timeline tactile de classe mondiale (animations de scrubbing, marqueurs de chapitres discrets, ergonomie soignée, préservation stricte de tous les callbacks et testIDs).
2. Refondre `CinematicOverlay.tsx` avec dégradés haut/bas fluides (`expo-linear-gradient`), disposition en 3 zones limpides, boutons glass raffinés, menus plus élégants.
3. Créer ou raffiner les composants de support (`PlayerTopBar`, `PlayerCenterControls`, ou structure modulaire dans le player).
4. Sublimer `TrackSelectionModal.tsx` et les états de feedback (`PlayerGestures.tsx`, HUD de volume/luminosité plus discret et beau).
5. Sublimer l'état de chargement et d'erreur dans `PlayerScreen.tsx`.
6. Valider la compilation TypeScript et l'intégralité de la suite de tests (85 suites / 562 tests).
