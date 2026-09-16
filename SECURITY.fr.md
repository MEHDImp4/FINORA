# Politique de Sécurité

> 🇬🇧 *An English version of this Security Policy is available in [SECURITY.md](SECURITY.md).*

L'équipe FINORA accorde une importance capitale à la sécurité et à la vie privée des utilisateurs. Nous vous remercions pour vos démarches de divulgation responsable des vulnérabilités.

---

## 🛡️ Versions Prises en Charge

Nous fournissons des correctifs de sécurité pour les versions suivantes de FINORA :

| Version | Prise en charge    | Notes |
| ------- | ------------------ | ----- |
| `master` | :white_check_mark: | Branche de développement actif |
| `v1.0.x` | :white_check_mark: | Ligne de versions stables actuelle |
| `< 1.0`  | :x:                | Versions de pré-développement antérieures |

---

## 🔒 Signaler une Vulnérabilité

> ⚠️ **MERCI DE NE JAMAIS SIGNALER DE VULNÉRABILITÉ DE SÉCURITÉ VIA UNE ISSUE PUBLIQUE GITHUB.**

Si vous découvrez une faille de sécurité ou une vulnérabilité potentielle dans FINORA, merci de nous la signaler de manière strictement confidentielle :

1. **GitHub Security Advisories (Méthode recommandée)** :
   - Rendez-vous sur l'onglet [Avis de Sécurité (Security Advisories)](https://github.com/MEHDImp4/FINORA/security/advisories) du dépôt.
   - Cliquez sur **"Report a vulnerability"** pour ouvrir un signalement confidentiel.
2. **Contact Direct** :
   - Si les avis de sécurité ne sont pas accessibles, contactez directement les mainteneurs via leur profil GitHub.

### Informations Utiles à Inclure
Afin de nous aider à reproduire et corriger rapidement la vulnérabilité, veuillez détailler :
- La nature de la faille (ex: fuite de jeton d'accès, stockage non chiffré, contournement d'authentification, injection).
- Les étapes précises pour reproduire le problème.
- Du code de preuve de concept (PoC) ou une capture réseau le cas échéant.
- L'impact potentiel et l'estimation de la sévérité.
- Les appareils et versions d'OS concernés.

### Délais & Engagements de Réponse
- **Accusé de réception** : Sous 48 heures ouvrées.
- **Confirmation & Triage** : Sous 5 jours ouvrés, avec confirmation de reproductibilité et évaluation du niveau de gravité.
- **Correctif & Publication coordonnée** : Nous élaborerons un correctif avant toute divulgation publique. Un crédit sera attribué à l'auteur du signalement lors de la release s'il le souhaite.

---

## 🔐 Architecture de Sécurité Native de FINORA

FINORA a été conçu selon des principes stricts de sécurité dès la conception (*Security by Design*) :
- **Keystore Matériel** : Les jetons d'authentification utilisateur sont stockés exclusivement dans le coffre-fort matériel de l'appareil (`Android Keystore` sur Android, `Keychain` sur iOS via `expo-secure-store`).
- **Hygiène Mémoire** : Les mots de passe sont immédiatement détruits de la mémoire vive JavaScript après la connexion au serveur.
- **Journaux Réseau Sanitizés** : Les journaux de débogage masquent systématiquement les en-têtes d'autorisation, tokens et identifiants (`[REDACTED]`).
- **Avertissement TLS / HTTPS** : Les connexions HTTP locales non chiffrées affichent un avertissement de sécurité explicite à l'utilisateur.
- **Zéro Télémétrie** : Aucun traqueur, aucun outil analytique tiers ni publicité n'est intégré dans l'application.
