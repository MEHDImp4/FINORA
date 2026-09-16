# Security Policy

> 🇫🇷 *Une version française de cette politique de sécurité est disponible dans [SECURITY.fr.md](SECURITY.fr.md).*

The FINORA team takes security and user privacy very seriously. We appreciate your efforts to responsibly disclose vulnerabilities.

---

## 🛡️ Supported Versions

We provide security patches for the following versions of FINORA:

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| `master` | :white_check_mark: | Active development branch |
| `v1.0.x` | :white_check_mark: | Latest release line |
| `< 1.0`  | :x:                | Pre-release development tags |

---

## 🔒 Reporting a Vulnerability

> ⚠️ **PLEASE DO NOT REPORT SECURITY VULNERABILITIES VIA PUBLIC GITHUB ISSUES.**

If you discover a security vulnerability or potential threat in FINORA, please report it privately:

1. **GitHub Security Advisories (Preferred)**:
   - Go to the [Security Advisories](https://github.com/MEHDImp4/FINORA/security/advisories) tab of the repository.
   - Click **"Report a vulnerability"** to open a confidential report.
2. **Direct Contact**:
   - If the advisory tab is unavailable, contact the repository maintainers directly through their GitHub profile.

### What to Include in Your Report
Please provide as much detail as possible to help us reproduce and address the issue:
- Type of vulnerability (e.g., credential leakage, insecure storage, authentication bypass, code injection)
- Step-by-step instructions to reproduce the issue
- Proof of Concept (PoC) code or network capture where applicable
- Potential impact and severity assessment
- Affected devices and OS versions

### Our Commitment & Response Timeline
- **Initial Acknowledgement**: Within 48 hours of receipt.
- **Triage & Status Update**: Within 5 business days, including confirmation of reproducibility and severity.
- **Fix & Disclosure**: We will work on a coordinated patch and release before public disclosure. Credit will be given to the reporter upon release if desired.

---

## 🔐 Built-in Security Architecture

FINORA is built with security-by-design principles:
- **Hardware-Backed Keystore**: User authentication tokens are stored strictly within the device's hardware-backed secure storage (`Android Keystore` on Android, `Keychain` on iOS via `expo-secure-store`).
- **Memory Hygiene**: Passwords are wiped from JavaScript memory immediately following server authentication.
- **Sanitized Logging**: All network debug outputs automatically redact authorization headers, tokens, and sensitive query strings (`[REDACTED]`).
- **TLS / HTTPS**: Cleartext HTTP connections display explicit security warnings to the user.
- **Zero Telemetry**: No third-party trackers, analytics, or behavioral telemetry are embedded in the app.
