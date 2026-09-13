import React from 'react';
import { Paper, type PaperProps } from '@mui/material';
import { usePosDropTarget } from '../usePosDropTarget';
import { SPLIT_DND_MIME, SPLIT_POOL_DROP_ID } from './splitDnD';
import '../posDropActive.css';

type SplitPoolDropPaperProps = PaperProps & {
  onReturnIds: (sourceIds: string[]) => void;
};

/** Left pool as drop zone (bill → pool). */
export const SplitPoolDropPaper = React.forwardRef<HTMLDivElement, SplitPoolDropPaperProps>(
  function SplitPoolDropPaper({ onReturnIds, children, ...paperProps }, _ref) {
    const dropRef = usePosDropTarget(SPLIT_POOL_DROP_ID, detail => {
      if (detail.mime !== SPLIT_DND_MIME) return;
      try {
        const ids = JSON.parse(detail.data) as string[];
        if (Array.isArray(ids) && ids.length > 0) onReturnIds(ids);
      } catch {
        // ignore
      }
    });

    return (
      <Paper
        ref={dropRef as React.RefObject<HTMLDivElement>}
        onDragOver={e => {
          if (![...e.dataTransfer.types].includes(SPLIT_DND_MIME)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={e => {
          e.preventDefault();
          const raw = e.dataTransfer.getData(SPLIT_DND_MIME);
          if (!raw) return;
          try {
            const ids = JSON.parse(raw) as string[];
            if (Array.isArray(ids) && ids.length > 0) onReturnIds(ids);
          } catch {
            // ignore
          }
        }}
        {...paperProps}
      >
        {children}
      </Paper>
    );
  }
);
