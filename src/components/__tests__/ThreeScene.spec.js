import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ThreeScene from '../ThreeScene.vue'

// Mock Three.js to avoid WebGL context issues in tests
vi.mock('three', () => ({
  Scene: vi.fn(() => ({
    background: null,
    add: vi.fn(),
    traverse: vi.fn()
  })),
  PerspectiveCamera: vi.fn(() => ({
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    aspect: 1,
    updateProjectionMatrix: vi.fn(),
    lookAt: vi.fn()
  })),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement('canvas'),
    shadowMap: { enabled: false, type: null }
  })),
  BoxGeometry: vi.fn(),
  PlaneGeometry: vi.fn(),
  MeshLambertMaterial: vi.fn(() => ({
    dispose: vi.fn()
  })),
  Mesh: vi.fn(() => ({
    position: { y: 0 },
    rotation: { x: 0, y: 0 },
    castShadow: false,
    receiveShadow: false,
    geometry: { dispose: vi.fn() },
    material: { dispose: vi.fn() }
  })),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn(() => ({
    position: { set: vi.fn() },
    castShadow: false,
    shadow: {
      mapSize: { width: 0, height: 0 }
    }
  })),
  Color: vi.fn(),
  PCFSoftShadowMap: 'PCFSoftShadowMap'
}))

// Mock OrbitControls
vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(() => ({
    enableDamping: false,
    dampingFactor: 0,
    screenSpacePanning: false,
    minDistance: 0,
    maxDistance: 0,
    maxPolarAngle: 0,
    update: vi.fn(),
    dispose: vi.fn()
  }))
}))

describe('ThreeScene', () => {
  let wrapper

  beforeEach(() => {
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(cb, 16)
      return 1
    })
    global.cancelAnimationFrame = vi.fn()
    
    // Mock window methods
    global.addEventListener = vi.fn()
    global.removeEventListener = vi.fn()
  })

  it('should mount without errors', () => {
    wrapper = mount(ThreeScene)
    expect(wrapper.exists()).toBe(true)
  })

  it('should have the correct container class', () => {
    wrapper = mount(ThreeScene)
    expect(wrapper.find('.three-container').exists()).toBe(true)
  })

  it('should not show error message initially', () => {
    wrapper = mount(ThreeScene)
    expect(wrapper.find('.error-message').exists()).toBe(false)
  })

  it('should create container ref', () => {
    wrapper = mount(ThreeScene)
    expect(wrapper.vm.containerRef).toBeDefined()
  })

  it('should handle WebGL support check', () => {
    // Mock canvas and WebGL context
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue({})
    }
    global.document.createElement = vi.fn().mockReturnValue(mockCanvas)
    
    wrapper = mount(ThreeScene)
    expect(wrapper.vm.error).toBe(null)
  })
}) 