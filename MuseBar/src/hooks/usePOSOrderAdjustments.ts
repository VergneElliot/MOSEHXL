import { useCallback } from 'react';
import { OrderItem } from '../types';
import { HappyHourService } from '../services/happyHourService';

interface UsePOSOrderAdjustmentsArgs {
  currentOrder: OrderItem[];
  updateLineAt: (index: number, updates: Partial<OrderItem>) => void;
}

export const usePOSOrderAdjustments = ({
  currentOrder,
  updateLineAt,
}: UsePOSOrderAdjustmentsArgs) => {
  const happyHourService = HappyHourService.getInstance();

  const handleApplyHappyHour = useCallback(
    (index: number) => {
      const line = currentOrder[index];
      if (!line) return;

      // Toggle off manual Happy Hour if already applied
      if (line.isHappyHourApplied && line.isManualHappyHour) {
        const basePrice = line.originalPrice ?? line.unitPrice;
        const taxAmount = basePrice * (line.taxRate / (1 + line.taxRate));
        updateLineAt(index, {
          isHappyHourApplied: false,
          isManualHappyHour: false,
          unitPrice: basePrice,
          totalPrice: basePrice,
          taxAmount,
        });
        return;
      }

      const settings = happyHourService.getSettings();
      const basePrice = line.originalPrice ?? line.unitPrice;
      let discountedPrice: number;
      if (settings.discountType === 'percentage') {
        discountedPrice = basePrice * (1 - (settings.discountValue ?? 0));
      } else {
        discountedPrice = Math.max(0, basePrice - (settings.discountValue ?? 0));
      }
      const taxAmount = discountedPrice * (line.taxRate / (1 + line.taxRate));
      updateLineAt(index, {
        isHappyHourApplied: true,
        isManualHappyHour: true,
        originalPrice: basePrice,
        unitPrice: discountedPrice,
        totalPrice: discountedPrice,
        taxAmount,
      });
    },
    [currentOrder, updateLineAt, happyHourService]
  );

  const handleApplyOffert = useCallback(
    (index: number) => {
      const line = currentOrder[index];
      if (!line) return;

      const basePrice = line.originalPrice ?? line.unitPrice;

      // Toggle off "Offert"
      if (line.isOffert) {
        const taxAmount = basePrice * (line.taxRate / (1 + line.taxRate));
        const cleanedDescription =
          line.description?.replace(/\s*\[Offert\]/g, '').trim() || undefined;

        updateLineAt(index, {
          isOffert: false,
          unitPrice: basePrice,
          totalPrice: basePrice,
          taxAmount,
          description: cleanedDescription,
        });
        return;
      }

      const desc = line.description?.trim()
        ? `${line.description.trim()} [Offert]`
        : '[Offert]';

      updateLineAt(index, {
        isOffert: true,
        isPerso: false,
        isHappyHourApplied: false,
        isManualHappyHour: false,
        originalPrice: basePrice,
        unitPrice: 0,
        totalPrice: 0,
        taxAmount: 0,
        description: desc,
      });
    },
    [currentOrder, updateLineAt]
  );

  const handleApplyPerso = useCallback(
    (index: number) => {
      const line = currentOrder[index];
      if (!line) return;

      const basePrice = line.originalPrice ?? line.unitPrice;

      // Toggle off "Perso"
      if (line.isPerso) {
        const taxAmount = basePrice * (line.taxRate / (1 + line.taxRate));
        const cleanedDescription =
          line.description?.replace(/\s*\[Perso\]/g, '').trim() || undefined;

        updateLineAt(index, {
          isPerso: false,
          unitPrice: basePrice,
          totalPrice: basePrice,
          taxAmount,
          description: cleanedDescription,
        });
        return;
      }

      const desc = line.description?.trim()
        ? `${line.description.trim()} [Perso]`
        : '[Perso]';

      updateLineAt(index, {
        isPerso: true,
        isOffert: false,
        isHappyHourApplied: false,
        isManualHappyHour: false,
        originalPrice: basePrice,
        unitPrice: 0,
        totalPrice: 0,
        taxAmount: 0,
        description: desc,
      });
    },
    [currentOrder, updateLineAt]
  );

  return {
    handleApplyHappyHour,
    handleApplyOffert,
    handleApplyPerso,
  };
};

