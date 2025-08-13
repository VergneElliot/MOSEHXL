import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number | string;
      email?: string;
      is_admin?: boolean;
      establishment_id?: string;
      [key: string]: unknown;
    };
    requestId?: string;
  }
} 