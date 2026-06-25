# 414 - Cleanup Phase 2: dead code and lint cleanup - Implementation

Date: 2026-06-25  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`

---

## 1) Context

After Phase 1 restored the backend test baseline, backend lint still passed with
warnings. Phase 2 removes those warnings without changing runtime behavior.

The goal was a clean backend lint gate:

```text
0 errors / 0 warnings
```

---

## 2) What changed

### Printing route imports

Updated `MuseBar/backend/src/routes/printing.ts`:

1. removed unused `PrintingConfig` type import,
2. removed unused `ALLOWED_PRINT_PROVIDERS` import,
3. removed unused `parseConfigCell` import.

### Epson Server Direct in-memory queue

Updated `MuseBar/backend/src/services/printing/epsonJobStore.ts`:

1. removed the unused legacy `queues` map,
2. kept the active `queuesByEstablishment` queue unchanged.

### Migration status helper

Updated `MuseBar/backend/src/migrations/migration-manager.ts`:

1. removed the unused `byId` map in `status()`,
2. preserved the existing migration status output and checksum drift checks.

### Auth token generation

Updated `MuseBar/backend/src/middleware/auth.ts`:

1. kept the public `generateToken(payload, rememberMe, customExpiresIn)` signature,
2. made the unused compatibility `rememberMe` parameter explicit with `void rememberMe`,
3. replaced the unused destructured legacy admin claim variable with an explicit
   copy + `delete signablePayload.is_admin`.

This preserves the current behavior: new tokens still never emit the legacy
`is_admin` claim.

### Test-only lint cleanup

Updated:

1. `MuseBar/backend/src/services/printing/BasePrintingService.receiptLegalMention.test.ts`
   - removed unused `ClosureBulletinData` import,
   - dropped unused override parameter names where method shape was enough.
2. `MuseBar/backend/src/services/printing/networkEscPosSocket.test.ts`
   - removed unused `vi` import.

---

## 3) Verification

Executed from `MuseBar/backend`:

1. `npm run lint`
   - Result: pass, 0 errors / 0 warnings
2. `npm run type-check`
   - Result: pass
3. `npm test`
   - Result: 65 files passed / 285 tests passed
4. IDE diagnostics on edited files
   - Result: no linter errors

---

## 4) Outcome

The backend lint gate is now fully clean. Phase 2 closes the dead-code/lint warning
item from the cleanup roadmap and leaves the backend behavior unchanged.
