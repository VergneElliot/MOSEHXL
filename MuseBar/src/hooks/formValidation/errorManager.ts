/**
 * Form Error Management
 * Handles error state management and field-specific error operations
 */

import { FieldError } from './types';

export class FormErrorManager<T> {
  private errors: FieldError[] = [];

  /**
   * Set errors for the form
   */
  setErrors(errors: FieldError[]): void {
    this.errors = [...errors];
  }

  /**
   * Add a single error
   */
  addError(error: FieldError): void {
    // Remove existing errors for the same field and type
    this.errors = this.errors.filter(
      e => !(e.field === error.field && e.type === error.type)
    );
    this.errors.push(error);
  }

  /**
   * Add multiple errors
   */
  addErrors(errors: FieldError[]): void {
    errors.forEach(error => this.addError(error));
  }

  /**
   * Clear errors for a specific field or all errors
   */
  clearErrors(field?: keyof T): void {
    if (field) {
      this.errors = this.errors.filter(error => error.field !== field);
    } else {
      this.errors = [];
    }
  }

  /**
   * Set a custom error for a field
   */
  setCustomError(field: keyof T, message: string): void {
    this.clearErrors(field);
    this.addError({
      field: field as string,
      message,
      type: 'custom',
    });
  }

  /**
   * Get all errors
   */
  getErrors(): FieldError[] {
    return [...this.errors];
  }

  /**
   * Get errors for a specific field
   */
  getFieldErrors(field: keyof T): FieldError[] {
    return this.errors.filter(error => error.field === field);
  }

  /**
   * Check if a specific field is valid
   */
  isFieldValid(field: keyof T): boolean {
    return !this.errors.some(error => error.field === field);
  }

  /**
   * Check if the entire form is valid
   */
  isValid(): boolean {
    return this.errors.length === 0;
  }

  /**
   * Check if there are any errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.errors.length;
  }

  /**
   * Get errors grouped by field
   */
  getErrorsByField(): Record<string, FieldError[]> {
    const grouped: Record<string, FieldError[]> = {};
    this.errors.forEach(error => {
      if (!grouped[error.field]) {
        grouped[error.field] = [];
      }
      grouped[error.field].push(error);
    });
    return grouped;
  }
}
