import { renderHook, act } from '@testing-library/react';
import { usePOSState } from '../usePOSState';
import { OrderItem } from '../../types';

// Mock data
const mockProduct = {
  id: 1,
  name: 'Test Product',
  price: 10.0,
  categoryId: 1,
  isActive: true,
  isHappyHourEligible: false,
  happyHourDiscountType: 'percentage',
  happyHourDiscountValue: 0,
  taxRate: 0.2,
  description: 'Test product',
};

const mockOrderItem: OrderItem = {
  id: '1',
  productId: '1',
  productName: 'Test Product',
  quantity: 2,
  unitPrice: 10.0,
  totalPrice: 20.0,
  taxAmount: 4.0,
  taxRate: 0.2,
  isHappyHourApplied: false,
};

describe('usePOSState', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePOSState());
    const [state] = result.current;

    expect(state.selectedCategory).toBe('');
    expect(state.searchQuery).toBe('');
    expect(state.currentOrder).toEqual([]);
    expect(state.paymentDialogOpen).toBe(false);
    expect(state.checkoutMode).toBe('simple');
    expect(state.splitCount).toBe(2);
    expect(state.subBills).toEqual([]);
    expect(state.currentPaymentMethod).toBe('card');
    expect(state.cashAmount).toBe('');
    expect(state.cardAmount).toBe('');
    expect(state.tips).toBe('');
    expect(state.mobileView).toBe('menu');
    expect(state.itemQuantities).toEqual({});
    expect(state.retourDialogOpen).toBe(false);
    expect(state.retourItem).toBeNull();
    expect(state.retourReason).toBe('');
    expect(state.retourPaymentMethod).toBe('cash');
    expect(state.retourLoading).toBe(false);
    expect(state.changeDialogOpen).toBe(false);
    expect(state.changeAmount).toBe('');
    expect(state.changeDirection).toBe('card-to-cash');
    expect(state.snackbar).toEqual({
      open: false,
      message: '',
      severity: 'success',
    });
  });

  it('should update selected category', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setSelectedCategory('beers');
    });

    expect(result.current[0].selectedCategory).toBe('beers');
  });

  it('should update search query', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setSearchQuery('heineken');
    });

    expect(result.current[0].searchQuery).toBe('heineken');
  });

  it('should add item to order', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.addToOrder(mockOrderItem);
    });

    expect(result.current[0].currentOrder).toHaveLength(1);
    expect(result.current[0].currentOrder[0]).toEqual(mockOrderItem);
  });

  it('should remove item from order', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    // Add item first
    act(() => {
      actions.addToOrder(mockOrderItem);
    });

    expect(result.current[0].currentOrder).toHaveLength(1);

    // Remove item
    act(() => {
      actions.removeFromOrder(0);
    });

    expect(result.current[0].currentOrder).toHaveLength(0);
  });

  it('should clear order', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    // Add items first
    act(() => {
      actions.addToOrder(mockOrderItem);
    });

    expect(result.current[0].currentOrder).toHaveLength(1);

    // Clear order
    act(() => {
      actions.clearOrder();
    });

    expect(result.current[0].currentOrder).toHaveLength(0);
  });

  it('should update payment dialog state', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setPaymentDialogOpen(true);
    });

    expect(result.current[0].paymentDialogOpen).toBe(true);
  });

  it('should update checkout mode', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setCheckoutMode('split-equal');
    });

    expect(result.current[0].checkoutMode).toBe('split-equal');
  });

  it('should update split count', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setSplitCount(4);
    });

    expect(result.current[0].splitCount).toBe(4);
  });

  it('should update payment method', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setCurrentPaymentMethod('cash');
    });

    expect(result.current[0].currentPaymentMethod).toBe('cash');
  });

  it('should update cash amount', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setCashAmount('50.00');
    });

    expect(result.current[0].cashAmount).toBe('50.00');
  });

  it('should update card amount', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setCardAmount('25.50');
    });

    expect(result.current[0].cardAmount).toBe('25.50');
  });

  it('should update tips', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setTips('5.00');
    });

    expect(result.current[0].tips).toBe('5.00');
  });

  it('should update mobile view', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setMobileView('order');
    });

    expect(result.current[0].mobileView).toBe('order');
  });

  it('should update item quantities', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setItemQuantities({ '1': 3, '2': 1 });
    });

    expect(result.current[0].itemQuantities).toEqual({ '1': 3, '2': 1 });
  });

  it('should update retour dialog state', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setRetourDialogOpen(true);
    });

    expect(result.current[0].retourDialogOpen).toBe(true);
  });

  it('should update retour item', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setRetourItem(mockOrderItem);
    });

    expect(result.current[0].retourItem).toEqual(mockOrderItem);
  });

  it('should update retour reason', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setRetourReason('Customer request');
    });

    expect(result.current[0].retourReason).toBe('Customer request');
  });

  it('should update retour payment method', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setRetourPaymentMethod('card');
    });

    expect(result.current[0].retourPaymentMethod).toBe('card');
  });

  it('should update retour loading state', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setRetourLoading(true);
    });

    expect(result.current[0].retourLoading).toBe(true);
  });

  it('should update change dialog state', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setChangeDialogOpen(true);
    });

    expect(result.current[0].changeDialogOpen).toBe(true);
  });

  it('should update change amount', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setChangeAmount('10.00');
    });

    expect(result.current[0].changeAmount).toBe('10.00');
  });

  it('should update change direction', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setChangeDirection('cash-to-card');
    });

    expect(result.current[0].changeDirection).toBe('cash-to-card');
  });

  it('should update snackbar', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setSnackbar({
        open: true,
        message: 'Test message',
        severity: 'success',
      });
    });

    expect(result.current[0].snackbar).toEqual({
      open: true,
      message: 'Test message',
      severity: 'success',
    });
  });

  it('should close snackbar', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    // Set snackbar to open first
    act(() => {
      actions.setSnackbar({
        open: true,
        message: 'Test message',
        severity: 'success',
      });
    });

    expect(result.current[0].snackbar.open).toBe(true);

    // Close snackbar
    act(() => {
      actions.setSnackbar({
        open: false,
        message: '',
        severity: 'success',
      });
    });

    expect(result.current[0].snackbar.open).toBe(false);
  });

  it('should show success message', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.showSuccess('Operation successful');
    });

    expect(result.current[0].snackbar).toEqual({
      open: true,
      message: 'Operation successful',
      severity: 'success',
    });
  });

  it('should show error message', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.showError('Operation failed');
    });

    expect(result.current[0].snackbar).toEqual({
      open: true,
      message: 'Operation failed',
      severity: 'error',
    });
  });

  it('should show info message', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setSnackbar({
        open: true,
        message: 'Information message',
        severity: 'info',
      });
    });

    expect(result.current[0].snackbar).toEqual({
      open: true,
      message: 'Information message',
      severity: 'info',
    });
  });
});
