import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useApplicationStore = defineStore('application', () => {
  // 基本应用状态 - 为 Phase 2 做准备
  const isInitialized = ref(false)
  
  // Actions
  function initialize() {
    isInitialized.value = true
    console.log('CAD Application initialized')
  }
  
  return {
    // State
    isInitialized,
    
    // Actions
    initialize
  }
}) 