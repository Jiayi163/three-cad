import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'workspace',
      component: () => import('../views/WorkspaceView.vue'),
      meta: {
        title: 'CAD Workspace'
      }
    },
    // Note: Material demo routes removed - use material system in main workspace
    // Demo components are available in src/components/MaterialDemo*.vue for testing

    // Catch-all route - redirect any unknown paths to workspace
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// Global navigation guard for setting page titles
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - Vue CAD` : 'Vue CAD Application'
  next()
})

export default router
