/**
 * Game content models for Jeopardy game structure
 */

/**
 * Root structure for a complete game's content
 */
export interface GameSet {
  id: string;                  // UUID or filename-based ID
  title: string;               // Game set name
  author?: string;             // Optional creator attribution
  createdAt: Date;             // When game set was created
  round1: Round;               // Jeopardy round
  round2: Round;               // Double Jeopardy round
  final: FinalRound;           // Final Jeopardy
}

/**
 * Represents a standard round (Jeopardy or Double Jeopardy)
 */
export interface Round {
  categories: Category[];      // Must have exactly 6 categories
}

/**
 * Represents a trivia category
 */
export interface Category {
  id: string;                  // UUID
  title: string;               // Category name (e.g., "U.S. PRESIDENTS")
  clues: Clue[];               // Must have exactly 5 clues
}

/**
 * Represents a single question/answer pair
 */
export interface Clue {
  id: string;                  // UUID
  clueText: string;            // The question text
  correctResponse: string;     // The correct answer
  value: number;               // Point value
  dailyDouble: boolean;        // Whether this is a Daily Double
  media?: ClueMedia;           // Optional media attachment
}

/**
 * Optional media attachment for a clue
 */
export interface ClueMedia {
  type: 'image' | 'audio' | 'video';
  url: string;                 // URL or data URI
  altText?: string;            // For images (accessibility)
}

/**
 * Final Jeopardy structure
 */
export interface FinalRound {
  category: FinalCategory;
}

/**
 * Final Jeopardy category with single clue
 */
export interface FinalCategory {
  id: string;                  // UUID
  title: string;               // Category name
  clue: Clue;                  // Single clue (value ignored)
}

/**
 * Round type enum
 */
export type RoundType = 'round1' | 'round2' | 'final';
