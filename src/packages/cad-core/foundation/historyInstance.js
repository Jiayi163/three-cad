/**
 * Singleton History Instance
 * Single shared command history for the entire application
 */

import { CommandHistory } from './CommandHistory.js';

// Create singleton instance
export const history = new CommandHistory(200);

// Add debug logging to verify usage
const originalExecute = history.execute.bind(history);
const originalUndo = history.undo.bind(history);
const originalRedo = history.redo.bind(history);

history.execute = function(cmd) {
  console.log('[HISTORY] execute:', cmd.name, '| stack size before:', this.undoStack.length);
  originalExecute(cmd);
  console.log('[HISTORY] execute complete | stack size after:', this.undoStack.length);
};

history.undo = function() {
  console.log('[HISTORY] undo called | stack size before:', this.undoStack.length);
  const result = originalUndo();
  console.log('[HISTORY] undo complete | stack size after:', this.undoStack.length, '| result:', result);
  return result;
};

history.redo = function() {
  console.log('[HISTORY] redo called | stack size before:', this.redoStack.length);
  const result = originalRedo();
  console.log('[HISTORY] redo complete | stack size after:', this.redoStack.length, '| result:', result);
  return result;
};

