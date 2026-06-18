import { renderHook, act } from '@testing-library/react';
import { usePOSState } from '../usePOSState';
import { OrderItem } from '../../types';

// Mock data not needed currently

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
    expect(state.mobileView).toBe('menu');
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

  it('should update mobile view', () => {
    const { result } = renderHook(() => usePOSState());
    const [, actions] = result.current;

    act(() => {
      actions.setMobileView('order');
    });

    expect(result.current[0].mobileView).toBe('order');
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
