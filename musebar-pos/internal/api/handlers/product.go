package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"musebar-pos/internal/models"
	"musebar-pos/internal/repository"
)

type ProductHandler struct {
	repo repository.ProductRepository
}

func NewProductHandler(repo repository.ProductRepository) *ProductHandler {
	return &ProductHandler{repo: repo}
}

// Category handlers

func (h *ProductHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	var category models.Category
	if err := json.NewDecoder(r.Body).Decode(&category); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Set defaults
	if category.Color == "" {
		category.Color = "#3B82F6"
	}
	if category.DefaultTaxRate == 0 {
		category.DefaultTaxRate = 20.00
	}
	category.IsActive = true

	if err := h.repo.CreateCategory(r.Context(), schemaName, &category); err != nil {
		http.Error(w, "Failed to create category", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(category)
}

func (h *ProductHandler) GetCategories(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	includeArchived := r.URL.Query().Get("include_archived") == "true"

	categories, err := h.repo.GetAllCategories(r.Context(), schemaName, includeArchived)
	if err != nil {
		http.Error(w, "Failed to get categories", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"categories": categories,
		"total":      len(categories),
	})
}

func (h *ProductHandler) GetCategory(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid category ID", http.StatusBadRequest)
		return
	}

	category, err := h.repo.GetCategoryByID(r.Context(), schemaName, id)
	if err != nil {
		http.Error(w, "Category not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(category)
}

func (h *ProductHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid category ID", http.StatusBadRequest)
		return
	}

	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.repo.UpdateCategory(r.Context(), schemaName, id, updates); err != nil {
		http.Error(w, "Failed to update category", http.StatusInternalServerError)
		return
	}

	// Return updated category
	category, _ := h.repo.GetCategoryByID(r.Context(), schemaName, id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(category)
}

func (h *ProductHandler) ArchiveCategory(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid category ID", http.StatusBadRequest)
		return
	}

	if err := h.repo.ArchiveCategory(r.Context(), schemaName, id); err != nil {
		http.Error(w, "Failed to archive category", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Product handlers

func (h *ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	var product models.Product
	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Set defaults
	if product.TaxRate == 0 {
		product.TaxRate = 20.00
	}
	product.IsActive = true

	if err := h.repo.CreateProduct(r.Context(), schemaName, &product); err != nil {
		http.Error(w, "Failed to create product", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(product)
}

func (h *ProductHandler) GetProducts(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	categoryIDStr := r.URL.Query().Get("category_id")
	includeArchived := r.URL.Query().Get("include_archived") == "true"

	var products []models.Product
	var err error

	if categoryIDStr != "" {
		categoryID, parseErr := strconv.ParseInt(categoryIDStr, 10, 64)
		if parseErr != nil {
			http.Error(w, "Invalid category_id", http.StatusBadRequest)
			return
		}
		products, err = h.repo.GetProductsByCategory(r.Context(), schemaName, categoryID)
	} else {
		products, err = h.repo.GetAllProducts(r.Context(), schemaName, includeArchived)
	}

	if err != nil {
		http.Error(w, "Failed to get products", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"products": products,
		"total":    len(products),
	})
}

func (h *ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid product ID", http.StatusBadRequest)
		return
	}

	product, err := h.repo.GetProductByID(r.Context(), schemaName, id)
	if err != nil {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(product)
}

func (h *ProductHandler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid product ID", http.StatusBadRequest)
		return
	}

	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.repo.UpdateProduct(r.Context(), schemaName, id, updates); err != nil {
		http.Error(w, "Failed to update product", http.StatusInternalServerError)
		return
	}

	// Return updated product
	product, _ := h.repo.GetProductByID(r.Context(), schemaName, id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(product)
}

func (h *ProductHandler) ArchiveProduct(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid product ID", http.StatusBadRequest)
		return
	}

	if err := h.repo.ArchiveProduct(r.Context(), schemaName, id); err != nil {
		http.Error(w, "Failed to archive product", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
