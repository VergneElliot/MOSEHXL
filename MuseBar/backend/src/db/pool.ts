/**
 * Canonical pool import surface for non-bootstrap modules.
 *
 * Keep route/domain modules importing from here instead of from app bootstrap.
 * This pass intentionally preserves existing runtime initialization behavior.
 */
export { pool } from '../app';
