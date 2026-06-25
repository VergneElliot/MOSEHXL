# Production Configuration Snapshot

Status: To fill at release freeze without secrets  
Related controls: `../04-OPERATIONAL-CONTROLS.md#control-7---environment-configuration-evidence`,
`../06-RELEASE-FREEZE-CHECKLIST.md`

---

## Record Identity

| Field | Value |
|-------|-------|
| Snapshot date/time | To fill |
| Operator | To fill |
| Reviewed by | To fill |
| Covered release/tag | To fill |
| Environment | Production / staging equivalent |

---

## Safety Rule

Do not paste secrets into this document.

Allowed:

- boolean/status values,
- provider names,
- algorithm names,
- retention durations,
- route/origin names that are not secret.

Forbidden:

- passwords,
- tokens,
- private keys,
- raw database URLs,
- signing keys,
- API keys,
- bridge secrets.

---

## Runtime Configuration

| Setting area | Expected value | Actual value/evidence |
|--------------|----------------|-----------------------|
| `NODE_ENV` | `production` | To fill |
| CORS allowed origins | Production domains only | To fill |
| Swagger try-it-out in prod | Disabled | To fill |
| Error stack exposure | Disabled in production responses | To fill |
| Structured log redaction | Enabled | To fill |

---

## Database Configuration

| Setting area | Expected value | Actual value/evidence |
|--------------|----------------|-----------------------|
| DB TLS enabled | Yes | To fill |
| DB TLS certificate verification | Enabled unless documented exception | To fill |
| Application DB role | Least privilege | To fill |
| Superuser access | Restricted/audited | To fill |
| Backup user | Read-only where possible | To fill |
| Migration role | Controlled | To fill |

---

## Auth/Security Configuration

| Setting area | Expected value | Actual value/evidence |
|--------------|----------------|-----------------------|
| Access token lifetime | Short-lived | To fill |
| Refresh token transport | httpOnly cookie | To fill |
| Refresh CSRF | Enabled | To fill |
| Admin 2FA enforcement | Enabled for production unless explicitly deferred | To fill |
| Account lockout | Enabled | To fill |
| Password breach check | Enabled or documented exception | To fill |
| JWT signing algorithm | To fill | To fill |
| JWKS/key rotation policy | To fill | To fill |

---

## Fiscal Configuration

| Setting area | Expected value | Actual value/evidence |
|--------------|----------------|-----------------------|
| Legal journal DB triggers | Enabled | To fill |
| Archive storage location | Controlled/off-site preferred | To fill |
| Archive signing/integrity key storage | Secret manager / protected env | To fill |
| Closure scheduler | Configured | To fill |
| Establishment legal identity fields | Required before fiscal docs | To fill |
| Register identifier policy | Establishment-scoped | To fill |

---

## Backup/Retention Configuration

| Setting area | Expected value | Actual value/evidence |
|--------------|----------------|-----------------------|
| Daily backup | Enabled | To fill |
| Long-retention backup | 6 years minimum | To fill |
| Off-site copy | Enabled | To fill |
| Immutable/WORM copy | Preferred | To fill |
| Restore drill cadence | Quarterly minimum | To fill |

---

## Approval

| Field | Value |
|-------|-------|
| Snapshot accepted? | To fill |
| Approved by | To fill |
| Approval date | To fill |
| Notes | To fill |
