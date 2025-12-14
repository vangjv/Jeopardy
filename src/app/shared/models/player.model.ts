/**
 * Player model representing a game contestant
 */
export interface Player {
  id: string;                  // UUID
  name: string;                // Display name
  score: number;               // Current score (can be negative)
  buzzerKey: string;           // KeyboardEvent.code (e.g., 'KeyA', 'Space')
  color: string;               // Hex color for UI differentiation
  
  // Final Jeopardy state (when applicable)
  finalWager?: number;         // Final Jeopardy wager
  finalResponse?: string;      // Final Jeopardy response text
  finalCorrect?: boolean;      // Whether final response was correct
}

/**
 * Default player colors for visual differentiation
 */
export const DEFAULT_PLAYER_COLORS = ['#3b82f6', '#ef4444', '#10b981'];
