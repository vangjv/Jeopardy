/**
 * ValidationService - Validates game content and player input using ajv
 */

import { Injectable } from '@angular/core';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { gameSetSchema, GAME_SET_SCHEMA_ID } from '../schemas/game-set.schema';
import { GameSet } from '../models/game-content.model';
import { Player } from '../models/player.model';
import { 
  ValidationResult, 
  ValidationError, 
  createSuccessValidation, 
  createFailureValidation 
} from '../models/validation.model';
import { 
  isValidKeyboardCode, 
  isValidHexColor, 
  isPositiveInteger 
} from '../utils/type-guards';
import { 
  isValidDailyDoubleWager, 
  isValidFinalWager 
} from '../utils/wager-calculator';
import { GameState } from '../models/game-state.model';
import { hasUniqueBuzzerKeys, isValidPlayerCount } from '../utils/game-helpers';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  private ajv: Ajv;
  private validateGameSet: ValidateFunction | null = null;

  constructor() {
    // Initialize ajv with strict mode
    this.ajv = new Ajv({ 
      allErrors: true,
      strict: true,
      removeAdditional: false,
    });
    
    // Add format validators
    addFormats(this.ajv);
    
    // Compile game set schema
    try {
      this.validateGameSet = this.ajv.compile(gameSetSchema) as ValidateFunction;
    } catch (error) {
      console.error('Failed to compile game set schema:', error);
    }
  }

  /**
   * Validate game content JSON structure
   */
  validateGameSetJson(data: unknown): ValidationResult {
    if (!this.validateGameSet) {
      return createFailureValidation([{
        path: '/',
        message: 'Schema validation not available',
        code: 'SCHEMA_ERROR',
        severity: 'error'
      }]);
    }

    const valid = this.validateGameSet(data);
    
    if (!valid && this.validateGameSet.errors) {
      const errors: ValidationError[] = this.validateGameSet.errors.map(err => ({
        path: err.instancePath || '/',
        message: err.message || 'Validation error',
        code: err.keyword?.toUpperCase() || 'VALIDATION_ERROR',
        severity: 'error'
      }));
      return createFailureValidation(errors);
    }

    // Additional semantic validation
    const semanticErrors = this.validateGameSetSemantics(data as GameSet);
    if (semanticErrors.length > 0) {
      return createFailureValidation(semanticErrors);
    }

    return createSuccessValidation();
  }

  /**
   * Validate game set semantic rules beyond JSON schema
   */
  private validateGameSetSemantics(gameSet: GameSet): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate Round 1 Daily Double count (exactly 1)
    const round1DDCount = this.countDailyDoubles(gameSet.round1);
    if (round1DDCount !== 1) {
      errors.push({
        path: '/round1',
        message: `Round 1 must have exactly 1 Daily Double, found ${round1DDCount}`,
        code: 'DAILY_DOUBLE_COUNT',
        severity: 'error'
      });
    }

    // Validate Round 2 Daily Double count (exactly 2)
    const round2DDCount = this.countDailyDoubles(gameSet.round2);
    if (round2DDCount !== 2) {
      errors.push({
        path: '/round2',
        message: `Round 2 must have exactly 2 Daily Doubles, found ${round2DDCount}`,
        code: 'DAILY_DOUBLE_COUNT',
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Count Daily Doubles in a round
   */
  private countDailyDoubles(round: { categories: Array<{ clues: Array<{ dailyDouble: boolean }> }> }): number {
    let count = 0;
    for (const category of round.categories) {
      for (const clue of category.clues) {
        if (clue.dailyDouble) count++;
      }
    }
    return count;
  }

  /**
   * Validate player configuration
   */
  validatePlayers(players: Player[]): ValidationResult {
    const errors: ValidationError[] = [];

    // Check player count
    if (!isValidPlayerCount(players.length)) {
      errors.push({
        path: '/players',
        message: `Must have 2-3 players, found ${players.length}`,
        code: 'PLAYER_COUNT',
        severity: 'error'
      });
    }

    // Check unique buzzer keys
    if (!hasUniqueBuzzerKeys(players)) {
      errors.push({
        path: '/players',
        message: 'All players must have unique buzzer keys',
        code: 'DUPLICATE_BUZZER_KEY',
        severity: 'error'
      });
    }

    // Validate each player
    players.forEach((player, index) => {
      // Validate name
      if (!player.name || player.name.length === 0 || player.name.length > 50) {
        errors.push({
          path: `/players/${index}/name`,
          message: 'Player name must be 1-50 characters',
          code: 'INVALID_NAME',
          severity: 'error'
        });
      }

      // Validate buzzer key
      if (!isValidKeyboardCode(player.buzzerKey)) {
        errors.push({
          path: `/players/${index}/buzzerKey`,
          message: `Invalid keyboard code: ${player.buzzerKey}`,
          code: 'INVALID_BUZZER_KEY',
          severity: 'error'
        });
      }

      // Validate color
      if (!isValidHexColor(player.color)) {
        errors.push({
          path: `/players/${index}/color`,
          message: `Invalid hex color: ${player.color}`,
          code: 'INVALID_COLOR',
          severity: 'error'
        });
      }
    });

    return errors.length > 0 ? createFailureValidation(errors) : createSuccessValidation();
  }

  /**
   * Validate buzzer key is not already in use
   */
  validateBuzzerKey(buzzerKey: string, existingPlayers: Player[], excludePlayerId?: string): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if valid keyboard code
    if (!isValidKeyboardCode(buzzerKey)) {
      errors.push({
        path: '/buzzerKey',
        message: `Invalid keyboard code: ${buzzerKey}`,
        code: 'INVALID_BUZZER_KEY',
        severity: 'error'
      });
    }

    // Check for conflicts
    const conflict = existingPlayers.find(p => 
      p.buzzerKey === buzzerKey && p.id !== excludePlayerId
    );
    
    if (conflict) {
      errors.push({
        path: '/buzzerKey',
        message: `Buzzer key "${buzzerKey}" is already assigned to ${conflict.name}`,
        code: 'DUPLICATE_BUZZER_KEY',
        severity: 'error'
      });
    }

    return errors.length > 0 ? createFailureValidation(errors) : createSuccessValidation();
  }

  /**
   * Validate Daily Double wager
   */
  validateDailyDoubleWager(playerId: string, wager: number, gameState: GameState): ValidationResult {
    const errors: ValidationError[] = [];

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      errors.push({
        path: '/wager',
        message: 'Player not found',
        code: 'PLAYER_NOT_FOUND',
        severity: 'error'
      });
      return createFailureValidation(errors);
    }

    if (!isPositiveInteger(wager)) {
      errors.push({
        path: '/wager',
        message: 'Wager must be a positive integer',
        code: 'INVALID_WAGER',
        severity: 'error'
      });
    }

    if (!isValidDailyDoubleWager(wager, player, gameState)) {
      errors.push({
        path: '/wager',
        message: 'Wager is outside allowed range',
        code: 'WAGER_OUT_OF_RANGE',
        severity: 'error'
      });
    }

    return errors.length > 0 ? createFailureValidation(errors) : createSuccessValidation();
  }

  /**
   * Validate Final Jeopardy wager
   */
  validateFinalWager(playerId: string, wager: number, gameState: GameState): ValidationResult {
    const errors: ValidationError[] = [];

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      errors.push({
        path: '/wager',
        message: 'Player not found',
        code: 'PLAYER_NOT_FOUND',
        severity: 'error'
      });
      return createFailureValidation(errors);
    }

    if (wager < 0 || !Number.isInteger(wager)) {
      errors.push({
        path: '/wager',
        message: 'Wager must be a non-negative integer',
        code: 'INVALID_WAGER',
        severity: 'error'
      });
    }

    if (!isValidFinalWager(wager, player)) {
      errors.push({
        path: '/wager',
        message: `Wager cannot exceed player score of ${player.score}`,
        code: 'WAGER_OUT_OF_RANGE',
        severity: 'error'
      });
    }

    return errors.length > 0 ? createFailureValidation(errors) : createSuccessValidation();
  }

  /**
   * Validate media URL format
   */
  validateMediaUrl(url: string, type: 'image' | 'audio' | 'video'): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      // Check if it's a data URI or valid URL
      if (url.startsWith('data:')) {
        // Validate data URI format
        if (!url.match(/^data:[^;]+;base64,/)) {
          errors.push({
            path: '/media/url',
            message: 'Invalid data URI format',
            code: 'INVALID_DATA_URI',
            severity: 'error'
          });
        }
      } else {
        // Validate URL format
        new URL(url);
      }
    } catch {
      errors.push({
        path: '/media/url',
        message: 'Invalid URL format',
        code: 'INVALID_URL',
        severity: 'error'
      });
    }

    return errors.length > 0 ? createFailureValidation(errors) : createSuccessValidation();
  }
}
