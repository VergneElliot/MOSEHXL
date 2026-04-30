/**
 * Central permission name constants (match `permissions.name` in the database).
 * Use these with requirePermission() to avoid string drift.
 */
import { PERMISSIONS } from '@mosehxl/types';

export const P = PERMISSIONS;

export type PermissionName = (typeof P)[keyof typeof P];
