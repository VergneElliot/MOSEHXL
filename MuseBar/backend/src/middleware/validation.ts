import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

// Basic validation functions
export const isValidId = (id: string): boolean => {
  return /^[0-9a-fA-F-]{36}$/.test(id) || /^\d+$/.test(id);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPrice = (price: number): boolean => {
  return typeof price === 'number' && price >= 0 && Number.isFinite(price);
};

export const isValidString = (str: string, minLength: number = 1, maxLength: number = 255): boolean => {
  return typeof str === 'string' && str.trim().length >= minLength && str.length <= maxLength;
};

// Validation middleware factory
export const validateBody = (validationRules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const rule of validationRules) {
      const value = req.body[rule.field];
      
      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Le champ '${rule.field}' est requis`);
        continue;
      }

      // Skip validation if field is not required and empty
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Apply validation function
      if (rule.validator && !rule.validator(value)) {
        errors.push(rule.message || `Le champ '${rule.field}' est invalide`);
      }
    }

    if (errors.length > 0) {
      return next(new AppError(`Erreurs de validation: ${errors.join(', ')}`, 400));
    }

    next();
  };
};

export const validateParams = (paramRules: ParamValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const rule of paramRules) {
      const value = req.params[rule.param];
      
      if (!rule.validator(value)) {
        errors.push(rule.message || `Paramètre '${rule.param}' invalide`);
      }
    }

    if (errors.length > 0) {
      return next(new AppError(`Paramètres invalides: ${errors.join(', ')}`, 400));
    }

    next();
  };
};

// Validation rule interfaces
interface ValidationRule {
  field: string;
  required: boolean;
  validator?: (value: any) => boolean;
  message?: string;
}

interface ParamValidationRule {
  param: string;
  validator: (value: any) => boolean;
  message?: string;
}

// Common validation rules
export const commonValidations = {
  // Order validations
  orderCreate: [
    { field: 'total_amount', required: true, validator: isValidPrice, message: 'Le montant total doit être un nombre positif' },
    { field: 'total_tax', required: true, validator: isValidPrice, message: 'Le montant de la TVA doit être un nombre positif' },
    { field: 'payment_method', required: true, validator: (val: string) => ['cash', 'card', 'split'].includes(val), message: 'Méthode de paiement invalide' },
    { field: 'status', required: true, validator: (val: string) => ['pending', 'completed', 'cancelled'].includes(val), message: 'Statut invalide' },
    { field: 'notes', required: false, validator: (val: string) => isValidString(val, 0, 1000), message: 'Les notes ne doivent pas dépasser 1000 caractères' },
    { field: 'items', required: true, validator: (val: any[]) => Array.isArray(val) && val.length > 0, message: 'Au moins un article est requis' }
  ],

  // Category validations
  categoryCreate: [
    { field: 'name', required: true, validator: (val: string) => isValidString(val, 2, 100), message: 'Le nom doit contenir entre 2 et 100 caractères' },
    { field: 'description', required: false, validator: (val: string) => isValidString(val, 0, 500), message: 'La description ne doit pas dépasser 500 caractères' },
    { field: 'color', required: false, validator: (val: string) => /^#[0-9A-F]{6}$/i.test(val), message: 'Format de couleur invalide (ex: #FF0000)' }
  ],

  // Product validations
  productCreate: [
    { field: 'name', required: true, validator: (val: string) => isValidString(val, 2, 100), message: 'Le nom doit contenir entre 2 et 100 caractères' },
    { field: 'description', required: false, validator: (val: string) => isValidString(val, 0, 500), message: 'La description ne doit pas dépasser 500 caractères' },
    { field: 'price', required: true, validator: isValidPrice, message: 'Le prix doit être un nombre positif' },
    { field: 'taxRate', required: true, validator: (val: number) => typeof val === 'number' && val >= 0 && val <= 1, message: 'Le taux de TVA doit être entre 0 et 1' },
    { field: 'categoryId', required: true, validator: isValidId, message: 'ID de catégorie invalide' },
    { field: 'isHappyHourEligible', required: false, validator: (val: boolean) => typeof val === 'boolean', message: 'isHappyHourEligible doit être un booléen' }
  ],

  // User validations
  userCreate: [
    { field: 'email', required: true, validator: isValidEmail, message: 'Format d\'email invalide' },
    { field: 'password', required: true, validator: (val: string) => isValidString(val, 8, 128), message: 'Le mot de passe doit contenir entre 8 et 128 caractères' },
    { field: 'firstName', required: true, validator: (val: string) => isValidString(val, 2, 50), message: 'Le prénom doit contenir entre 2 et 50 caractères' },
    { field: 'lastName', required: true, validator: (val: string) => isValidString(val, 2, 50), message: 'Le nom doit contenir entre 2 et 50 caractères' }
  ]
};

// Common parameter validations
export const paramValidations = {
  id: { param: 'id', validator: isValidId, message: 'Format d\'ID invalide' }
}; 