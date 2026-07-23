# Secret handling Step A (COMP-3)

Status: Baseline hardening — secret manager (Step B) still optional  
Date: 2026-07-23

## Why

Production secrets (JWT, archive HMAC, DB passwords) live in
`/var/www/MOSEHXL/MuseBar/backend/.env`. That is normal for a single-droplet
setup if the file is root-only and never committed. A full vault (Doppler /
Vault / cloud secret manager) is Step B.

## Step A checklist (done / verify on server)

| Control | Expected |
|---------|----------|
| `.env` not in git | Confirmed via `.gitignore` |
| File mode | `0600` root:root |
| Backup of `.env` | Encrypted or root-only copy off-box when rotating |
| Break-glass DB | `/root/.mosehxl-doadmin.env` mode `0600` |
| Spaces keys (if COMP-1) | `/root/.mosehxl-spaces.env` mode `0600`, not in app `.env` if avoidable |
| Rotation | Change JWT/ARCHIVE keys only with downtime plan + re-sign archives note |

## Rotation procedure (JWT / ARCHIVE_SECRET_KEY)

1. Schedule a short maintenance window (users must re-login after JWT change).
2. Generate new secrets (`openssl rand -hex 32`).
3. Update `.env`, restart PM2.
4. Archive HMAC change: old archive files still verify only with the **old** key —
   keep the previous key in a dated sealed file for 6 years if you rotate.

## Step B (later)

Inject secrets at process start from a vault; remove long-lived plaintext from
disk where the platform allows it.
