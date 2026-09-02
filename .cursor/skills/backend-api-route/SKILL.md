---
name: backend-api-route
description: >-
  Add or modify Express API routes in MOSEHXL/MuseBar backend. Use when creating
  endpoints, route handlers, middleware chains, validation, or API tests under
  MuseBar/backend/src/routes/.
---

# Backend API Route

## Route template

```typescript
import express from 'express';
import { requireAuth, getEstablishmentId, requirePermission } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { P } from '../permissions/registry';
import { Logger } from '../utils/logger';

const router = express.Router();
const logger = Logger.getInstance();

router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  const rows = await SomeModel.getAll(establishmentId);
  res.json({ success: true, data: rows });
}));
```

## Checklist

- [ ] `router.use(requireAuth)` or per-route auth
- [ ] `getEstablishmentId(req, res)` — early return if null
- [ ] Permission gate: `requirePermission(P.xxx)` or `requirePinActor(P.xxx)` for POS
- [ ] `validateBody` / `validateParams` for input
- [ ] `asyncHandler` wraps all async handlers
- [ ] Throw `ValidationError`, `NotFoundError`, `AppError` — don't manual `res.status` unless matching auth middleware style
- [ ] Pass `establishmentId` to every model call
- [ ] Log errors: `logger.error('message', error, 'CATEGORY')`
- [ ] Colocated `*.test.ts` or `*.permissions.test.ts`

## Modular routes

Large domains use folder + index aggregator:

```
routes/orders/index.ts       → mounts orderCRUD, orderPayment, orderLegal, orderAudit
routes/legal/index.ts        → journal, closure, archive, invoices
routes/admin/index.ts        → documents, inbox, reservations
```

Register in `backend/src/app.ts` under `/api/*`.

## Error response shape

```json
{
  "success": false,
  "error": {
    "message": "...",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "timestamp": "..."
  }
}
```

## POS routes

Mutations require PIN actor header:

```typescript
router.post('/change',
  requireAuth,
  requirePermission(P.access_pos),
  requirePinActor(),
  asyncHandler(...)
);
```

## Related skills

- `auth-and-multi-tenancy` — middleware details
- `legal-journal-compliance` — if route writes fiscal data
- `database-migrations` — if route needs schema changes
