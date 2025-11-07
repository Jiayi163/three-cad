/**
 * CommandHistory - Lightweight undo/redo system with command pattern
 * Supports command coalescing for smooth interactions (e.g., drag transforms)
 */

import { Observable } from './Observable.js';

/**
 * Base Command interface
 * All commands must implement do() and undo()
 * Optional coalesce() for merging consecutive similar commands
 */
export class Command {
  /**
   * @param {string} name - Human-readable command name
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * Execute the command (forward action)
   */
  do() {
    throw new Error('do() method must be implemented');
  }

  /**
   * Undo the command (reverse action)
   */
  undo() {
    throw new Error('undo() method must be implemented');
  }

  /**
   * Optional: Attempt to merge this command with the next one
   * Used for coalescing drag/transform operations into single undo step
   * @param {Command} next - The next command to potentially merge
   * @returns {boolean} - true if commands were merged, false otherwise
   */
  coalesce(next) {
    return false;
  }
}

/**
 * CommandHistory - Manages undo/redo stacks with Observable notifications
 */
export class CommandHistory extends Observable {
  constructor(maxSize = 200) {
    super();
    this.undoStack = [];
    this.redoStack = [];
    this.maxSize = maxSize;
    this._updateCanExecute();
  }

  /**
   * Execute a command and add it to history
   * @param {Command} cmd - The command to execute
   */
  execute(cmd) {
    cmd.do();

    // Try to coalesce with the last command
    const last = this.undoStack[this.undoStack.length - 1];
    if (last && last.coalesce && last.coalesce(cmd)) {
      // Commands were merged, don't add to stack
      return;
    }

    // Add to undo stack
    this.undoStack.push(cmd);

    // Cap stack size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }

    // Clear redo stack (new action invalidates redo history)
    this.redoStack.length = 0;

    this._updateCanExecute();
  }

  /**
   * Undo the last command
   * @returns {boolean} - true if undo was performed, false if stack was empty
   */
  undo() {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;

    cmd.undo();
    this.redoStack.push(cmd);
    this._updateCanExecute();
    return true;
  }

  /**
   * Redo the last undone command
   * @returns {boolean} - true if redo was performed, false if stack was empty
   */
  redo() {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;

    cmd.do();
    this.undoStack.push(cmd);
    this._updateCanExecute();
    return true;
  }

  /**
   * Check if undo is available
   * @returns {boolean}
   */
  get canUndo() {
    return this.getProperty('canUndo') ?? false;
  }

  /**
   * Check if redo is available
   * @returns {boolean}
   */
  get canRedo() {
    return this.getProperty('canRedo') ?? false;
  }

  /**
   * Update canUndo and canRedo properties and notify observers
   * @private
   */
  _updateCanExecute() {
    this.setProperty('canUndo', this.undoStack.length > 0);
    this.setProperty('canRedo', this.redoStack.length > 0);
  }

  /**
   * Clear all history
   */
  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this._updateCanExecute();
  }

  /**
   * Get the name of the next undo command
   * @returns {string|null}
   */
  getUndoName() {
    const cmd = this.undoStack[this.undoStack.length - 1];
    return cmd ? cmd.name : null;
  }

  /**
   * Get the name of the next redo command
   * @returns {string|null}
   */
  getRedoName() {
    const cmd = this.redoStack[this.redoStack.length - 1];
    return cmd ? cmd.name : null;
  }
}

