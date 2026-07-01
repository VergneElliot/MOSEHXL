# Operational Evidence Templates

Status: Templates — fill when resuming self-cert (paused 2026-07-01; see `../00-PAUSE-CHECKPOINT.md`).

These files are meant to be copied into a dated evidence folder when the
operator performs a real control:

```text
docs/legal/self-certification/evidence/YYYY-MM-DD-<control-name>/
```

Do not fill production secrets into these templates. Store secret material in
the appropriate secret manager, not in git.

## Templates

| Template | When to use |
|----------|-------------|
| `RETENTION-POLICY-RECORD.md` | Before signing and whenever retention/storage policy changes |
| `BACKUP-EVIDENCE-RECORD.md` | After validating backup jobs and long-retention storage |
| `RESTORE-DRILL-RECORD.md` | Before signing and quarterly afterward |
| `ARCHIVE-EXPORT-RECORD.md` | Before signing and for each tax-inspection archive export |
| `PRODUCTION-CONFIG-SNAPSHOT.md` | At release freeze, without secrets |
| `RELEASE-EVIDENCE-CAPTURE.md` | At each attested release freeze |

## Completion Rule

The self-certification attestation should not be signed until copies of these
records exist for the attested release and are referenced from
`../04-OPERATIONAL-CONTROLS.md` and `../06-RELEASE-FREEZE-CHECKLIST.md`.
