/**
 * One snap-scroll column of fixed choices for date/time wheels.
 */

import React, { useEffect, useRef } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';

const ITEM_H = 40;
const VISIBLE = 5;

export type ParisWheelColumnProps<T extends string | number> = {
  ariaLabel: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  formatLabel?: (option: T) => string;
};

export function ParisWheelColumn<T extends string | number>({
  ariaLabel,
  options,
  value,
  onChange,
  formatLabel = (o) => String(o),
}: ParisWheelColumnProps<T>): React.ReactElement {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = options.indexOf(value);
    if (idx < 0) return;
    el.scrollTop = idx * ITEM_H;
  }, [options, value]);

  return (
    <Box
      role="listbox"
      aria-label={ariaLabel}
      ref={scrollerRef}
      sx={{
        width: '100%',
        height: ITEM_H * VISIBLE,
        overflowY: 'auto',
        scrollSnapType: 'y mandatory',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        '&::-webkit-scrollbar': { width: 6 },
      }}
    >
      {options.map((option) => {
        const selected = option === value;
        return (
          <ButtonBase
            key={String(option)}
            role="option"
            aria-selected={selected}
            onClick={() => onChange(option)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: ITEM_H,
              scrollSnapAlign: 'center',
              bgcolor: selected ? 'primary.main' : 'transparent',
              color: selected ? 'primary.contrastText' : 'text.primary',
              '&:hover': {
                bgcolor: selected ? 'primary.dark' : 'action.hover',
              },
            }}
          >
            <Typography variant="body2" fontWeight={selected ? 700 : 400} noWrap>
              {formatLabel(option)}
            </Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
