/**
 * CanDeactivateGuard - Warns user before leaving active game
 */

import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/**
 * Interface for components that can be guarded
 */
export interface CanComponentDeactivate {
  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
}

/**
 * Guard to prevent accidental navigation away from active game
 */
export const canDeactivateGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component: CanComponentDeactivate
) => {
  return component.canDeactivate ? component.canDeactivate() : true;
};

/**
 * Helper function for components to implement unsaved changes warning
 */
export function confirmDeactivation(hasUnsavedChanges: boolean, message?: string): boolean {
  if (!hasUnsavedChanges) {
    return true;
  }
  
  const defaultMessage = 'You have an active game. Are you sure you want to leave? Your progress will be lost.';
  return confirm(message || defaultMessage);
}
