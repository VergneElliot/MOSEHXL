/**
 * Deprecated monolithic module. Use granular components instead.
 * This file re-exports the new components to preserve backward compatibility.
 */

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export { LoadingProvider, useLoading } from './LoadingProvider';
export { default as LoadingSpinner } from './LoadingSpinner';
export { SkeletonWrapper, ProductGridSkeleton, OrderSummarySkeleton, TableSkeleton } from './Skeletons';
export { default as LoadingButton } from './LoadingButton';
export { default as LazyComponent } from './LazyLoad';
export { default as ProgressiveLoading } from './ProgressiveLoading';
export { default as ErrorRetry } from './ErrorRetry';