# Spaces / S3 Object-Lock setup (COMP-1)

Status: Ready for operator credentials — script already supports upload  
Related: `scripts/backup-production-db.sh`, `evidence/phase4-ops/BACKUP-EVIDENCE-RECORD.md`

## Why

Daily dumps on the droplet + DigitalOcean managed DB backups are enough to *sign*.
A Spaces bucket with **Object Lock** adds WORM retention you control (ransomware /
accidental delete resistance).

## Steps (DigitalOcean)

1. Control panel → **Spaces** → Create bucket (prefer a region away from the droplet if available).
2. Enable **Object Lock** on create (cannot always be enabled later). Choose retention
   (≥ 6 years / 2190 days, or GOVERNANCE mode you can extend).
3. API → Spaces Keys → Generate. Save Access Key + Secret (once).
4. On the production droplet:

```bash
# Install AWS CLI v2 if missing
curl -sS "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
cd /tmp && unzip -qo awscliv2.zip && ./aws/install -u

# Root-only credentials file (not in git)
install -m 600 /dev/null /root/.mosehxl-spaces.env
cat >> /root/.mosehxl-spaces.env <<'EOF'
export AWS_ACCESS_KEY_ID=REPLACE
export AWS_SECRET_ACCESS_KEY=REPLACE
export AWS_DEFAULT_REGION=ams3   # match your Spaces region
export MOSEHXL_S3_BUCKET=your-bucket-name
export MOSEHXL_S3_ENDPOINT=https://ams3.digitaloceanspaces.com
EOF

# Source from backup cron — wrap the crontab entry:
# 15 3 * * * . /root/.mosehxl-spaces.env; /var/www/MOSEHXL/scripts/backup-production-db.sh
```

5. Smoke test:

```bash
. /root/.mosehxl-spaces.env
MOSEHXL_FORCE_MONTHLY=1 /var/www/MOSEHXL/scripts/backup-production-db.sh
tail -20 /var/log/mosehxl/db-backup.log
aws s3 ls "s3://${MOSEHXL_S3_BUCKET}/" --endpoint-url "$MOSEHXL_S3_ENDPOINT"
```

6. Update `BACKUP-EVIDENCE-RECORD.md` with bucket name + Object Lock screenshot
   (no keys). Mark COMP-1 done in the thoroughness roadmap.

## Agent note

Cannot finish without Spaces keys from the DO account owner. Hand this file to
Thomas; agent can wire crontab + verify uploads once keys exist on the server.
