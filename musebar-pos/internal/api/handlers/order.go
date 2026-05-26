package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"musebar-pos/internal/domain/legal"
	"musebar-pos/internal/models"
	"musebar-pos/internal/repository"
)

type OrderHandler struct {
	orderRepo      repository.OrderRepository
	productRepo    repository.ProductRepository
	journalService *legal.JournalService
}

func NewOrderHandler(orderRepo repository.OrderRepository, productRepo repository.ProductRepository, journalService *legal.JournalService) *OrderHandler {
	return &OrderHandler{
		orderRepo:      orderRepo,
		productRepo:    productRepo,
		journalService: journalService,
	}
}

// CreateOrderRequest represents the request to create an order
type CreateOrderRequest struct {
	Items         []OrderItemRequest `json:"items"`
	PaymentMethod string             `json:"payment_method"`
	Tips          float64            `json:"tips"`
	Change        float64            `json:"change"`
	CreatedBy     *int64             `json:"created_by,omitempty"`
}

type OrderItemRequest struct {
	ProductID int64 `json:"product_id"`
	Quantity  int   `json:"quantity"`
}

// CreateOrder creates a new order and records it in the legal journal
func (h *OrderHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	var req CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.Items) == 0 {
		http.Error(w, "Order must have at least one item", http.StatusBadRequest)
		return
	}

	// Calculate totals by fetching product details
	var orderItems []models.OrderItem
	var totalAmount float64
	var totalVAT float64

	for _, itemReq := range req.Items {
		// Get product details
		product, err := h.productRepo.GetProductByID(r.Context(), schemaName, itemReq.ProductID)
		if err != nil {
			http.Error(w, fmt.Sprintf("Product %d not found", itemReq.ProductID), http.StatusNotFound)
			return
		}

		// Calculate item totals
		unitPrice := product.Price
		taxRate := product.TaxRate
		subtotal := unitPrice * float64(itemReq.Quantity)
		taxAmount := subtotal * (taxRate / 100)

		orderItem := models.OrderItem{
			ProductID:   itemReq.ProductID,
			ProductName: product.Name,
			Quantity:    itemReq.Quantity,
			UnitPrice:   unitPrice,
			TaxRate:     taxRate,
			TaxAmount:   taxAmount,
			Subtotal:    subtotal,
		}

		orderItems = append(orderItems, orderItem)
		totalAmount += subtotal
		totalVAT += taxAmount
	}

	// Generate order number (timestamp-based)
	orderNumber := fmt.Sprintf("ORD-%d", time.Now().Unix())

	// Create order
	order := &models.Order{
		OrderNumber:   orderNumber,
		Status:        "COMPLETED",
		TotalAmount:   totalAmount,
		TotalVAT:      totalVAT,
		PaymentMethod: req.PaymentMethod,
		Tips:          req.Tips,
		Change:        req.Change,
		CreatedBy:     req.CreatedBy,
	}

	// Save order
	if err := h.orderRepo.CreateOrder(r.Context(), schemaName, order); err != nil {
		http.Error(w, "Failed to create order", http.StatusInternalServerError)
		return
	}

	// Set order_id for items
	for i := range orderItems {
		orderItems[i].OrderID = order.ID
	}

	// Save order items
	if err := h.orderRepo.CreateOrderItems(r.Context(), schemaName, orderItems); err != nil {
		http.Error(w, "Failed to create order items", http.StatusInternalServerError)
		return
	}

	// Record in legal journal
	orderData := map[string]interface{}{
		"order_id":     order.ID,
		"order_number": order.OrderNumber,
		"items":        orderItems,
	}

	var userID *string
	if req.CreatedBy != nil {
		userIDStr := fmt.Sprintf("%d", *req.CreatedBy)
		userID = &userIDStr
	}

	err := h.journalService.RecordSale(
		r.Context(),
		schemaName,
		order.ID,
		totalAmount,
		totalVAT,
		req.PaymentMethod,
		orderData,
		userID,
		"MUSEBAR-REG-001", // TODO: Get from context or config
	)

	if err != nil {
		// Order created but journal failed - log error but don't fail request
		// In production, you'd want better error handling here
		fmt.Printf("WARNING: Failed to record sale in legal journal: %v\n", err)
	}

	// Return created order with items
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"order": order,
		"items": orderItems,
	})
}

// GetOrder retrieves an order with its items
func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid order ID", http.StatusBadRequest)
		return
	}

	order, err := h.orderRepo.GetOrderByID(r.Context(), schemaName, id)
	if err != nil {
		http.Error(w, "Order not found", http.StatusNotFound)
		return
	}

	items, err := h.orderRepo.GetOrderItems(r.Context(), schemaName, id)
	if err != nil {
		http.Error(w, "Failed to get order items", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"order": order,
		"items": items,
	})
}

// GetOrders retrieves orders with optional filters

// GetOrders retrieves orders with optional filters and pagination
func (h *OrderHandler) GetOrders(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	// Parse query parameters
	statusFilter := r.URL.Query().Get("status") // COMPLETED, REFUNDED, PENDING, CANCELLED
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	offset := 0

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 200 {
			limit = l
		}
	}
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	var statusPtr *string
	if statusFilter != "" {
		statusPtr = &statusFilter
	}

	orders, total, err := h.orderRepo.GetOrders(r.Context(), schemaName, statusPtr, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch orders", http.StatusInternalServerError)
		return
	}

	// Enrich orders with items
	type OrderWithItems struct {
		models.Order
		Items []models.OrderItem `json:"items"`
	}

	ordersWithItems := make([]OrderWithItems, 0, len(orders))
	for _, order := range orders {
		items, err := h.orderRepo.GetOrderItems(r.Context(), schemaName, order.ID)
		if err != nil || items == nil {
			items = []models.OrderItem{}
		}
		ordersWithItems = append(ordersWithItems, OrderWithItems{
			Order: order,
			Items: items,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"orders": ordersWithItems,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// RefundOrderRequest represents a refund request
type RefundOrderRequest struct {
	Reason string `json:"reason"`
}
func (h *OrderHandler) RefundOrder(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)
	idStr := r.PathValue("id")
	orderID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid order ID", http.StatusBadRequest)
		return
	}

	var req RefundOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	order, err := h.orderRepo.GetOrderByID(r.Context(), schemaName, orderID)
	if err != nil {
		http.Error(w, "Order not found", http.StatusNotFound)
		return
	}

	if order.Status == "REFUNDED" {
		http.Error(w, "Order already refunded", http.StatusBadRequest)
		return
	}
	if order.Status == "CANCELLED" {
		http.Error(w, "Cannot refund cancelled order", http.StatusBadRequest)
		return
	}

	items, err := h.orderRepo.GetOrderItems(r.Context(), schemaName, orderID)
	if err != nil {
		http.Error(w, "Failed to get order items", http.StatusInternalServerError)
		return
	}

	if err := h.orderRepo.UpdateOrderStatus(r.Context(), schemaName, orderID, "REFUNDED"); err != nil {
		http.Error(w, "Failed to update order status", http.StatusInternalServerError)
		return
	}

	refundData := map[string]interface{}{
		"order_id":       orderID,
		"order_number":   order.OrderNumber,
		"refund_reason":  req.Reason,
		"original_items": items,
	}

	var userID *string
	if order.CreatedBy != nil {
		userIDStr := fmt.Sprintf("%d", *order.CreatedBy)
		userID = &userIDStr
	}

	err = h.journalService.RecordRefund(
		r.Context(),
		schemaName,
		orderID,
		-order.TotalAmount,
		-order.TotalVAT,
		order.PaymentMethod,
		refundData,
		userID,
		"MUSEBAR-REG-001",
	)

	if err != nil {
		fmt.Printf("WARNING: Failed to record refund in legal journal: %v\n", err)
	}

	refundedOrder, _ := h.orderRepo.GetOrderByID(r.Context(), schemaName, orderID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"order":   refundedOrder,
		"message": "Order refunded successfully",
	})
}
