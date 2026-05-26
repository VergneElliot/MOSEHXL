package models

import (
	"time"
)

// LegalEntry represents an immutable entry in the legal journal
// Implements Article 286-I-3 bis du CGI - Pillar I (Inaltérabilité)
type LegalEntry struct {
	ID              int64     `json:"id"`
	SequenceNumber  int       `json:"sequence_number"`  // Legal sequential numbering
	TransactionType string    `json:"transaction_type"` // "SALE", "REFUND", "CORRECTION", "CLOSURE", "ARCHIVE", "CHANGE"
	OrderID         *int64    `json:"order_id,omitempty"`
	Amount          float64   `json:"amount"`
	VATAmount       float64   `json:"vat_amount"`
	PaymentMethod   string    `json:"payment_method"`
	TransactionData string    `json:"transaction_data"` // JSONB complete transaction details
	PreviousHash    string    `json:"previous_hash"`
	CurrentHash     string    `json:"current_hash"`
	Timestamp       time.Time `json:"timestamp"` // TIMESTAMPTZ for hash correctness
	UserID          *string   `json:"user_id,omitempty"`
	RegisterID      string    `json:"register_id"` // Cash register identifier
	CreatedAt       time.Time `json:"created_at"`
}

// ClosureBulletin represents a closure report
// Implements Article 286-I-3 bis du CGI - Pillar C (Conservation)
type ClosureBulletin struct {
	ID                      int64     `json:"id"`
	EstablishmentID         string    `json:"establishment_id"` // UUID reference
	ClosureType             string    `json:"closure_type"`     // "DAILY", "WEEKLY", "MONTHLY", "ANNUAL"
	PeriodStart             time.Time `json:"period_start"`
	PeriodEnd               time.Time `json:"period_end"`
	TotalTransactions       int       `json:"total_transactions"`
	FondDeCaisse            float64   `json:"fond_de_caisse"`    // Cash float in register
	TotalAmount             float64   `json:"total_amount"`
	TotalVAT                float64   `json:"total_vat"`
	VATBreakdown            string    `json:"vat_breakdown"`              // JSONB - VAT by rate
	PaymentMethodsBreakdown string    `json:"payment_methods_breakdown"` // JSONB - totals by payment method
	TipsTotal               float64   `json:"tips_total"`
	ChangeTotal             float64   `json:"change_total"`
	FirstSequence           *int      `json:"first_sequence,omitempty"`
	LastSequence            *int      `json:"last_sequence,omitempty"`
	ClosureHash             string    `json:"closure_hash"`
	IsClosed                bool      `json:"is_closed"`
	ClosedAt                *time.Time `json:"closed_at,omitempty"`
	CreatedAt               time.Time `json:"created_at"`
}

// AuditEntry represents an audit trail entry
// Implements Article 286-I-3 bis du CGI - Pillar S (Sécurisation)
type AuditEntry struct {
	ID            int64     `json:"id"`
	UserID        *string   `json:"user_id,omitempty"`
	ActionType    string    `json:"action_type"`    // "LOGIN", "LOGOUT", "TRANSACTION", "MODIFY", "EXPORT"
	ResourceType  *string   `json:"resource_type,omitempty"` // "ORDER", "PRODUCT", "CATEGORY", "SYSTEM"
	ResourceID    *string   `json:"resource_id,omitempty"`
	ActionDetails *string   `json:"action_details,omitempty"` // JSONB complete details
	IPAddress     *string   `json:"ip_address,omitempty"`
	UserAgent     *string   `json:"user_agent,omitempty"`
	SessionID     *string   `json:"session_id,omitempty"`
	Timestamp     time.Time `json:"timestamp"`
}

// ArchiveExport represents an archive export
// Implements Article 286-I-3 bis du CGI - Pillar A (Archivage)
type ArchiveExport struct {
	ID               int64      `json:"id"`
	ExportType       string     `json:"export_type"` // "DAILY", "MONTHLY", "ANNUAL", "FULL"
	PeriodStart      *time.Time `json:"period_start,omitempty"`
	PeriodEnd        *time.Time `json:"period_end,omitempty"`
	FilePath         string     `json:"file_path"`
	FileHash         string     `json:"file_hash"`         // SHA-256 of file content
	FileSize         int64      `json:"file_size"`         // Size in bytes
	Format           string     `json:"format"`            // "CSV", "XML", "PDF", "JSON"
	DigitalSignature *string    `json:"digital_signature,omitempty"` // HMAC-SHA256 signature
	ExportStatus     string     `json:"export_status"`     // "PENDING", "COMPLETED", "FAILED", "VERIFIED"
	CreatedBy        *string    `json:"created_by,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	VerifiedAt       *time.Time `json:"verified_at,omitempty"`
}

// JournalStats represents statistics about the legal journal
type JournalStats struct {
	TotalEntries int                `json:"total_entries"`
	TotalAmount  float64            `json:"total_amount"`
	TotalVAT     float64            `json:"total_vat"`
	TypeCounts   map[string]int     `json:"types"`
}
