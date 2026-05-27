package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"musebar-pos/internal/models"
	"musebar-pos/internal/repository"
)

type ProductRepositoryPostgres struct {
	db *pgxpool.Pool
}

func NewProductRepository(db *pgxpool.Pool) repository.ProductRepository {
	return &ProductRepositoryPostgres{db: db}
}

// Category methods

func (r *ProductRepositoryPostgres) CreateCategory(ctx context.Context, schemaName string, category *models.Category) error {
	query := fmt.Sprintf(`
		INSERT INTO "%s".categories (name, color, default_tax_rate, display_order, is_active)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`, schemaName)

	return r.db.QueryRow(ctx, query,
		category.Name, category.Color, category.DefaultTaxRate,
		category.DisplayOrder, category.IsActive,
	).Scan(&category.ID, &category.CreatedAt, &category.UpdatedAt)
}

func (r *ProductRepositoryPostgres) GetCategoryByID(ctx context.Context, schemaName string, categoryID int64) (*models.Category, error) {
	query := fmt.Sprintf(`
		SELECT id, name, color, default_tax_rate, display_order,
		       is_active, is_archived, created_at, updated_at
		FROM "%s".categories
		WHERE id = $1
	`, schemaName)

	var c models.Category
	err := r.db.QueryRow(ctx, query, categoryID).Scan(
		&c.ID, &c.Name, &c.Color, &c.DefaultTaxRate, &c.DisplayOrder,
		&c.IsActive, &c.IsArchived, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ProductRepositoryPostgres) GetAllCategories(ctx context.Context, schemaName string, includeArchived bool) ([]models.Category, error) {
	query := fmt.Sprintf(`
		SELECT id, name, color, default_tax_rate, display_order,
		       is_active, is_archived, created_at, updated_at
		FROM "%s".categories
		WHERE 1=1
	`, schemaName)

	if !includeArchived {
		query += " AND is_archived = false"
	}

	query += " ORDER BY display_order, name"

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var c models.Category
		err := rows.Scan(
			&c.ID, &c.Name, &c.Color, &c.DefaultTaxRate, &c.DisplayOrder,
			&c.IsActive, &c.IsArchived, &c.CreatedAt, &c.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}

	return categories, nil
}

func (r *ProductRepositoryPostgres) UpdateCategory(ctx context.Context, schemaName string, categoryID int64, updates map[string]interface{}) error {
	// Build dynamic UPDATE query from map
	setClauses := []string{}
	args := []interface{}{}
	argIndex := 1

	for key, value := range updates {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIndex))
		args = append(args, value)
		argIndex++
	}

	if len(setClauses) == 0 {
		return fmt.Errorf("no fields to update")
	}

	args = append(args, categoryID)
	query := fmt.Sprintf(`
		UPDATE "%s".categories
		SET %s
		WHERE id = $%d
	`, schemaName, joinStrings(setClauses, ", "), argIndex)

	_, err := r.db.Exec(ctx, query, args...)
	return err
}

func (r *ProductRepositoryPostgres) ArchiveCategory(ctx context.Context, schemaName string, categoryID int64) error {
	query := fmt.Sprintf(`
		UPDATE "%s".categories
		SET is_archived = true, is_active = false
		WHERE id = $1
	`, schemaName)

	_, err := r.db.Exec(ctx, query, categoryID)
	return err
}

// Product methods

func (r *ProductRepositoryPostgres) CreateProduct(ctx context.Context, schemaName string, product *models.Product) error {
	query := fmt.Sprintf(`
		INSERT INTO "%s".products (
			category_id, name, description, price, tax_rate,
			is_active, happy_hour_price, happy_hour_active
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`, schemaName)

	return r.db.QueryRow(ctx, query,
		product.CategoryID, product.Name, product.Description, product.Price,
		product.TaxRate, product.IsActive, product.HappyHourPrice, product.HappyHourActive,
	).Scan(&product.ID, &product.CreatedAt, &product.UpdatedAt)
}

func (r *ProductRepositoryPostgres) GetProductByID(ctx context.Context, schemaName string, productID int64) (*models.Product, error) {
	query := fmt.Sprintf(`
		SELECT id, category_id, name, description, price, tax_rate,
		       display_order, is_active, is_archived, happy_hour_price, happy_hour_active,
		       created_at, updated_at
		FROM "%s".products
		WHERE id = $1
	`, schemaName)

	var p models.Product
	err := r.db.QueryRow(ctx, query, productID).Scan(
		&p.ID, &p.CategoryID, &p.Name, &p.Description, &p.Price, &p.TaxRate,
		&p.DisplayOrder, &p.IsActive, &p.IsArchived, &p.HappyHourPrice, &p.HappyHourActive,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProductRepositoryPostgres) GetAllProducts(ctx context.Context, schemaName string, includeArchived bool) ([]models.Product, error) {
	query := fmt.Sprintf(`
		SELECT id, category_id, name, description, price, tax_rate,
		       display_order, is_active, is_archived, happy_hour_price, happy_hour_active,
		       created_at, updated_at
		FROM "%s".products
		WHERE 1=1
	`, schemaName)

	if !includeArchived {
		query += " AND is_archived = false"
	}

	query += " ORDER BY display_order ASC, name ASC"

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(
			&p.ID, &p.CategoryID, &p.Name, &p.Description, &p.Price, &p.TaxRate,
			&p.DisplayOrder, &p.IsActive, &p.IsArchived, &p.HappyHourPrice, &p.HappyHourActive,
			&p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}

	return products, nil
}

func (r *ProductRepositoryPostgres) GetProductsByCategory(ctx context.Context, schemaName string, categoryID int64) ([]models.Product, error) {
	query := fmt.Sprintf(`
		SELECT id, category_id, name, description, price, tax_rate,
		       display_order, is_active, is_archived, happy_hour_price, happy_hour_active,
		       created_at, updated_at
		FROM "%s".products
		WHERE category_id = $1 AND is_archived = false
		ORDER BY display_order ASC, name ASC
	`, schemaName)

	rows, err := r.db.Query(ctx, query, categoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(
			&p.ID, &p.CategoryID, &p.Name, &p.Description, &p.Price, &p.TaxRate,
			&p.DisplayOrder, &p.IsActive, &p.IsArchived, &p.HappyHourPrice, &p.HappyHourActive,
			&p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}

	return products, nil
}

func (r *ProductRepositoryPostgres) UpdateProduct(ctx context.Context, schemaName string, productID int64, updates map[string]interface{}) error {
	setClauses := []string{}
	args := []interface{}{}
	argIndex := 1

	for key, value := range updates {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIndex))
		args = append(args, value)
		argIndex++
	}

	if len(setClauses) == 0 {
		return fmt.Errorf("no fields to update")
	}

	args = append(args, productID)
	query := fmt.Sprintf(`
		UPDATE "%s".products
		SET %s
		WHERE id = $%d
	`, schemaName, joinStrings(setClauses, ", "), argIndex)

	_, err := r.db.Exec(ctx, query, args...)
	return err
}

func (r *ProductRepositoryPostgres) ArchiveProduct(ctx context.Context, schemaName string, productID int64) error {
	query := fmt.Sprintf(`
		UPDATE "%s".products
		SET is_archived = true, is_active = false
		WHERE id = $1
	`, schemaName)

	_, err := r.db.Exec(ctx, query, productID)
	return err
}

// Helper function to join strings
func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}

// ToggleHappyHour enables or disables happy hour for all products
func (r *ProductRepositoryPostgres) ToggleHappyHour(ctx context.Context, schemaName string, active bool) error {
	query := fmt.Sprintf(`
		UPDATE "%s".products
		SET happy_hour_active = $1
		WHERE happy_hour_price IS NOT NULL
	`, schemaName)

	_, err := r.db.Exec(ctx, query, active)
	return err
}

// GetHappyHourStatus checks if happy hour is currently active
func (r *ProductRepositoryPostgres) GetHappyHourStatus(ctx context.Context, schemaName string) (bool, error) {
	query := fmt.Sprintf(`
		SELECT EXISTS(
			SELECT 1 FROM "%s".products
			WHERE happy_hour_active = true
			LIMIT 1
		)
	`, schemaName)

	var active bool
	err := r.db.QueryRow(ctx, query).Scan(&active)
	return active, err
}

// UpdateProductDisplayOrder updates the display order of a product
func (r *ProductRepositoryPostgres) UpdateProductDisplayOrder(ctx context.Context, schemaName string, productID int64, displayOrder int) error {
	query := fmt.Sprintf(`
		UPDATE "%s".products
		SET display_order = $1, updated_at = NOW()
		WHERE id = $2
	`, schemaName)
	_, err := r.db.Exec(ctx, query, displayOrder, productID)
	return err
}

// UpdateCategoryDisplayOrder updates the display order of a category
func (r *ProductRepositoryPostgres) UpdateCategoryDisplayOrder(ctx context.Context, schemaName string, categoryID int64, displayOrder int) error {
	query := fmt.Sprintf(`
		UPDATE "%s".categories
		SET display_order = $1, updated_at = NOW()
		WHERE id = $2
	`, schemaName)
	_, err := r.db.Exec(ctx, query, displayOrder, categoryID)
	return err
}
