# Fix: Invitation Token Leaked in API Response

## What this is about

When an admin creates a new establishment, the backend generates a **one-time invitation token**, stores it, sends it to the business owner by email (in a setup link), and was also **returning it in the JSON response** to the admin’s client.

## What’s the problem?

- The invitation token is a **secret**: whoever has it can complete the establishment setup (claim the account).
- It’s already sent **by email** to the owner — that’s the intended, secure channel.
- Returning it in the API response means:
  - Anyone who can call “create establishment” (e.g. an admin) receives the token in the response.
  - The token can end up in browser dev tools, network logs, or proxy logs.
  - If an admin session is compromised or the response is intercepted, an attacker gets the token and can hijack the setup before the real owner.

So the token should **never** leave the server except in the email to the owner.

## How we fix it

- **Do not** include `invitation_token` or `invitation_link` (which contains the token) in the create-establishment API response.
- The admin doesn’t need them: the owner receives the link by email. The UI can show a message like “Invitation sent to {email}” without exposing the token.
- Applied in both code paths that create establishments:
  1. **EstablishmentService** (legacy route `POST /api/establishments`)
  2. **EstablishmentCreationOrchestrator** (route `POST /api/enhanced-establishments`)

Response types are updated so the API no longer returns these fields; the frontend already treats them as optional and only shows a success message, so behaviour stays correct.
