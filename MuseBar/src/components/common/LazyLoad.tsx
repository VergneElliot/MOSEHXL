import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import LoadingSpinner from './LoadingSpinner';

interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  height?: number | string;
  threshold?: number;
  rootMargin?: string;
}

const LazyComponent: React.FC<LazyComponentProps> = ({
  children,
  fallback,
  height = 200,
  threshold = 0.1,
  rootMargin = '50px',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(ref);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(ref);
    return () => {
      if (ref) observer.unobserve(ref);
    };
  }, [ref, threshold, rootMargin]);

  return (
    <Box
      ref={setRef}
      sx={{
        minHeight: height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isVisible ? children : fallback || <LoadingSpinner message="Chargement du contenu..." />}
    </Box>
  );
};

export default LazyComponent;


