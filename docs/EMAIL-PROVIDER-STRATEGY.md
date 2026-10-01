# Email provider strategy (MOSEHXL)

**Date:** 2026-09-30  
**Audience:** solo / small-team publisher (cost-sensitive, long-lived product)  
**Current provider:** SendGrid (outbound API + Inbound Parse for `slug@mosehxl.com`)  
**Related ops:** `docs/runbooks/ADMIN-SPACE-INBOUND-AND-STORAGE.md`

This is a **decision note**, not a patch-note PLAN. Implement only when volume, price, or lock-in actually hurts.

---

## 1. Honest opinion (read this first)

For a solo or small team that wants **low cost and high reliability**, the winning move is **not** to run your own mail servers.

Email deliverability (landing in Gmail/Outlook inboxes, not spam) is a specialized ops problem. Self-hosted SMTP looks “free” and almost always costs you:

- days of setup and DNS (SPF / DKIM / DMARC),
- ongoing fights with blocklists,
- security risk (an open or abused relay ruins your domain),
- zero product progress.

**Best long-term posture for MOSEHXL:**

1. **Always use a managed email provider** (an “ESP” — Email Service Provider).  
2. **Keep our code provider-agnostic** behind a thin adapter (`send` + `parseInbound`).  
3. **Stay on SendGrid while it is cheap enough and already working.**  
4. **When price or risk bites, migrate to Amazon SES** (cheapest at volume) *or* keep one simple ESP that also does inbound well (e.g. Mailgun) — still managed, never self-hosted.  
5. **Never make “build our own Postfix” the plan** unless you later hire dedicated email/ops people (unlikely for this product).

That is the strategy that maximizes profit for a small team: pay a modest bill for something boring and reliable; spend your time on POS, fiscal compliance, and venue features.

---

## 2. What “email” means in this product

Two jobs — do not confuse them:

| Job | Examples today | Hard part |
|-----|----------------|-----------|
| **Outbound** | Invites, réservations, planning confirmations, closures, document reminders, inbox replies from `slug@…` | Domain auth + API + bounce handling |
| **Inbound** | MX → provider → webhook → Administration **Boîte mail** | MX cutover + webhook payload shape + attachments |

A cheap “SMTP password for Gmail” only covers outbound badly, and **does not** replace Inbound Parse.

---

## 3. Options (ranked for *our* constraints)

| Rank | Option | Fit for solo / small team | Cost | Verdict |
|------|--------|---------------------------|------|---------|
| 1 | **Stay on SendGrid** until a real trigger | Best until it hurts | OK at low volume | **Default now** |
| 2 | **Amazon SES** (+ optional inbound via receipt rules → your API) | Excellent once you accept AWS console complexity | Usually **cheapest at scale** | **Preferred migration target** |
| 3 | **Another full ESP** (Mailgun, Brevo, Postmark, Resend, …) | Often simpler UI than SES; check inbound | Mid | Good if SES inbound feels too heavy |
| 4 | **Hybrid** (SES/ESP send + separate inbound product) | More moving parts | Mixed | Only if one vendor can’t do both cleanly |
| 5 | **Self-hosted SMTP / mail server** | Worst ops/value ratio for us | “Free” until outages | **Do not pursue** |

---

## 4. Recommended strategy over time

### Phase A — Now (do this)

- Keep SendGrid.
- Finish ops hygiene: domain auth, Inbound Parse URL/token, `GET /api/admin/email-status` green in production (see runbook + patch 531 notes).
- Treat the SendGrid bill as normal infrastructure (like DigitalOcean Spaces), not as technical debt.

**Trigger to leave Phase A** (any one is enough):

- Monthly email cost becomes material vs revenue, **or**
- Account / deliverability incidents become recurring, **or**
- You need features SendGrid prices poorly for your volume.

Until a trigger fires: **do not migrate**.

### Phase B — Cheap insurance (small engineering, before a crisis)

When you next touch email code, or when you open a dedicated PLAN:

1. Define a tiny internal interface, e.g.:
   - `sendEmail({ from, to, subject, text, html, attachments })`
   - `parseInboundWebhook(req) → normalized message`
2. Keep **one** production implementation (SendGrid) behind it.
3. Avoid scattering `@sendgrid/mail` calls outside that module (most sending already funnels through `EmailService` / `EmailSender` — keep it that way).

This does **not** change providers. It makes a future swap a days-scale job instead of a weeks-scale scavenger hunt.

### Phase C — Migrate when triggered (preferred destination: SES)

Suggested order:

1. **Outbound → SES** (or chosen ESP) behind the adapter; re-auth DNS for the new provider; keep SendGrid inbound temporarily if needed.  
2. Soak-test transactional mail (invites, résa, planning, closures).  
3. **Inbound → same provider** (or Mailgun-style routes if SES inbound is too awkward); change MX in a maintenance window.  
4. Turn off SendGrid.

**Success looks like:** same product features, lower predictable cost, still zero mail servers to babysit.

### Phase D — Explicitly out of scope

- Running Postfix / iRedMail / Mailcow / “SMTP on the droplet”
- Using personal Gmail/Outlook SMTP for production multi-tenant mail
- Making email a competitive product feature (we need reliable pipes, not a mail suite)

---

## 5. Cost & team reality

- **Solo / small team:** every hour on mail ops is an hour not spent on fiscal POS or sales. Managed email wins.
- **“Explode on the market”:** still prefer SES/ESP; hire ops later if needed — still don’t invent a mail company.
- **Max profit:** minimize *surprise* cost (outages, spam folders, blocked domains), not only the invoice line. A $20–50 ESP bill that works beats a $0 server that drops reservation emails.

---

## 6. Decision checklist (use before any migration PLAN)

- [ ] Monthly SendGrid cost / risk actually exceeds migration effort?  
- [ ] Inbound (Boîte mail) requirements written down (MX host, webhook, attachments)?  
- [ ] Provider adapter exists or is in the same PLAN?  
- [ ] DNS cutover plan (SPF/DKIM/DMARC + MX) and rollback?  
- [ ] Self-host explicitly rejected in the PLAN?

If you cannot tick those, stay on SendGrid.

---

## 7. One-line policy

**Use a managed email provider forever; stay on SendGrid until cost or risk forces a move; prefer Amazon SES (or one inbound-capable ESP) behind a thin adapter; never self-host mail as a small team.**
