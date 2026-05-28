package audit

import (
	"context"
	"encoding/json"
	"net"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"musebar-pos/internal/pkg/logger"
)

// ActionType represents the type of audited action
type ActionType string

const (
	// Auth actions
	ActionLogin          ActionType = "LOGIN"
	ActionLogout         ActionType = "LOGOUT"
	ActionTokenRefresh   ActionType = "TOKEN_REFRESH"
	ActionPasswordChange ActionType = "PASSWORD_CHANGE"
	ActionPasswordReset  ActionType = "PASSWORD_RESET"
	ActionInviteSent     ActionType = "INVITE_SENT"
	ActionInviteAccepted ActionType = "INVITE_ACCEPTED"

	// User management
	ActionCreateUser     ActionType = "CREATE_USER"
	ActionUpdateUser     ActionType = "UPDATE_USER"
	ActionDeactivateUser ActionType = "DEACTIVATE_USER"

	// Product management
	ActionCreateProduct  ActionType = "CREATE_PRODUCT"
	ActionUpdateProduct  ActionType = "UPDATE_PRODUCT"
	ActionArchiveProduct ActionType = "ARCHIVE_PRODUCT"
	ActionCreateCategory ActionType = "CREATE_CATEGORY"
	ActionUpdateCategory ActionType = "UPDATE_CATEGORY"

	// Order actions
	ActionCreateOrder ActionType = "CREATE_ORDER"
	ActionRefundOrder ActionType = "REFUND_ORDER"

	// Closure actions
	ActionCreateClosure ActionType = "CREATE_CLOSURE"

	// Happy hour
	ActionToggleHappyHour    ActionType = "TOGGLE_HAPPY_HOUR"
	ActionSetHappyHourPrice  ActionType = "SET_HAPPY_HOUR_PRICE"

	// Legal
	ActionVerifyJournal ActionType = "VERIFY_JOURNAL"
)

// Entry represents an audit log entry
type Entry struct {
	UserID          string
	EstablishmentID string
	ActionType      ActionType
	ResourceType    string
	ResourceID      string
	ActionDetails   map[string]interface{}
	IPAddress       string
	UserAgent       string
	RequestID       string
}

// Service handles audit logging
type Service struct {
	db *pgxpool.Pool
}

// New creates a new audit service
func New(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

// Log records an audit entry (non-fatal - logs error but doesn't fail request)
func (s *Service) Log(ctx context.Context, entry Entry) {
	// Use background context so audit log isn't canceled when request ends
	bgCtx := context.Background()
	go func() {
		if err := s.log(bgCtx, entry); err != nil {
			logger.Error("Failed to write audit log", err, map[string]interface{}{
				"action":     string(entry.ActionType),
				"user_id":    entry.UserID,
				"request_id": entry.RequestID,
			})
		}
	}()
}

// LogSync records an audit entry synchronously (use for critical actions)
func (s *Service) LogSync(ctx context.Context, entry Entry) error {
	return s.log(ctx, entry)
}

func (s *Service) log(ctx context.Context, entry Entry) error {
	var detailsJSON *string
	if entry.ActionDetails != nil {
		b, err := json.Marshal(entry.ActionDetails)
		if err == nil {
			s := string(b)
			detailsJSON = &s
		}
	}

	// Strip port from IP address (inet type doesn't accept host:port)
	ipAddr := entry.IPAddress
	if host, _, err := net.SplitHostPort(ipAddr); err == nil {
		ipAddr = host
	}

	var estID *string
	if entry.EstablishmentID != "" {
		estID = &entry.EstablishmentID
	}

	var resourceID *string
	if entry.ResourceID != "" {
		resourceID = &entry.ResourceID
	}

	var resourceType *string
	if entry.ResourceType != "" {
		resourceType = &entry.ResourceType
	}

	_, err := s.db.Exec(ctx, `
		INSERT INTO audit_trail (
			user_id, action_type, resource_type, resource_id,
			action_details, ip_address, user_agent, session_id, establishment_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`,
		nullStr(entry.UserID),
		string(entry.ActionType),
		resourceType,
		resourceID,
		detailsJSON,
		nullStr(ipAddr),
		nullStr(entry.UserAgent),
		nullStr(entry.RequestID),
		estID,
	)

	return err
}

// GetByEstablishment retrieves audit entries for an establishment
func (s *Service) GetByEstablishment(ctx context.Context, establishmentID string, limit, offset int) ([]map[string]interface{}, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, user_id, action_type, resource_type, resource_id,
		       action_details, ip_address::text, timestamp
		FROM audit_trail
		WHERE establishment_id::text = $1
		ORDER BY timestamp DESC
		LIMIT $2 OFFSET $3
	`, establishmentID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit trail: %w", err)
	}
	defer rows.Close()

	var entries []map[string]interface{}
	for rows.Next() {
		var (
			id           int64
			userID       *string
			actionType   string
			resourceType *string
			resourceID   *string
			details      *string
			ipAddress    *string
			timestamp    interface{}
		)

		err := rows.Scan(&id, &userID, &actionType, &resourceType, &resourceID,
			&details, &ipAddress, &timestamp)
		if err != nil {
			continue
		}

		entry := map[string]interface{}{
			"id":            id,
			"user_id":       userID,
			"action_type":   actionType,
			"resource_type": resourceType,
			"resource_id":   resourceID,
			"ip_address":    ipAddress,
			"timestamp":     timestamp,
		}

		if details != nil {
			var d map[string]interface{}
			if json.Unmarshal([]byte(*details), &d) == nil {
				entry["action_details"] = d
			}
		}

		entries = append(entries, entry)
	}

	return entries, nil
}

// FromContext extracts audit info from request context
func FromContext(ctx context.Context) Entry {
	entry := Entry{}
	if uid, ok := ctx.Value("user_id").(int64); ok {
		entry.UserID = fmt.Sprintf("%d", uid)
	}
	if eid, ok := ctx.Value("establishment_id").(string); ok {
		entry.EstablishmentID = eid
	}
	if rid, ok := ctx.Value("request_id").(string); ok {
		entry.RequestID = rid
	}
	return entry
}

func nullStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
