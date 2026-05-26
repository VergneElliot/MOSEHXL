package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"musebar-pos/internal/repository"
)

type HappyHourHandler struct {
	productRepo repository.ProductRepository
}

func NewHappyHourHandler(productRepo repository.ProductRepository) *HappyHourHandler {
	return &HappyHourHandler{productRepo: productRepo}
}

// ToggleHappyHourRequest represents the request to toggle happy hour
type ToggleHappyHourRequest struct {
	Active bool `json:"active"`
}

// ToggleHappyHour enables/disables happy hour pricing globally
func (h *HappyHourHandler) ToggleHappyHour(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	var req ToggleHappyHourRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update all products with happy hour pricing
	err := h.productRepo.ToggleHappyHour(r.Context(), schemaName, req.Active)
	if err != nil {
		http.Error(w, "Failed to toggle happy hour", http.StatusInternalServerError)
		return
	}

	status := "disabled"
	if req.Active {
		status = "enabled"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"happy_hour_active": req.Active,
		"message":          "Happy hour " + status,
	})
}

// SetProductHappyHourPrice sets the happy hour price for a specific product
func (h *HappyHourHandler) SetProductHappyHourPrice(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)
	idStr := r.PathValue("id")
	productID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid product ID", http.StatusBadRequest)
		return
	}

	var req struct {
		HappyHourPrice float64 `json:"happy_hour_price"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update the product's happy hour price
	updates := map[string]interface{}{
		"happy_hour_price": req.HappyHourPrice,
	}

	err = h.productRepo.UpdateProduct(r.Context(), schemaName, productID, updates)
	if err != nil {
		http.Error(w, "Failed to update happy hour price", http.StatusInternalServerError)
		return
	}

	// Get updated product
	product, _ := h.productRepo.GetProductByID(r.Context(), schemaName, productID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"product": product,
		"message": "Happy hour price updated",
	})
}

// GetHappyHourStatus returns the current happy hour status
func (h *HappyHourHandler) GetHappyHourStatus(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	// Get all products to check happy hour status
	products, err := h.productRepo.GetAllProducts(r.Context(), schemaName, false)
	if err != nil {
		http.Error(w, "Failed to get products", http.StatusInternalServerError)
		return
	}

	// Check if any product has happy hour active
	happyHourActive := false
	productsWithHappyHour := 0

	for _, p := range products {
		if p.HappyHourActive {
			happyHourActive = true
		}
		if p.HappyHourPrice != nil && *p.HappyHourPrice > 0 {
			productsWithHappyHour++
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"happy_hour_active":        happyHourActive,
		"products_with_happy_hour": productsWithHappyHour,
		"total_products":           len(products),
	})
}
