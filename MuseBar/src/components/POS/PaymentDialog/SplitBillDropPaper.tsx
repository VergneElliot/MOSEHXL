import React from 'react';
import { Paper, type PaperProps } from '@mui/material';
import { usePosDropTarget } from '../usePosDropTarget';
import { SPLIT_DND_MIME, splitBillDropId } from './splitDnD';
import '../posDropActive.css';

type SplitBillDropPaperProps = PaperProps & {
  billIndex: number;
  onAssignIds: (ids: string[], billIndex: number) => void;
};

/** Paper drop zone for HTML5 + shared touch DnD. */
export const SplitBillDropPaper = React.forwardRef<HTMLDivElement, SplitBillDropPaperProps>(
  function SplitBillDropPaper({ billIndex, onAssignIds, children, ...paperProps }, _ref) {
    const dropRef = usePosDropTarget(splitBillDropId(billIndex), detail => {
      if (detail.mime !== SPLIT_DND_MIME) return;
      try {
        const ids = JSON.parse(detail.data) as string[];
        if (Array.isArray(ids) && ids.length > 0) onAssignIds(ids, billIndex);
      } catch {
        // ignore bad payload
      }
    });

    return (
      <Paper ref={dropRef as React.RefObject<HTMLDivElement>} {...paperProps}>
        {children}
      </Paper>
    );
  }
);
