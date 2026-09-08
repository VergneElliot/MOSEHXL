# Changelog

All notable changes to MOSEHXL / MuseBar are documented here.

Versioning follows [SemVer](https://semver.org/) with a legal overlay for French
cash-register compliance (BOI-TVA-DECLA-30-10-30):

- **MAJOR** — change that modifies ISCA parameters (inalterability, security,
  conservation, archiving): legal journal, hash chain, closures, archives, or
  their enforcement. Requires a **new publisher attestation**.
- **MINOR** — new capability that does **not** modify ISCA parameters (features,
  exports, UI). Existing attestation remains valid.
- **PATCH** — bug fixes / non-fiscal hardening that do not modify ISCA parameters.

Fiscal sequence counters are never reset across versions.

---

## [Unreleased]

**Fiscal impact:** PATCH (no ISCA parameter change). Date/time unify is PATCH; planning series tools are MINOR capability (non-ISCA).

### Added

- Historique « CA par serveur » : ligne **Total comptoir** (ventes sans table), séparée des Z individuels.
- Caisse : permission spécifique **Remise** (`pos_apply_remise`), distincte du Happy Hour
  manuel — case à cocher dans Gestion des utilisateurs.
- Settings → **Profil** : prénom, nom, date de naissance, téléphone (optionnels) et **couleur
  calendrier unique** par établissement (obligatoire ; attribuée par défaut à la création).
- Settings → **Profil** : sélecteur de couleur spectrum/hex (toute `#RRGGBB` libre), **Changer le mot de passe**,
  **Changer mon PIN** (self-service).
- Planning : vacations colorées par profil (hors statut « en attente »).
- Planning : brouillon local + **Enregistrer les modifications** (e-mails groupés par employé) ;
  page publique de confirmation sélective avec motif de refus.
- Planning: when editing/deleting a recurring vacation, choose **cette vacation** or **toute la série**.
- Planning: **Réinitialiser le planning** clears all shifts for the establishment after confirmation.
- Traçabilité : chaque action tracée enregistre désormais **le compte connecté et la session PIN**
  utilisée (commande, piste d'audit, entrée SALE du journal légal). Les commandes portent le
  compte et la session ; le journal reçoit un bloc `actor` dans `transaction_data`.
- Traçabilité : les **annulations** (commande, pourboire, faire-de-la-monnaie) portent le même
  bloc `actor` / champs PIN que les ventes.
- Gestion des utilisateurs → **Sessions PIN actives** : badge, compte d'ouverture, dernière
  activité, expiration, et fermeture à distance d'une session laissée ouverte.
- Qualité de code : plafond de **400 lignes par fichier**, vérifié au commit et en CI
  (`npm run check:module-size`) avec un cliché des fichiers existants qui ne peut que se
  resserrer.

### Changed

- Annulation / retour : les articles **brouillon** (comptoir ou table non validée) restent
  retirables par tout badge ; articles **validés** (cuisine) et ventes **encaissées** exigent
  la permission spécifique `orders_cancel`. Abandon de table avec lignes validées aussi.
- Tables / Z : le propriétaire est le PIN qui **ouvre** la table (`last_served_by_user_id`) ;
  l’intervention n’en vole plus la propriété ni le Z ; seul « Assigner à » transfère. Les ventes
  comptoir n’alimentent plus un Z individuel (bucket **Total comptoir**).
- Caisse : Happy Hour (panier + puce d’en-tête), Offert, Perso, Remise et réaffectation
  serveur sont des permissions **spécifiques** (session PIN ou invite ponctuelle). Affecter
  une commande à une **table** reste basique.
- Permissions : deux niveaux explicites. Les **permissions de base** (caisse comptoir et table,
  encaissement, note, à suivre, affectation à une table, plan de salle en lecture, historique
  hors annulation, onglet Profil) sont acquises par tout le personnel et n'apparaissent plus
  comme cases à cocher. Les **permissions spécifiques** restent attribuables par compte dans
  « Gestion des utilisateurs », regroupées par domaine.
- Permissions : un `establishment_admin` détient implicitement toutes les permissions.
- PIN : une permission spécifique impose un PIN de 4 à 8 chiffres. Attribuer une première
  permission spécifique à un compte disposant d'un PIN à 2 chiffres **efface ce PIN**, qui doit
  être redéfini.
- Navigation : plus aucun onglet ni bouton n'est masqué ou grisé faute de permission. Les
  fonctionnalités spécifiques demandent un PIN au clic ; un PIN disposant du droit autorise
  l'action. L'autorisation est **ponctuelle** (le clic suivant redemande le PIN) ; l'ouverture
  d'une page protégée reste autorisée jusqu'à la sortie de cette page.
- Autorisations : lorsqu'une session PIN est ouverte, ce sont ses droits qui s'appliquent ; le
  serveur accepte désormais l'identité du PIN en plus de celle du compte connecté et enregistre
  laquelle a autorisé l'action.
- Administration : « Conformité Légale » et « Journal de sécurité » passent de l'accès
  administrateur exclusif à la permission « Journal légal et conformité », donc délégable.
- Paramètres : l'onglet « Menu » est toujours visible et demande le droit correspondant au clic.
- Sessions PIN : fermer un badge le révoque immédiatement côté serveur au lieu d'attendre
  l'expiration du jeton. Un badge est également fermé automatiquement lorsque son PIN ou
  ses permissions changent.
- Sessions PIN : durée de vie bornée par trois limites — **12 h** maximum, **60 min** d'inactivité,
  et **fermeture de toutes les sessions à la clôture journalière** (le service est terminé).
- Gestion des utilisateurs : « Supprimer » devient **« Désactiver »**. Le compte est conservé
  (adhésion désactivée, PIN effacé, badges fermés, sessions de connexion révoquées) afin que ses
  commandes, entrées de journal et pointages restent attribuables. Un compte désactivé peut être
  **réactivé**, et **supprimé définitivement** uniquement s'il n'a aucune activité enregistrée —
  sinon la suppression est refusée en indiquant le décompte de son activité.

### Fixed

- Auth : verrouillage après échecs de login beaucoup plus court (défaut 2→15 min au lieu de
  15→240) ; bouton **Déverrouiller** en Gestion des utilisateurs ; pages publiques
  (`/reserve/…`) n’attendent plus le bootstrap de session.
- Floor : à suivre / abandon / clôture ne réécrivent plus le serveur assigné ; la route
  « takeover » et le bouton « Prendre en charge » sont retirés (réassignation via Assigner à).
- Permissions : `access_compliance` (journal légal / conformité) était impossible à attribuer —
  la ligne avait été renommée en base alors que le code continuait de la contrôler. La table des
  permissions est désormais réconciliée avec le registre partagé.
- Sécurité PIN : `POST /auth/pin/verify` est limité en fréquence (par terminal et par compte) et
  chaque échec est journalisé (log de sécurité + piste d'audit). Chaque vérification réussie
  trace le compte connecté **et** l'identité du PIN utilisé.
- Sessions PIN multi-onglets : un onglet nouvellement ouvert n'est plus effacé par une écriture
  de panier/table concurrente (état de session désormais mis à jour de façon atomique), et le
  panier ne « fuit » plus d'une session vers l'autre au changement d'onglet.
- Sessions PIN : le message `Session : <nom>` figé dans l'en-tête est remplacé par une
  notification temporaire ; les sessions dont le jeton a expiré sont signalées « expirée » et
  redemandent le PIN au lieu d'échouer silencieusement.
- Date/time display: kitchen tickets, receipts, emails, PDFs, and admin UIs now always use
  **Europe/Paris** with **DD/MM/YYYY** and **24-hour** time (no AM/PM; no host-UTC print skew).
- Reservation / planning / pointage dialogs: replaced OS-locale `datetime-local` pickers with
  explicit `jj/mm/aaaa` + `HH:mm` fields; wall-clock values convert to UTC via Paris TZ.

### Fixed (prior)

- POS product grid: restored fast category switching on establishment hardware by replacing
  per-card MUI/Emotion rendering with plain DOM + static CSS; removed Virtuoso and
  `content-visibility` from the catalog grid.
- POS scroll tearing on product cards (hover shadow repaints during scroll).
- Favoris block stuck at top after leaving **Tous** (duplicate React list keys on catalog
  view that intentionally lists favorites twice).

### Changed

- Print bridge: default poll interval 500 ms; queue/print latency fields on status API and
  bridge logs (`queuedMs`, `printMs`) for troubleshooting slow receipts.

---

## [2.0.3] — 2026-07-23 — post-freeze thoroughness (COMP batch)

**Fiscal impact:** PATCH (no ISCA parameter change — reconciliation tolerance,
duplicate DAILY guard, gap backfill; hash/trigger semantics unchanged).
Attestation `self-cert-v2.0.2` remains valid.

### Fixed

- Closure VAT reconciliation tolerates ≤ €0.01 drift (C-RECON)
- Block same-Paris-day DAILY duplicates with matching hash or ≥ amount
- Auto-closure backfills one missed sale-day per tick (C-GAP going forward)

### Added

- CI fiscal-path guard workflow
- Production MONTHLY archive evidence (COMP-4)
- COMP-1/2/3 operator setup docs; dossier hygiene supersession notes

---

## [2.0.2] — 2026-07-16 — `self-cert-v2.0.2`

**Fiscal impact:** PATCH (RLS tenant context for software-event journal writes).
**First signed attestation targets this tag.**

### Fixed

- Software-event journal appends now run under `runWithTenantContext`, so
  production can use least-privilege role `mosehxl_app` (no Bypass RLS) without
  failing `SERVER_STARTED` / critical software events

### Notes

- Continues 2.0.1 ops/dossier work; supersedes 2.0.1 as the live attested tip

---

## [2.0.1] — 2026-07-16 — `self-cert-v2.0.1`

**Fiscal impact:** PATCH relative to 2.0.0 (archive export bug fix + operational
controls). Superseded for signature by **2.0.2** same day.

### Fixed

- Archive export: generate file before DB INSERT; verify compares `Number(file_size)`

### Added

- Production backup script with daily rolling + monthly 6-year long-retention vault
- Optional S3/Spaces upload hooks; restore-drill helper; Phase 5 signing packet

### Security / ops

- Roles `mosehxl_app` / `mosehxl_backup`; DO/pghoard off-site backup evidence

---

## [2.0.0] — 2026-07-16 — `self-cert-v2.0.0`

**Fiscal impact:** MAJOR (first attested release line / quality-gate freeze).

### Added

- Self-certification dossier and execution roadmap
- Phase 1–2 forensic evidence; era-aware journal verifier

### Fixed

- TypeScript strictness in era-aware verifier

---

## Pre-2.0.0 (unversioned production history)

Prior to formal SemVer tagging, the product ran in production from mid-2025 with
incremental fiscal hardening. See `docs/patch-notes/LATEST-INDEX.md`.
