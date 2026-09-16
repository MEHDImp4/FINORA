# FINORA — Maintainer Moderation Guidelines

This guide provides maintainers and triage helpers with clear procedures for handling community interactions, moderation requests, and abusive conduct.

---

## 🧭 Principles of Moderation

1. **Safety First**: Protect community members and maintainers from abuse, harassment, and security risks.
2. **Proportionate Response**: Interventions should match the severity of the behavior.
3. **De-escalation**: Remain calm, objective, and polite. Do not argue or engage in flame wars.
4. **Transparency**: Reference project policies ([Code of Conduct](CODE_OF_CONDUCT.md), [Contributing Guide](CONTRIBUTING.md)) when closing or moderating content.

---

## 🚦 Incident Workflow

```text
Report / Incident Detected
          │
          ▼
       Triage
          │
  ┌───────┴───────────────────────┐
  ▼                               ▼
Minor Friction / Off-topic     Severe Abuse / Harassment / Spam
  │                               │
  ▼                               ▼
Friendly reminder / warning     Hide content / Delete spam
  │                               │
  ▼                               ▼
Lock conversation if unconstructive
                                  │
                                  ▼
                    Block / Report user to GitHub
```

---

## 🛠️ Handling Specific Scenarios

| Scenario | Action | Recommended Response |
|---|---|---|
| **Spam / Commercial Ads** | Delete immediately. Block user from repository if repeated. | Mark comment/issue as *Spam* via GitHub UI. |
| **Harassment / Insults** | Hide comment with reason *Abusive*, warn user via private or professional notice. Lock thread if necessary. | Refer to `CODE_OF_CONDUCT.md`. Report severe violators to GitHub Support. |
| **Off-Topic / Support Requests in Issues** | Guide user to GitHub Discussions, label appropriately, and politely close. | *"Thank you! For setup questions and support, please use our [GitHub Discussions](https://github.com/MEHDImp4/FINORA/discussions)."* |
| **Incomplete Bug Reports** | Apply label `needs info`. Ask for missing reproduction steps, device, or sanitized logs. | Auto-closes after 60 days via stale bot if no response. |
| **Duplicate Issues** | Reference original issue with `#<number>`, label with `duplicate`, and close. | *"Closing as duplicate of #<number>. Please continue the discussion there."* |
| **Accidental Secret Disclosure in Issue/PR** | Immediately edit/delete the exposed comment, scrub token from history if applicable, and alert user to rotate credentials. | Instruct user to immediately regenerate their Jellyfin access token or password. |
| **Disputed / False Vulnerabilities** | Move to private advisory discussions. Do not dismiss aggressively; explain why the behavior is expected or out of scope. | Document rationale clearly in security advisory. |

---

## 🔒 Action Levels

1. **Comment**: Clarify expectations politely.
2. **Hide Comment**: Use GitHub's comment hiding feature (reasons: *off-topic*, *duplicate*, *spam*, *abuse*).
3. **Lock Conversation**: Freeze an issue or pull request to maintainers only when discussion becomes unproductive.
4. **Block User**: Used as a last resort for persistent spam bots, malicious actors, or repeated Code of Conduct violations.
