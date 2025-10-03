<template>
  <div class="test-component">
    <h2>Test Component</h2>
    <p>This is a simple test component to verify that dynamic imports are working correctly.</p>
    <button @click="goBack">Back to Main</button>
  </div>
</template>

<script>
import { useRouter } from 'vue-router'

export default {
  name: 'TestComponent',
  setup() {
    const router = useRouter()

    const goBack = () => {
      router.push('/')
    }

    return {
      goBack
    }
  }
}
</script>

<style scoped>
.test-component {
  padding: 20px;
  text-align: center;
}

.test-component h2 {
  color: var(--cad-text-primary);
  margin-bottom: 16px;
}

.test-component p {
  color: var(--cad-text-secondary);
  margin-bottom: 20px;
}

.test-component button {
  padding: 10px 20px;
  background: var(--cad-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.test-component button:hover {
  background: var(--cad-accent-dark);
}
</style>
