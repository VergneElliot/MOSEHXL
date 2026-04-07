import 'express';

/**
 * Augments the Express Request type with the `user` property populated by
 * requireAuth middleware (JWT decode). The shape must match AuthenticatedUser
 * in models/user.ts — both are maintained manually because TypeScript module
 * augmentation cannot reference project-local types.
 */
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number;
      email: string;
      is_admin: boolean;
      role: string;
      establishment_id: string | null;
    };
    requestId?: string;
    invitationValidation?: unknown;
  }
} 
