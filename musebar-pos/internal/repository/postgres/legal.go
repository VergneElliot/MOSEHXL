package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"musebar-pos/internal/models"
	"musebar-pos/internal/repository"
)

type LegalRepositoryPostgres struct {
	db *pgxpool.Pool
}

func NewLegalRepository(db *pgxpool.Pool) repository.LegalRepository {
	return &LegalRepositoryPostgres{db: db}
}

// InsertEntry inserts a new legal journal entry (append-only)
func (r *LegalRepositoryPostgres) InsertEntry(ctx context.Context, schemaName string, entry *models.LegalEntry) error {
	query := fmt.Sprintf(`
		INSERT INTO "%s".legal_journal (
			sequence_number, transaction_type, order_id, amount, vat_amount,
			payment_method, transaction_data, previous_hash, current_hash,
			timestamp, user_id, register_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at
	`, schemaName)

	err := r.db.QueryRow(
		ctx, query,
		entry.SequenceNumber,
		entry.TransactionType,
		entry.OrderID,
		entry.Amount,
		entry.VATAmount,
		entry.PaymentMethod,
		entry.TransactionData,
		entry.PreviousHash,
		entry.CurrentHash,
		entry.Timestamp,
		entry.UserID,
		entry.RegisterID,
	).Scan(&entry.ID, &entry.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to insert legal journal entry: %w", err)
	}

	return nil
}

// GetLastEntry retrieves the most recent legal journal entry
func (r *LegalRepositoryPostgres) GetLastEntry(ctx context.Context, schemaName string) (*models.LegalEntry, error) {
	query := fmt.Sprintf(`
		SELECT id, sequence_number, transaction_type, order_id, amount, vat_amount,
		       payment_method, transaction_data, previous_hash, current_hash,
		       timestamp, user_id, register_id, created_at
		FROM "%s".legal_journal
		ORDER BY sequence_number DESC
		LIMIT 1
	`, schemaName)

	var entry models.LegalEntry
	err := r.db.QueryRow(ctx, query).Scan(
		&entry.ID,
		&entry.SequenceNumber,
		&entry.TransactionType,
		&entry.OrderID,
		&entry.Amount,
		&entry.VATAmount,
		&entry.PaymentMethod,
		&entry.TransactionData,
		&entry.PreviousHash,
		&entry.CurrentHash,
		&entry.Timestamp,
		&entry.UserID,
		&entry.RegisterID,
		&entry.CreatedAt,
	)

	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil // No entries yet
		}
		return nil, fmt.Errorf("failed to get last entry: %w", err)
	}

	return &entry, nil
}

// GetLastHash retrieves the hash of the most recent entry
func (r *LegalRepositoryPostgres) GetLastHash(ctx context.Context, schemaName string) (string, error) {
	query := fmt.Sprintf(`
		SELECT current_hash
		FROM "%s".legal_journal
		ORDER BY sequence_number DESC
		LIMIT 1
	`, schemaName)

	var hash string
	err := r.db.QueryRow(ctx, query).Scan(&hash)

	if err != nil {
		if err.Error() == "no rows in result set" {
			return "", nil // No previous hash (first entry will use GENESIS)
		}
		return "", fmt.Errorf("failed to get last hash: %w", err)
	}

	return hash, nil
}

// GetLastSequenceNumber retrieves the last sequence number
func (r *LegalRepositoryPostgres) GetLastSequenceNumber(ctx context.Context, schemaName string) (int, error) {
	query := fmt.Sprintf(`
		SELECT COALESCE(MAX(sequence_number), -1)
		FROM "%s".legal_journal
	`, schemaName)

	var seqNum int
	err := r.db.QueryRow(ctx, query).Scan(&seqNum)

	if err != nil {
		return 0, fmt.Errorf("failed to get last sequence number: %w", err)
	}

	return seqNum, nil
}

// GetAllEntries retrieves all legal journal entries (for verification)
func (r *LegalRepositoryPostgres) GetAllEntries(ctx context.Context, schemaName string) ([]models.LegalEntry, error) {
	query := fmt.Sprintf(`
		SELECT id, sequence_number, transaction_type, order_id, amount, vat_amount,
		       payment_method, transaction_data, previous_hash, current_hash,
		       timestamp, user_id, register_id, created_at
		FROM "%s".legal_journal
		ORDER BY sequence_number ASC
	`, schemaName)

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query entries: %w", err)
	}
	defer rows.Close()

	var entries []models.LegalEntry
	for rows.Next() {
		var entry models.LegalEntry
		err := rows.Scan(
			&entry.ID,
			&entry.SequenceNumber,
			&entry.TransactionType,
			&entry.OrderID,
			&entry.Amount,
			&entry.VATAmount,
			&entry.PaymentMethod,
			&entry.TransactionData,
			&entry.PreviousHash,
			&entry.CurrentHash,
			&entry.Timestamp,
			&entry.UserID,
			&entry.RegisterID,
			&entry.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan entry: %w", err)
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

// GetEntries retrieves legal journal entries with filters
func (r *LegalRepositoryPostgres) GetEntries(ctx context.Context, schemaName string, startDate, endDate *time.Time, entryType *string, limit, offset int) ([]models.LegalEntry, error) {
	baseQuery := fmt.Sprintf(`
		SELECT id, sequence_number, transaction_type, order_id, amount, vat_amount,
		       payment_method, transaction_data, previous_hash, current_hash,
		       timestamp, user_id, register_id, created_at
		FROM "%s".legal_journal
		WHERE 1=1
	`, schemaName)

	args := []interface{}{}
	argCount := 1

	if startDate != nil {
		baseQuery += fmt.Sprintf(" AND timestamp >= $%d", argCount)
		args = append(args, *startDate)
		argCount++
	}

	if endDate != nil {
		baseQuery += fmt.Sprintf(" AND timestamp <= $%d", argCount)
		args = append(args, *endDate)
		argCount++
	}

	if entryType != nil {
		baseQuery += fmt.Sprintf(" AND transaction_type = $%d", argCount)
		args = append(args, *entryType)
		argCount++
	}

	baseQuery += " ORDER BY sequence_number DESC"
	baseQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argCount, argCount+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query entries: %w", err)
	}
	defer rows.Close()

	var entries []models.LegalEntry
	for rows.Next() {
		var entry models.LegalEntry
		err := rows.Scan(
			&entry.ID,
			&entry.SequenceNumber,
			&entry.TransactionType,
			&entry.OrderID,
			&entry.Amount,
			&entry.VATAmount,
			&entry.PaymentMethod,
			&entry.TransactionData,
			&entry.PreviousHash,
			&entry.CurrentHash,
			&entry.Timestamp,
			&entry.UserID,
			&entry.RegisterID,
			&entry.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan entry: %w", err)
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

// GetEntriesCount counts legal journal entries with filters
func (r *LegalRepositoryPostgres) GetEntriesCount(ctx context.Context, schemaName string, startDate, endDate *time.Time, entryType *string) (int, error) {
	baseQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM "%s".legal_journal
		WHERE 1=1
	`, schemaName)

	args := []interface{}{}
	argCount := 1

	if startDate != nil {
		baseQuery += fmt.Sprintf(" AND timestamp >= $%d", argCount)
		args = append(args, *startDate)
		argCount++
	}

	if endDate != nil {
		baseQuery += fmt.Sprintf(" AND timestamp <= $%d", argCount)
		args = append(args, *endDate)
		argCount++
	}

	if entryType != nil {
		baseQuery += fmt.Sprintf(" AND transaction_type = $%d", argCount)
		args = append(args, *entryType)
		argCount++
	}

	var count int
	err := r.db.QueryRow(ctx, baseQuery, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count entries: %w", err)
	}

	return count, nil
}

// InsertClosureBulletin inserts a new closure bulletin
func (r *LegalRepositoryPostgres) InsertClosureBulletin(ctx context.Context, bulletin *models.ClosureBulletin) error {
	query := `
		INSERT INTO closure_bulletins (
			establishment_id, closure_type, period_start, period_end,
			total_transactions, fond_de_caisse, total_amount, total_vat,
			vat_breakdown, payment_methods_breakdown, tips_total, change_total,
			first_sequence, last_sequence, closure_hash, is_closed
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id, created_at
	`

	err := r.db.QueryRow(
		ctx, query,
		bulletin.EstablishmentID,
		bulletin.ClosureType,
		bulletin.PeriodStart,
		bulletin.PeriodEnd,
		bulletin.TotalTransactions,
		bulletin.FondDeCaisse,
		bulletin.TotalAmount,
		bulletin.TotalVAT,
		bulletin.VATBreakdown,
		bulletin.PaymentMethodsBreakdown,
		bulletin.TipsTotal,
		bulletin.ChangeTotal,
		bulletin.FirstSequence,
		bulletin.LastSequence,
		bulletin.ClosureHash,
		bulletin.IsClosed,
	).Scan(&bulletin.ID, &bulletin.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to insert closure bulletin: %w", err)
	}

	return nil
}

// GetClosureBulletin retrieves a specific closure bulletin
func (r *LegalRepositoryPostgres) GetClosureBulletin(ctx context.Context, bulletinID int64) (*models.ClosureBulletin, error) {
	query := `
		SELECT id, establishment_id, closure_type, period_start, period_end,
		       total_transactions, fond_de_caisse, total_amount, total_vat,
		       vat_breakdown, payment_methods_breakdown, tips_total, change_total,
		       first_sequence, last_sequence, closure_hash, is_closed, closed_at, created_at
		FROM closure_bulletins
		WHERE id = $1
	`

	var bulletin models.ClosureBulletin
	err := r.db.QueryRow(ctx, query, bulletinID).Scan(
		&bulletin.ID,
		&bulletin.EstablishmentID,
		&bulletin.ClosureType,
		&bulletin.PeriodStart,
		&bulletin.PeriodEnd,
		&bulletin.TotalTransactions,
		&bulletin.FondDeCaisse,
		&bulletin.TotalAmount,
		&bulletin.TotalVAT,
		&bulletin.VATBreakdown,
		&bulletin.PaymentMethodsBreakdown,
		&bulletin.TipsTotal,
		&bulletin.ChangeTotal,
		&bulletin.FirstSequence,
		&bulletin.LastSequence,
		&bulletin.ClosureHash,
		&bulletin.IsClosed,
		&bulletin.ClosedAt,
		&bulletin.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get closure bulletin: %w", err)
	}

	return &bulletin, nil
}

// GetClosureBulletins retrieves closure bulletins with filters
func (r *LegalRepositoryPostgres) GetClosureBulletins(ctx context.Context, establishmentID string, bulletinType *string, startDate, endDate *time.Time) ([]models.ClosureBulletin, error) {
	baseQuery := `
		SELECT id, establishment_id, closure_type, period_start, period_end,
		       total_transactions, fond_de_caisse, total_amount, total_vat,
		       vat_breakdown, payment_methods_breakdown, tips_total, change_total,
		       first_sequence, last_sequence, closure_hash, is_closed, closed_at, created_at
		FROM closure_bulletins
		WHERE establishment_id = $1
	`

	args := []interface{}{establishmentID}
	argCount := 2

	if bulletinType != nil {
		baseQuery += fmt.Sprintf(" AND closure_type = $%d", argCount)
		args = append(args, *bulletinType)
		argCount++
	}

	if startDate != nil {
		baseQuery += fmt.Sprintf(" AND period_start >= $%d", argCount)
		args = append(args, *startDate)
		argCount++
	}

	if endDate != nil {
		baseQuery += fmt.Sprintf(" AND period_end <= $%d", argCount)
		args = append(args, *endDate)
		argCount++
	}

	baseQuery += " ORDER BY period_start DESC"

	rows, err := r.db.Query(ctx, baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query closure bulletins: %w", err)
	}
	defer rows.Close()

	var bulletins []models.ClosureBulletin
	for rows.Next() {
		var bulletin models.ClosureBulletin
		err := rows.Scan(
			&bulletin.ID,
			&bulletin.EstablishmentID,
			&bulletin.ClosureType,
			&bulletin.PeriodStart,
			&bulletin.PeriodEnd,
			&bulletin.TotalTransactions,
			&bulletin.FondDeCaisse,
			&bulletin.TotalAmount,
			&bulletin.TotalVAT,
			&bulletin.VATBreakdown,
			&bulletin.PaymentMethodsBreakdown,
			&bulletin.TipsTotal,
			&bulletin.ChangeTotal,
			&bulletin.FirstSequence,
			&bulletin.LastSequence,
			&bulletin.ClosureHash,
			&bulletin.IsClosed,
			&bulletin.ClosedAt,
			&bulletin.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan bulletin: %w", err)
		}
		bulletins = append(bulletins, bulletin)
	}

	return bulletins, nil
}

// InsertAuditEntry records an audit trail entry
func (r *LegalRepositoryPostgres) InsertAuditEntry(ctx context.Context, entry *models.AuditEntry) error {
	query := `
		INSERT INTO audit_trail (
			user_id, action_type, resource_type, resource_id,
			action_details, ip_address, user_agent, session_id, timestamp
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`

	err := r.db.QueryRow(
		ctx, query,
		entry.UserID,
		entry.ActionType,
		entry.ResourceType,
		entry.ResourceID,
		entry.ActionDetails,
		entry.IPAddress,
		entry.UserAgent,
		entry.SessionID,
		entry.Timestamp,
	).Scan(&entry.ID)

	if err != nil {
		return fmt.Errorf("failed to insert audit entry: %w", err)
	}

	return nil
}

// GetAuditEntries retrieves audit trail entries with filters
func (r *LegalRepositoryPostgres) GetAuditEntries(ctx context.Context, userID *string, actionType *string, startDate, endDate *time.Time, limit, offset int) ([]models.AuditEntry, error) {
	baseQuery := `
		SELECT id, user_id, action_type, resource_type, resource_id,
		       action_details, ip_address, user_agent, session_id, timestamp
		FROM audit_trail
		WHERE 1=1
	`

	args := []interface{}{}
	argCount := 1

	if userID != nil {
		baseQuery += fmt.Sprintf(" AND user_id = $%d", argCount)
		args = append(args, *userID)
		argCount++
	}

	if actionType != nil {
		baseQuery += fmt.Sprintf(" AND action_type = $%d", argCount)
		args = append(args, *actionType)
		argCount++
	}

	if startDate != nil {
		baseQuery += fmt.Sprintf(" AND timestamp >= $%d", argCount)
		args = append(args, *startDate)
		argCount++
	}

	if endDate != nil {
		baseQuery += fmt.Sprintf(" AND timestamp <= $%d", argCount)
		args = append(args, *endDate)
		argCount++
	}

	baseQuery += " ORDER BY timestamp DESC"
	baseQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argCount, argCount+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit entries: %w", err)
	}
	defer rows.Close()

	var entries []models.AuditEntry
	for rows.Next() {
		var entry models.AuditEntry
		err := rows.Scan(
			&entry.ID,
			&entry.UserID,
			&entry.ActionType,
			&entry.ResourceType,
			&entry.ResourceID,
			&entry.ActionDetails,
			&entry.IPAddress,
			&entry.UserAgent,
			&entry.SessionID,
			&entry.Timestamp,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan audit entry: %w", err)
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

// InsertArchiveExport creates a new archive export record
func (r *LegalRepositoryPostgres) InsertArchiveExport(ctx context.Context, export *models.ArchiveExport) error {
	query := `
		INSERT INTO archive_exports (
			export_type, period_start, period_end, file_path, file_hash,
			file_size, format, digital_signature, export_status, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at
	`

	err := r.db.QueryRow(
		ctx, query,
		export.ExportType,
		export.PeriodStart,
		export.PeriodEnd,
		export.FilePath,
		export.FileHash,
		export.FileSize,
		export.Format,
		export.DigitalSignature,
		export.ExportStatus,
		export.CreatedBy,
	).Scan(&export.ID, &export.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to insert archive export: %w", err)
	}

	return nil
}

// GetArchiveExport retrieves a specific archive export
func (r *LegalRepositoryPostgres) GetArchiveExport(ctx context.Context, exportID int64) (*models.ArchiveExport, error) {
	query := `
		SELECT id, export_type, period_start, period_end, file_path, file_hash,
		       file_size, format, digital_signature, export_status, created_by,
		       created_at, verified_at
		FROM archive_exports
		WHERE id = $1
	`

	var export models.ArchiveExport
	err := r.db.QueryRow(ctx, query, exportID).Scan(
		&export.ID,
		&export.ExportType,
		&export.PeriodStart,
		&export.PeriodEnd,
		&export.FilePath,
		&export.FileHash,
		&export.FileSize,
		&export.Format,
		&export.DigitalSignature,
		&export.ExportStatus,
		&export.CreatedBy,
		&export.CreatedAt,
		&export.VerifiedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get archive export: %w", err)
	}

	return &export, nil
}

// UpdateArchiveStatus updates the status of an archive export
func (r *LegalRepositoryPostgres) UpdateArchiveStatus(ctx context.Context, exportID int64, status string, verifiedAt *time.Time) error {
	query := `
		UPDATE archive_exports
		SET export_status = $1, verified_at = $2
		WHERE id = $3
	`

	_, err := r.db.Exec(ctx, query, status, verifiedAt, exportID)
	if err != nil {
		return fmt.Errorf("failed to update archive status: %w", err)
	}

	return nil
}

// ClosureExists checks if a closure bulletin already exists for a given period
func (r *LegalRepositoryPostgres) ClosureExists(ctx context.Context, establishmentID, closureType string, periodStart, periodEnd time.Time) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM closure_bulletins
			WHERE establishment_id = $1
			  AND closure_type = $2
			  AND period_start = $3
			  AND period_end = $4
		)
	`
	var exists bool
	err := r.db.QueryRow(ctx, query, establishmentID, closureType, periodStart, periodEnd).Scan(&exists)
	return exists, err
}
