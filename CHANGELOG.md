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

**Fiscal impact:** MINOR (venue login + PIN-only actors; dual actor trace unchanged;
per-PIN visual prefs / POS card UX are UI-only; PWA install is packaging/UI only;
specific-permission step-up UX is authorization-only).

### Added

- Application installable (PWA) : manifeste `standalone`, icônes, méta iOS, bouton
  d’en-tête « Installer » (Chrome/Edge) ou aide « Sur l’écran d’accueil » (Safari iOS).
  Service worker minimal (précharge UI) ; `/api` en NetworkOnly ; toast
  « Une mise à jour est prête » → Recharger. Pas de mode hors-ligne POS.
- Droits **spécifiques** : le pavé PIN est toujours demandé (même si le badge
  actif détient déjà le droit) ; les actions de base (caisse) restent sans
  re-saisie tant qu’un badge est focalisé.
- Badge PIN : une seule session serveur ouverte par utilisateur et établissement
  (re-saisie sur un autre appareil réutilise le même `sid`, sans double
  pointage entrée).
- Badges PIN partagés entre appareils : liste d’onglets depuis l’API ; focus d’un
  badge distant = saisie du PIN de ce profil ; paniers / focus restent locaux
  (clé `sid`). Actualisation visible / focus / manuel ; badge fermé ailleurs
  disparaît après synchronisation.

### Changed

- Affichage : thème MUI sombre par défaut (bleu-gris), zoom en-tête fonctionnel,
  préférences `ui_prefs` par badge PIN (Profil → Affichage / Accessibilité : police,
  cartes, boutons, onglets).
- Caisse : cartes produit cliquables (plus de bouton « Ajouter » ni de glisser-déposer
  produit → panier) ; boutons `+`/`−` agrandis.
- Identité : compte établissement = email/mot de passe sans droits métier ; droits
  uniquement via session PIN ; staff = acteurs PIN-only (`can_login=false`).
- Basculement d’établissement : PIN propriétaire du compte sur l’établissement cible.
- Pointage : ouvrir / fermer un badge PIN sur le Wi‑Fi du lieu = entrée / sortie ;
  hors Wi‑Fi le badge fonctionne sans compter d’heures ; fermeture bloquée
  seulement si des tables ouvertes sont **assignées** à ce profil ; anciennes API
  punch désactivées (410).
- Boîte mail : liste par **conversation** (plus une ligne par e-mail de confirmation
  `slug@mosehxl.com`) ; fil type messagerie (client / établissement) ; archivage
  de tout le fil réservation.
- Boîte mail / réservations : les réponses staff et e-mails de statut ciblent
  toujours `customer_email` (jamais `@mosehxl.com`) ; confirmation visuelle de
  l’adresse destinataire après envoi.
- Réservations : bouton **Accéder à la conversation** ; **commentaire** e-mailé
  au client (changement de statut ou du texte) ; **notes** strictement internes
  (plus de remplissage auto depuis le formulaire public).

### Fixed

- Badges PIN : une seule pastille par profil (déduplication serveur + onglets) ;
  fermeture depuis n’importe quel appareil après saisie du PIN du profil
  (évite de clôturer le pointage d’autrui). Ouverture / fermeture de badge
  **toujours** possibles hors Wi‑Fi ; le pointage (heures) n’est enregistré
  **que** depuis le Wi‑Fi / IP autorisé du lieu.
- Fermeture de badge : ne bloque plus si des tables ouvertes appartiennent à
  **un autre** serveur (critère = `last_served_by_user_id`, pas le simple
  `opened_by`).
- Droits **spécifiques** (clôtures, administration, paramètres hors profil, etc.) :
  le pavé PIN s’ouvre à l’entrée de l’onglet / section même si le badge focalisé
  détient déjà le droit (plus de court-circuit `hasAccess`).

- Copies venue « Nouvelle demande… » : l’email de contact Paramètres (`business_settings`)
  est maintenant utilisé et synchronisé — plus le legacy `establishments.email`
  (ex. `contact@musebar.fr` sans MX → Blocked SendGrid).

### Added

- Réservations / Boîte mail : fil de conversation (copies sortantes) + Reply-To
  `slug+r{id}@mosehxl.com` pour rattacher les réponses à la bonne réservation.
- Réservations manuelles (agenda) : seed Boîte mail + lien `inbox_message_id` comme les
  demandes publiques ; webhook inbound exempt du rate-limit / plafond 1 Mo.
- Historique : annulation complète d’une vente **à table** avec option **Rouvrir la table**
  (nouvel open ticket + articles restaurés en validés) — cas d’encaissement par erreur.
- Historique « En cours » : pipeline de service **Validé → Envoyé → Servi** (horodatage
  par étape, actions PIN depuis la liste table par table).
- Historique / impression : facture en **un clic** (client défaut « Client », adresse
  optionnelle, mentions paiement préremplies) ; infos B2B en panneau optionnel.
  Commandes **partagées** : ticket ou facture pour **une partie** de paiement.
- Caisse comptoir : encaissement possible **sans session PIN** (compte connecté suffit) ;
  avec badge PIN, la vente alimente le **Z individuel** ; sans PIN → **Total comptoir**.
  Les ventes à table exigent toujours une session PIN.
- Plan de salle : glisser une table sur une autre → dialogue **Transférer** /
  **Fusionner** ; la table active de la page suit le **dernier clic** (y compris
  libre) pour le bandeau et les modes transfert/fusion.
- Plan de salle : dialogue de reprise avant Caisse (lignes, statuts En attente / Validée,
  chronos ticket et lignes, CTA « Ouvrir en caisse »). Transfert / fusion inchangés.
- Plan de salle / Caisse : une table est **libre** dès qu’aucune ligne d’addition
  (brouillon ou validée) n’y vit — les tickets ouverts vides ne bloquent plus le
  transfert et le résumé affiche « Table libre ».
- Options de paiement → Partage : trois colonnes (articles | Actions | paiements) ;
  glisser un article d’un paiement à un autre (ou vers le pool) ; Actions = Parts
  égales, → Paiement N, Répartir….
- Historique « CA par serveur » : ligne **Total comptoir** (ventes sans attribution
  serveur / caisse sans PIN), séparée des Z individuels (table + comptoir avec PIN).
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

- Historique « En cours » : articles identiques regroupés (même statut) ; actions Envoyé /
  Servi sur le groupe.
- Plan de salle — reprise table : statuts **Validé / Envoyé / Servi** alignés sur
  Historique « En cours » ; quantités en unités (`1×`) ; articles identiques regroupés
  (même produit + même statut).
- Historique « En cours » / validation table : le statut après validation est **Validé**
  (plus « Envoyé cuisine ») ; « En attente » n’est plus un statut de service (brouillons
  sans pastille en caisse ; reprise table = « Non validé »).
- Annulation / retour : les articles **brouillon** (comptoir ou table non validée) restent
  retirables par tout badge ; articles **validés** (cuisine) et ventes **encaissées** exigent
  la permission spécifique `orders_cancel`. Abandon de table avec lignes validées aussi.
- Tables / Z : le propriétaire est le PIN qui **ouvre** la table (`last_served_by_user_id`) ;
  l’intervention n’en vole plus la propriété ni le Z ; seul « Assigner à » transfère. Comptoir
  **avec** session PIN → Z individuel ; comptoir **sans** PIN → **Total comptoir**.
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
- Sessions PIN : durée de vie alignée sur « se souvenir de moi » — **30 jours** par défaut
  (plus de timeout d'inactivité 60 min, plus de fermeture automatique à la clôture
  journalière). Fermeture explicite / changement de PIN ou de droits / désactivation
  de compte restent actifs.
- Gestion des utilisateurs : « Supprimer » devient **« Désactiver »**. Le compte est conservé
  (adhésion désactivée, PIN effacé, badges fermés, sessions de connexion révoquées) afin que ses
  commandes, entrées de journal et pointages restent attribuables. Un compte désactivé peut être
  **réactivé**, et **supprimé définitivement** uniquement s'il n'a aucune activité enregistrée —
  sinon la suppression est refusée en indiquant le décompte de son activité.

### Fixed

- Caisse / Options de paiement : glisser-déposer tactile unifié — maintien idle **500 ms**
  (tolérance 10 px pour garder le scroll) sur cartes produit et partage ; menu contextuel
  partage à **800 ms**.
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
