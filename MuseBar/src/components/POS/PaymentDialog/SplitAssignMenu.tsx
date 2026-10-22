import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import type { LocalSubBill } from '../../../types';
import type { SplitMenuAnchor } from './useSplitRepartir';

interface SplitAssignMenuProps {
  menuAnchor: SplitMenuAnchor | null;
  pickBillsOpen: boolean;
  subBills: LocalSubBill[];
  onClose: () => void;
  onAssignToBill: (itemIds: string[], billIndex: number) => void;
  onRepartir: (itemIds: string[]) => void;
}

const SplitAssignMenu: React.FC<SplitAssignMenuProps> = ({
  menuAnchor,
  pickBillsOpen,
  subBills,
  onClose,
  onAssignToBill,
  onRepartir,
}) => (
  <Menu
    open={menuAnchor != null && !pickBillsOpen}
    onClose={onClose}
    anchorReference="anchorPosition"
    anchorPosition={
      menuAnchor != null ? { top: menuAnchor.mouseY, left: menuAnchor.mouseX } : undefined
    }
  >
    {subBills.map((_, index) => (
      <MenuItem
        key={`move-${index}`}
        onClick={() => menuAnchor && onAssignToBill(menuAnchor.itemIds, index)}
      >
        Envoyer vers Paiement {index + 1}
      </MenuItem>
    ))}
    <MenuItem
      onClick={() => {
        if (!menuAnchor) return;
        onRepartir(menuAnchor.itemIds);
      }}
    >
      Répartir…
    </MenuItem>
  </Menu>
);

export default SplitAssignMenu;
