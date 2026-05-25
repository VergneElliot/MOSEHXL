package models

import (
	"time"
)

// Order represents a complete order in the system
type Order struct {
	ID              int64     `json:"id"`
	EstablishmentID string    `json:"establishment_id"`
	OrderNumber     string    `json:"order_number"`
	Status          string    `json:"status"` // "PENDING", "COMPLETED", "CANCELLED", "REFUNDED"
	TotalAmount     float64   `json:"total_amount"`
	TotalVAT        float64   `json:"total_vat"`
	PaymentMethod   string    `json:"payment_method"` // "CASH", "CARD"
	Tips            float64   `json:"tips"`
	Change          float64   `json:"change"`
	CreatedBy       *int64    `json:"created_by,omitempty"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
	CancelledAt     *time.Time `json:"cancelled_at,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// OrderItem represents an item in an order
type OrderItem struct {
	ID           int64   `json:"id"`
	OrderID      int64   `json:"order_id"`
	ProductID    int64   `json:"product_id"`
	ProductName  string  `json:"product_name"`
	Quantity     int     `json:"quantity"`
	UnitPrice    float64 `json:"unit_price"`
	TaxRate      float64 `json:"tax_rate"`     // 5.5, 10.0, 20.0
	TaxAmount    float64 `json:"tax_amount"`   // Exact tax for this item
	Subtotal     float64 `json:"subtotal"`
	CreatedAt    time.Time `json:"created_at"`
}

// Product represents a product/menu item
type Product struct {
	ID              int64     `json:"id"`
	CategoryID      int64     `json:"category_id"`
	Name            string    `json:"name"`
	Description     *string   `json:"description,omitempty"`
	Price           float64   `json:"price"` // TTC (tax included)
	TaxRate         float64   `json:"tax_rate"`
	IsActive        bool      `json:"is_active"`
	IsArchived      bool      `json:"is_archived"`
	HappyHourPrice  *float64  `json:"happy_hour_price,omitempty"`
	HappyHourActive bool      `json:"happy_hour_active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Category represents a product category
type Category struct {
	ID              int64     `json:"id"`
	Name            string    `json:"name"`
	Color           string    `json:"color"`
	DefaultTaxRate  float64   `json:"default_tax_rate"`
	DisplayOrder    int       `json:"display_order"`
	IsActive        bool      `json:"is_active"`
	IsArchived      bool      `json:"is_archived"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// User represents a system user
type User struct {
	ID              int64     `json:"id"`
	Email           string    `json:"email"`
	PasswordHash    string    `json:"-"` // Never send password hash in JSON
	FirstName       string    `json:"first_name"`
	LastName        string    `json:"last_name"`
	Role            string    `json:"role"` // "system_admin", "establishment_admin", "cashier"
	EstablishmentID *string   `json:"establishment_id,omitempty"`
	IsActive        bool      `json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Establishment represents a tenant establishment
type Establishment struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	Email              string    `json:"email"`
	Phone              *string   `json:"phone,omitempty"`
	Address            *string   `json:"address,omitempty"`
	SchemaName         string    `json:"schema_name"`
	SubscriptionPlan   string    `json:"subscription_plan"`   // "basic", "premium", "enterprise"
	SubscriptionStatus string    `json:"subscription_status"` // "active", "suspended", "cancelled"
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}
