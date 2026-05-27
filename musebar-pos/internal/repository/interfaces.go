package repository

import (
	"context"
	"time"

	"musebar-pos/internal/models"
)

// LegalRepository defines operations for legal journal
type LegalRepository interface {
	InsertEntry(ctx context.Context, schemaName string, entry *models.LegalEntry) error
	GetLastHash(ctx context.Context, schemaName string) (string, error)
	GetLastSequenceNumber(ctx context.Context, schemaName string) (int, error)
	GetAllEntries(ctx context.Context, schemaName string) ([]models.LegalEntry, error)
	GetEntriesCount(ctx context.Context, schemaName string, startDate, endDate *time.Time, transactionType *string) (int, error)
	GetEntries(ctx context.Context, schemaName string, startDate, endDate *time.Time, transactionType *string, limit, offset int) ([]models.LegalEntry, error)
	GetClosureBulletins(ctx context.Context, schemaName string, closureType *string, startDate, endDate *time.Time) ([]models.ClosureBulletin, error)
	InsertClosureBulletin(ctx context.Context, bulletin *models.ClosureBulletin) error
	GetClosureBulletin(ctx context.Context, bulletinID int64) (*models.ClosureBulletin, error)
	ClosureExists(ctx context.Context, establishmentID, closureType string, periodStart, periodEnd time.Time) (bool, error)
}

// ProductRepository defines operations for products and categories
type ProductRepository interface {
	// Category operations
	CreateCategory(ctx context.Context, schemaName string, category *models.Category) error
	GetCategoryByID(ctx context.Context, schemaName string, categoryID int64) (*models.Category, error)
	GetAllCategories(ctx context.Context, schemaName string, includeArchived bool) ([]models.Category, error)
	UpdateCategory(ctx context.Context, schemaName string, categoryID int64, updates map[string]interface{}) error
	ArchiveCategory(ctx context.Context, schemaName string, categoryID int64) error

	// Product operations
	CreateProduct(ctx context.Context, schemaName string, product *models.Product) error
	GetProductByID(ctx context.Context, schemaName string, productID int64) (*models.Product, error)
	GetAllProducts(ctx context.Context, schemaName string, includeArchived bool) ([]models.Product, error)
	UpdateProduct(ctx context.Context, schemaName string, productID int64, updates map[string]interface{}) error
	ArchiveProduct(ctx context.Context, schemaName string, productID int64) error
	UpdateProductDisplayOrder(ctx context.Context, schemaName string, productID int64, displayOrder int) error
	UpdateCategoryDisplayOrder(ctx context.Context, schemaName string, categoryID int64, displayOrder int) error
	GetProductsByCategory(ctx context.Context, schemaName string, categoryID int64) ([]models.Product, error)
	
	// Happy Hour operations
	ToggleHappyHour(ctx context.Context, schemaName string, active bool) error
	GetHappyHourStatus(ctx context.Context, schemaName string) (bool, error)
}

// OrderRepository defines operations for orders
type OrderRepository interface {
	CreateOrder(ctx context.Context, schemaName string, order *models.Order) error
	GetOrderByID(ctx context.Context, schemaName string, orderID int64) (*models.Order, error)
	GetOrdersByPeriod(ctx context.Context, schemaName string, startDate, endDate time.Time) ([]models.Order, error)
	UpdateOrderStatus(ctx context.Context, schemaName string, orderID int64, status string) error
	CreateOrderItems(ctx context.Context, schemaName string, items []models.OrderItem) error
	GetOrderItems(ctx context.Context, schemaName string, orderID int64) ([]models.OrderItem, error)
	GetOrders(ctx context.Context, schemaName string, status *string, limit, offset int) ([]models.Order, int, error)
}

// UserRepository defines operations for users
type UserRepository interface {
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByID(ctx context.Context, userID int64) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUsersByEstablishment(ctx context.Context, establishmentID string) ([]models.User, error)
	UpdateUser(ctx context.Context, userID int64, updates map[string]interface{}) error
	DeleteUser(ctx context.Context, userID int64) error
}

// EstablishmentRepository defines operations for establishments
type EstablishmentRepository interface {
	CreateEstablishment(ctx context.Context, establishment *models.Establishment) error
	GetEstablishmentByID(ctx context.Context, establishmentID string) (*models.Establishment, error)
	GetEstablishmentByEmail(ctx context.Context, email string) (*models.Establishment, error)
	GetAllEstablishments(ctx context.Context) ([]models.Establishment, error)
	UpdateEstablishment(ctx context.Context, establishmentID string, updates map[string]interface{}) error
	DeleteEstablishment(ctx context.Context, establishmentID string) error
	GetSchemaName(ctx context.Context, establishmentID string) (string, error)
}
