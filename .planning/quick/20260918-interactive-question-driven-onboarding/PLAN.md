# Quick Task: Interactive Question-Driven Onboarding with Fluid Animations

## Problem & Intent
The current onboarding flow is overly static and has non-direct/passive steps (Slide 1 was a static marketing page with passive pills, Slide 2 lumped too many controls together in one scroll view).
The user wants:
1. Every step/page of the onboarding to ask a clear, interactive question to the user so they make choices directly.
2. Fluid, cinematic animations across the onboarding experience (e.g. animated step transitions, fade-in / slide-in of question cards, interactive pulse / spring touch feedback, animated progress indicator bar/dots).

## Plan
1. **Interactive Step Structure (5 Focused, Question-Driven Steps)**:
   - **Step 0: Langue d'affichage (Display Language)**:
     - Question: "Quelle est votre langue ?" / "What is your language?"
     - Options: French 🇫🇷, English 🇬🇧 with instant reactive toggle & smooth checkmark transition.
   - **Step 1: Expérience & Vitesse (Watching Style & Speed)**:
     - Question: "Comment aimez-vous regarder ?" / "How do you prefer to watch?"
     - Options: "Direct Play instantané (Pas de transcodage)", "Mode Économie de bande passante", "Saut automatique des intros & génériques".
     - Sets Direct Play / autoSkipIntro preferences with interactive selection cards.
   - **Step 2: Langue audio & Sous-titres (Audio & Subtitle Preferences)**:
     - Question: "Quelles sont vos préférences de sous-titres ?" / "What are your subtitle preferences?"
     - Interactive question cards for Subtitle Mode (Smart / Toujours / Jamais) and preferred audio language (Français, English, 日本語, Langue originale).
   - **Step 3: Téléchargements & Notifications (Downloads & Alerts)**:
     - Question: "Comment souhaitez-vous gérer vos téléchargements ?" / "How do you want to handle downloads?"
     - Interactive choice cards for Default Download Quality (1080p Full HD, 720p HD, Qualité brute) and Notifications / Wi-Fi only.
   - **Step 4: Connexion au serveur Jellyfin (Server Connection)**:
     - Question: "Où se trouve votre serveur Jellyfin ?" / "Where is your Jellyfin server?"
     - Server input, auto-test, public profiles picker ("Qui regarde ?") or credentials.
2. **Fluid Animations**:
   - Animated step container using React Native's built-in `Animated` (fade + translate slide transitions on question containers, ensuring 60 FPS Hermes compatibility).
   - Smooth animated pagination progress bar (interpolating active slide width / position).
   - Card selection scale/spring micro-animations when selecting options.
3. **Localization (`fr.ts`, `en.ts`, `types.ts`)**:
   - Add concise, engaging question prompts and subtitles for each step.
4. **Verification**:
   - Update tests in `src/features/onboarding/__tests__/OnboardingScreen.test.tsx`.
   - Run unit tests (`npm test`).
   - Run TypeScript validation (`npx tsc --noEmit`).
