# Database Migrations

## Status
⏳ Migrations need to be ported from your TypeScript project.

## How to Add Migrations

1. **Install golang-migrate** (optional, but recommended):
```bash
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

2. **Port your existing migrations** from `MuseBar/backend/src/migrations/`

3. **Migration file format**:
```
001_initial_schema.up.sql
001_initial_schema.down.sql
002_legal_tables.up.sql
002_legal_tables.down.sql
```

4. **Run migrations**:
```bash
migrate -path migrations -database "postgres://postgres:postgres@localhost:5432/restaurant_pos_development?sslmode=disable" up
```

## For Now

You can manually run your existing SQL schema files:
```bash
psql -d restaurant_pos_development -f /path/to/your/schema.sql
```

Or copy from your TypeScript project:
```bash
# From MOSEHXL root
psql -d restaurant_pos_development -f MuseBar/backend/src/models/legal-schema.sql
```
