package validation

import (
	"encoding/json"
	"fmt"
)

// --- Product Validation ---

type CreateProductRequest struct {
	CategoryID  int64   `json:"category_id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	TaxRate     float64 `json:"tax_rate"`
	IsActive    *bool   `json:"is_active"`
}

func ValidateCreateProduct(body json.RawMessage) (*CreateProductRequest, *ValidationError) {
	var req CreateProductRequest
	if err := json.Unmarshal(body, &req); err != nil {
		v := NewValidator()
		v.Add("Corps de requête invalide (JSON malformé)")
		return nil, v
	}

	v := NewValidator()
	RequirePositiveInt(v, "category_id", int(req.CategoryID))
	RequireString(v, "name", req.Name, 2, 100)
	OptionalString(v, "description", req.Description, 500)
	RequirePositiveFloat(v, "price", req.Price)
	RequireTaxRate(v, "tax_rate", req.TaxRate)

	if v.HasErrors() {
		return nil, v
	}
	return &req, nil
}

type UpdateProductRequest struct {
	Name            *string  `json:"name"`
	Description     *string  `json:"description"`
	Price           *float64 `json:"price"`
	TaxRate         *float64 `json:"tax_rate"`
	IsActive        *bool    `json:"is_active"`
	HappyHourPrice  *float64 `json:"happy_hour_price"`
}

func ValidateUpdateProduct(body json.RawMessage) (*UpdateProductRequest, *ValidationError) {
	var req UpdateProductRequest
	if err := json.Unmarshal(body, &req); err != nil {
		v := NewValidator()
		v.Add("Corps de requête invalide (JSON malformé)")
		return nil, v
	}

	v := NewValidator()
	if req.Name != nil {
		RequireString(v, "name", *req.Name, 2, 100)
	}
	if req.Description != nil {
		OptionalString(v, "description", *req.Description, 500)
	}
	if req.Price != nil {
		RequirePositiveFloat(v, "price", *req.Price)
	}
	if req.TaxRate != nil {
		RequireTaxRate(v, "tax_rate", *req.TaxRate)
	}
	if req.HappyHourPrice != nil {
		RequirePositiveFloat(v, "happy_hour_price", *req.HappyHourPrice)
	}

	if v.HasErrors() {
		return nil, v
	}
	return &req, nil
}

// --- Category Validation ---

type CreateCategoryRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func ValidateCreateCategory(body json.RawMessage) (*CreateCategoryRequest, *ValidationError) {
	var req CreateCategoryRequest
	if err := json.Unmarshal(body, &req); err != nil {
		v := NewValidator()
		v.Add("Corps de requête invalide (JSON malformé)")
		return nil, v
	}

	v := NewValidator()
	RequireString(v, "name", req.Name, 2, 100)
	OptionalString(v, "description", req.Description, 500)

	if v.HasErrors() {
		return nil, v
	}
	return &req, nil
}

// --- Order Validation ---

type OrderItemRequest struct {
	ProductID int64 `json:"product_id"`
	Quantity  int   `json:"quantity"`
}

type CreateOrderRequest struct {
	Items         []OrderItemRequest `json:"items"`
	PaymentMethod string             `json:"payment_method"`
	Tips          float64            `json:"tips"`
	Change        float64            `json:"change"`
}

func ValidateCreateOrder(body json.RawMessage) (*CreateOrderRequest, *ValidationError) {
	var req CreateOrderRequest
	if err := json.Unmarshal(body, &req); err != nil {
		v := NewValidator()
		v.Add("Corps de requête invalide (JSON malformé)")
		return nil, v
	}

	v := NewValidator()
	RequireNonEmptySlice(v, "items", len(req.Items))
	RequireEnum(v, "payment_method", req.PaymentMethod, []string{"CASH", "CARD", "SPLIT"})
	RequirePositiveFloat(v, "tips", req.Tips)
	RequirePositiveFloat(v, "change", req.Change)

	for i, item := range req.Items {
		if item.ProductID <= 0 {
			v.Add(fmt.Sprintf("items[%d].product_id doit être un entier positif", i))
		}
		if item.Quantity <= 0 {
			v.Add(fmt.Sprintf("items[%d].quantity doit être un entier positif", i))
		}
		if item.Quantity > 100 {
			v.Add(fmt.Sprintf("items[%d].quantity ne peut pas dépasser 100", i))
		}
	}

	if v.HasErrors() {
		return nil, v
	}
	return &req, nil
}

// --- Auth Validation ---

type LoginRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	RememberMe bool   `json:"remember_me"`
}

func ValidateLogin(body json.RawMessage) (*LoginRequest, *ValidationError) {
	var req LoginRequest
	if err := json.Unmarshal(body, &req); err != nil {
		v := NewValidator()
		v.Add("Corps de requête invalide (JSON malformé)")
		return nil, v
	}

	v := NewValidator()
	RequireEmail(v, "email", req.Email)
	RequireString(v, "password", req.Password, 8, 128)

	if v.HasErrors() {
		return nil, v
	}
	return &req, nil
}

// --- Closure Validation ---

type DailyClosureRequest struct {
	Date         string  `json:"date"`
	FondDeCaisse float64 `json:"fond_de_caisse"`
}

func ValidateDailyClosure(body json.RawMessage) (*DailyClosureRequest, *ValidationError) {
	var req DailyClosureRequest
	if err := json.Unmarshal(body, &req); err != nil {
		v := NewValidator()
		v.Add("Corps de requête invalide (JSON malformé)")
		return nil, v
	}

	v := NewValidator()
	RequireString(v, "date", req.Date, 10, 10)
	RequirePositiveFloat(v, "fond_de_caisse", req.FondDeCaisse)

	if v.HasErrors() {
		return nil, v
	}
	return &req, nil
}
