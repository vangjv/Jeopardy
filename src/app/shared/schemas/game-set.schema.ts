/**
 * JSON Schema for GameSet validation using ajv
 */

import { JSONSchemaType } from 'ajv';
import { GameSet, Round, Category, Clue, ClueMedia, FinalRound, FinalCategory } from '../models/game-content.model';

/**
 * JSON Schema for ClueMedia
 */
const clueMediaSchema: JSONSchemaType<ClueMedia> = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['image', 'audio', 'video'] },
    url: { type: 'string', minLength: 1 },
    altText: { type: 'string', nullable: true },
  },
  required: ['type', 'url'],
  additionalProperties: false,
};

/**
 * JSON Schema for Clue
 */
const clueSchema: JSONSchemaType<Clue> = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    clueText: { type: 'string', minLength: 1, maxLength: 500 },
    correctResponse: { type: 'string', minLength: 1, maxLength: 200 },
    value: { type: 'number', minimum: 1 },
    dailyDouble: { type: 'boolean' },
    media: { ...clueMediaSchema, nullable: true },
  },
  required: ['id', 'clueText', 'correctResponse', 'value', 'dailyDouble'],
  additionalProperties: false,
};

/**
 * JSON Schema for Category
 */
const categorySchema: JSONSchemaType<Category> = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1, maxLength: 50 },
    clues: {
      type: 'array',
      items: clueSchema,
      minItems: 5,
      maxItems: 5,
    },
  },
  required: ['id', 'title', 'clues'],
  additionalProperties: false,
};

/**
 * JSON Schema for Round
 */
const roundSchema: JSONSchemaType<Round> = {
  type: 'object',
  properties: {
    categories: {
      type: 'array',
      items: categorySchema,
      minItems: 6,
      maxItems: 6,
    },
  },
  required: ['categories'],
  additionalProperties: false,
};

/**
 * JSON Schema for FinalCategory
 */
const finalCategorySchema: JSONSchemaType<FinalCategory> = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1, maxLength: 50 },
    clue: clueSchema,
  },
  required: ['id', 'title', 'clue'],
  additionalProperties: false,
};

/**
 * JSON Schema for FinalRound
 */
const finalRoundSchema: JSONSchemaType<FinalRound> = {
  type: 'object',
  properties: {
    category: finalCategorySchema,
  },
  required: ['category'],
  additionalProperties: false,
};

/**
 * JSON Schema for GameSet (root schema)
 * Note: createdAt is handled as string in JSON, converted to Date after validation
 */
export const gameSetSchema: JSONSchemaType<Omit<GameSet, 'createdAt'> & { createdAt: string }> = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1, maxLength: 100 },
    author: { type: 'string', maxLength: 100, nullable: true },
    createdAt: { type: 'string' }, // ISO date string
    round1: roundSchema,
    round2: roundSchema,
    final: finalRoundSchema,
  },
  required: ['id', 'title', 'createdAt', 'round1', 'round2', 'final'],
  additionalProperties: false,
};

/**
 * Schema ID for referencing
 */
export const GAME_SET_SCHEMA_ID = 'https://jeopardy-app.local/schemas/game-set.json';
