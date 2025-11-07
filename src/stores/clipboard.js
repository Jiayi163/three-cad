/**
 * Clipboard Store - Internal clipboard for copy/paste operations
 * Stores serialized node data (JSON) without Three.js objects or functions
 */

import { defineStore } from 'pinia';

export const useClipboardStore = defineStore('clipboard', {
  state: () => ({
    items: [], // Array of clipboard DTOs (pure JSON)
    timestamp: null, // When the clipboard was last updated
  }),

  getters: {
    /**
     * Check if clipboard has items
     */
    hasItems() {
      return Array.isArray(this.items) && this.items.length > 0;
    },

    /**
     * Get number of items in clipboard
     */
    count() {
      return this.items.length;
    },

    /**
     * Get clipboard info for UI display
     */
    info() {
      return {
        hasItems: this.hasItems,
        count: this.count,
        timestamp: this.timestamp,
        types: this.hasItems ? [...new Set(this.items.map(item => item.type))] : []
      };
    }
  },

  actions: {
    /**
     * Set clipboard contents
     * @param {Array} items - Array of clipboard DTOs
     */
    set(items) {
      this.items = items || [];
      this.timestamp = Date.now();
      console.log(`Clipboard set: ${this.items.length} items`);
    },

    /**
     * Clear clipboard
     */
    clear() {
      this.items = [];
      this.timestamp = null;
      console.log('Clipboard cleared');
    },

    /**
     * Get clipboard contents
     */
    get() {
      return this.items;
    }
  }
});

