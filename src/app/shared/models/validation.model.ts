/**
 * Validation result models
 */

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

/**
 * Individual validation error or warning
 */
export interface ValidationError {
  path: string;                // JSON path to the error (e.g., '/round1/categories/0/clues/2')
  message: string;             // Human-readable error message
  code: string;                // Error code for programmatic handling
  severity: 'error' | 'warning';
}

/**
 * Helper function to create a successful validation result
 */
export function createSuccessValidation(): ValidationResult {
  return { valid: true, errors: [] };
}

/**
 * Helper function to create a failed validation result
 */
export function createFailureValidation(errors: ValidationError[]): ValidationResult {
  return { valid: false, errors };
}
