package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"musebar-pos/internal/models"
	"musebar-pos/internal/repository"
)

type OrderRepositoryPostgres struct {
	db *pgxpool.Pool
}

func NewOrderRepository(db *pgxpool.Pool) repository.OrderRepository {
	return &OrderRepositoryPostgres{db: db}
}

// CreateOrder creates a new order
func (r *OrderRepositoryPostgres) CreateOrder(ctx context.Context, schemaName string, order *models.Order) error {
	query := fmt.Sprintf(`
		INSERT INTO "%s".orders (
			order_number, status, total_amount, total_vat,
			payment_method, tips, change, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`, schemaName)

	return r.db.QueryRow(ctx, query,
		order.OrderNumber, order.Status, order.TotalAmount, order.TotalVAT,
		order.PaymentMethod, order.Tips, order.Change, order.CreatedBy,
	).Scan(&order.ID, &order.CreatedAt, &order.UpdatedAt)
}

// GetOrderByID retrieves an order by ID
func (r *OrderRepositoryPostgres) GetOrderByID(ctx context.Context, schemaName string, orderID int64) (*models.Order, error) {
	query := fmt.Sprintf(`
		SELECT id, order_number, status, total_amount, total_vat,
		       payment_method, tips, change, created_by,
		       completed_at, cancelled_at, created_at, updated_at
		FROM "%s".orders
		WHERE id = $1
	`, schemaName)

	var order models.Order
	err := r.db.QueryRow(ctx, query, orderID).Scan(
		&order.ID, &order.OrderNumber, &order.Status, &order.TotalAmount,
		&order.TotalVAT, &order.PaymentMethod, &order.Tips, &order.Change,
		&order.CreatedBy, &order.CompletedAt, &order.CancelledAt,
		&order.CreatedAt, &order.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &order, nil
}

// GetOrdersByPeriod retrieves orders within a time period
func (r *OrderRepositoryPostgres) GetOrdersByPeriod(ctx context.Context, schemaName string, startDate, endDate time.Time) ([]models.Order, error) {
	query := fmt.Sprintf(`
		SELECT id, order_number, status, total_amount, total_vat,
		       payment_method, tips, change, created_by,
		       completed_at, cancelled_at, created_at, updated_at
		FROM "%s".orders
		WHERE created_at >= $1 AND created_at <= $2
		ORDER BY created_at DESC
	`, schemaName)

	rows, err := r.db.Query(ctx, query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var order models.Order
		err := rows.Scan(
			&order.ID, &order.OrderNumber, &order.Status, &order.TotalAmount,
			&order.TotalVAT, &order.PaymentMethod, &order.Tips, &order.Change,
			&order.CreatedBy, &order.CompletedAt, &order.CancelledAt,
			&order.CreatedAt, &order.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		orders = append(orders, order)
	}

	return orders, nil
}

// UpdateOrderStatus updates the order status
func (r *OrderRepositoryPostgres) UpdateOrderStatus(ctx context.Context, schemaName string, orderID int64, status string) error {
	query := fmt.Sprintf(`
		UPDATE "%s".orders
		SET status = $1::VARCHAR
		WHERE id = $2
	`, schemaName)

	_, err := r.db.Exec(ctx, query, status, orderID)
	return err
}

// CreateOrderItems creates order items
func (r *OrderRepositoryPostgres) CreateOrderItems(ctx context.Context, schemaName string, items []models.OrderItem) error {
	for i := range items {
		query := fmt.Sprintf(`
			INSERT INTO "%s".order_items (
				order_id, product_id, product_name, quantity,
				unit_price, tax_rate, tax_amount, subtotal
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING id, created_at
		`, schemaName)

		err := r.db.QueryRow(ctx, query,
			items[i].OrderID, items[i].ProductID, items[i].ProductName,
			items[i].Quantity, items[i].UnitPrice, items[i].TaxRate,
			items[i].TaxAmount, items[i].Subtotal,
		).Scan(&items[i].ID, &items[i].CreatedAt)

		if err != nil {
			return fmt.Errorf("failed to insert order item: %w", err)
		}
	}

	return nil
}

// GetOrderItems retrieves items for an order
func (r *OrderRepositoryPostgres) GetOrderItems(ctx context.Context, schemaName string, orderID int64) ([]models.OrderItem, error) {
	query := fmt.Sprintf(`
		SELECT id, order_id, product_id, product_name, quantity,
		       unit_price, tax_rate, tax_amount, subtotal, created_at
		FROM "%s".order_items
		WHERE order_id = $1
		ORDER BY id
	`, schemaName)

	rows, err := r.db.Query(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.OrderItem
	for rows.Next() {
		var item models.OrderItem
		err := rows.Scan(
			&item.ID, &item.OrderID, &item.ProductID, &item.ProductName,
			&item.Quantity, &item.UnitPrice, &item.TaxRate, &item.TaxAmount,
			&item.Subtotal, &item.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}

// GetOrders retrieves orders with optional filters and pagination
func (r *OrderRepositoryPostgres) GetOrders(ctx context.Context, schemaName string, status *string, limit, offset int) ([]models.Order, int, error) {
	// Build query with optional status filter
	whereClause := ""
	args := []interface{}{}
	argIdx := 1

	if status != nil && *status != "" {
		whereClause = fmt.Sprintf("WHERE status = $%d::VARCHAR", argIdx)
		args = append(args, *status)
		argIdx++
	}

	// Count total
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM "%s".orders %s`, schemaName, whereClause)
	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Get orders with pagination
	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT id, order_number, status, total_amount, total_vat,
		       payment_method, tips, change, created_by,
		       completed_at, cancelled_at, created_at, updated_at
		FROM "%s".orders
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, schemaName, whereClause, argIdx, argIdx+1)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var order models.Order
		err := rows.Scan(
			&order.ID, &order.OrderNumber, &order.Status, &order.TotalAmount,
			&order.TotalVAT, &order.PaymentMethod, &order.Tips, &order.Change,
			&order.CreatedBy, &order.CompletedAt, &order.CancelledAt,
			&order.CreatedAt, &order.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		orders = append(orders, order)
	}

	return orders, total, nil
}
