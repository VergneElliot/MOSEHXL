# Fix: Invitation Token Leaked in API Response

This document explains what an invitation token is, why it must stay secret, and how we fixed a leak that exposed it to the wrong people.

---

## 1. Background: What is an invitation token?

When a system admin creates a new establishment (a new bar or restaurant that will use the system), the backend generates a **one-time invitation token** — a long random string that acts like a temporary password. This token is:

1. Stored in the database (in the `user_invitations` table)
2. Sent by email to the business owner in a setup link (e.g., `https://mosehxl.com/setup/abc123xyz`)
3. Used by the business owner to prove they are the intended recipient when they set up their account

Think of it like a house key mailed to you: only the person who receives the envelope should be able to open the door. Once they use it, it's consumed and can't be used again.

---

## 2. What was the problem?

The API was also **returning the token in the JSON response** to the admin who created the establishment:

```json
{
  "establishment": { "name": "Bar du Centre", "email": "bar@example.com" },
  "invitation_token": "abc123xyz789secrettoken",
  "invitation_link": "https://mosehxl.com/setup/abc123xyz789secrettoken"
}
```

This is dangerous because:

- **The token is a secret.** Whoever has it can complete the establishment setup and claim the account. It should only reach the intended recipient via email.
- **API responses are visible** in browser developer tools, network logs, proxy logs, and any monitoring system. If someone is watching the admin's network traffic (or if the admin's session is compromised), the attacker gets the token.
- **The admin doesn't need it.** The business owner receives the link by email — that's the intended, secure delivery channel. The admin only needs to see a success message like "Invitation sent to bar@example.com."

---

## 3. What we changed

- **Removed** `invitation_token` and `invitation_link` from the create-establishment API response in both code paths:
  1. `EstablishmentService` (legacy route `POST /api/establishments`)
  2. `EstablishmentCreationOrchestrator` (route `POST /api/enhanced-establishments`)

- The response now only includes the establishment data and a success message. The token stays on the server and only leaves via the email to the owner.

- The frontend already treated these fields as optional and only showed a success message, so the UI behavior didn't change.

---

## 4. Key takeaway

**Never include secrets in API responses unless the recipient absolutely needs them.** In this case, the token's only legitimate destination was the business owner's email inbox, not the admin's browser. This is an instance of the **principle of least privilege** — give each entity (person, system, API response) only the information it needs to do its job, nothing more.

---

## 5. Files touched

| File | Change |
|------|--------|
| `services/establishment/EstablishmentCreationOrchestrator.ts` | Strip token/link from response |
| `services/establishment/EstablishmentService.ts` | Strip token/link from response |
| Response type definitions | Removed `invitation_token` and `invitation_link` fields |
