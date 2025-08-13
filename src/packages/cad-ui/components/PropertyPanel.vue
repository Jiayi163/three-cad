<template>
  <div class="property-panel">
    <div v-if="!selectedNode" class="no-selection">
      <div class="placeholder-content">
        <span class="placeholder-icon">📋</span>
        <h3>No Selection</h3>
        <p>Select an object to view its properties</p>
      </div>
    </div>

    <div v-else class="property-content">
      <!-- 对象基本信息 -->
      <div class="property-section">
        <div class="section-header">
          <span class="section-title">Object Info</span>
        </div>
        <div class="property-grid">
          <div class="property-row">
            <label class="property-label">Name:</label>
            <input 
              v-model="editableName" 
              class="property-input"
              @blur="updateNodeProperty('name', editableName)"
              @keyup.enter="updateNodeProperty('name', editableName)"
            />
          </div>
          <div class="property-row">
            <label class="property-label">Type:</label>
            <span class="property-value readonly">{{ selectedNode.type }}</span>
          </div>
          <div class="property-row">
            <label class="property-label">ID:</label>
            <span class="property-value readonly">{{ selectedNode.id }}</span>
          </div>
          <div class="property-row">
            <label class="property-label">Created:</label>
            <span class="property-value readonly">{{ formatDate(selectedNode.created) }}</span>
          </div>
        </div>
      </div>

      <!-- 变换属性 -->
      <div class="property-section">
        <div class="section-header">
          <span class="section-title">Transform</span>
          <button class="section-action" @click="resetTransform" title="Reset Transform">↺</button>
        </div>
        <div class="property-grid">
          <!-- 位置 -->
          <div class="property-group">
            <label class="group-label">Position</label>
            <div class="vector-input">
              <div class="vector-component">
                <label>X:</label>
                <input 
                  type="number" 
                  :value="getTransformValue('position', 'x')"
                  @input="updateTransform('position', 'x', $event.target.value)"
                  step="0.1"
                  class="number-input"
                />
              </div>
              <div class="vector-component">
                <label>Y:</label>
                <input 
                  type="number" 
                  :value="getTransformValue('position', 'y')"
                  @input="updateTransform('position', 'y', $event.target.value)"
                  step="0.1"
                  class="number-input"
                />
              </div>
              <div class="vector-component">
                <label>Z:</label>
                <input 
                  type="number" 
                  :value="getTransformValue('position', 'z')"
                  @input="updateTransform('position', 'z', $event.target.value)"
                  step="0.1"
                  class="number-input"
                />
              </div>
            </div>
          </div>

          <!-- 旋转 -->
          <div class="property-group">
            <label class="group-label">Rotation (degrees)</label>
            <div class="vector-input">
              <div class="vector-component">
                <label>X:</label>
                <input 
                  type="number" 
                  :value="getRotationDegrees('x')"
                  @input="updateRotation('x', $event.target.value)"
                  step="1"
                  class="number-input"
                />
              </div>
              <div class="vector-component">
                <label>Y:</label>
                <input 
                  type="number" 
                  :value="getRotationDegrees('y')"
                  @input="updateRotation('y', $event.target.value)"
                  step="1"
                  class="number-input"
                />
              </div>
              <div class="vector-component">
                <label>Z:</label>
                <input 
                  type="number" 
                  :value="getRotationDegrees('z')"
                  @input="updateRotation('z', $event.target.value)"
                  step="1"
                  class="number-input"
                />
              </div>
            </div>
          </div>

          <!-- 缩放 -->
          <div class="property-group">
            <label class="group-label">Scale</label>
            <div class="scale-input">
              <div class="uniform-scale">
                <input 
                  type="checkbox" 
                  v-model="uniformScale" 
                  id="uniform-scale"
                  class="checkbox-input"
                />
                <label for="uniform-scale">Uniform</label>
              </div>
              <div class="vector-input">
                <div class="vector-component">
                  <label>X:</label>
                  <input 
                    type="number" 
                    :value="getTransformValue('scale', 'x')"
                    @input="updateScale('x', $event.target.value)"
                    step="0.1"
                    min="0.001"
                    class="number-input"
                  />
                </div>
                <div class="vector-component">
                  <label>Y:</label>
                  <input 
                    type="number" 
                    :value="getTransformValue('scale', 'y')"
                    @input="updateScale('y', $event.target.value)"
                    step="0.1"
                    min="0.001"
                    class="number-input"
                    :disabled="uniformScale"
                  />
                </div>
                <div class="vector-component">
                  <label>Z:</label>
                  <input 
                    type="number" 
                    :value="getTransformValue('scale', 'z')"
                    @input="updateScale('z', $event.target.value)"
                    step="0.1"
                    min="0.001"
                    class="number-input"
                    :disabled="uniformScale"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 几何属性 -->
      <div v-if="geometryProperties" class="property-section">
        <div class="section-header">
          <span class="section-title">Geometry</span>
        </div>
        <div class="property-grid">
          <div 
            v-for="(value, key) in geometryProperties" 
            :key="key" 
            class="property-row"
          >
            <label class="property-label">{{ formatPropertyName(key) }}:</label>
            <input 
              v-if="typeof value === 'number'"
              type="number" 
              :value="value"
              @input="updateGeometryProperty(key, $event.target.value)"
              step="0.1"
              min="0.001"
              class="number-input"
            />
            <input 
              v-else-if="typeof value === 'string'"
              type="text" 
              :value="value"
              @input="updateGeometryProperty(key, $event.target.value)"
              class="property-input"
            />
            <input 
              v-else-if="typeof value === 'boolean'"
              type="checkbox" 
              :checked="value"
              @change="updateGeometryProperty(key, $event.target.checked)"
              class="checkbox-input"
            />
            <span v-else class="property-value readonly">{{ value }}</span>
          </div>
        </div>
      </div>

      <!-- 材质属性 -->
      <div class="property-section">
        <div class="section-header">
          <span class="section-title">Material</span>
          <button class="section-action" @click="resetMaterial" title="Reset Material">↺</button>
        </div>
        <div class="property-grid">
          <div class="property-row">
            <label class="property-label">Color:</label>
            <div class="color-input">
              <input 
                type="color" 
                :value="materialColor"
                @input="updateMaterialProperty('color', $event.target.value)"
                class="color-picker"
              />
              <input 
                type="text" 
                :value="materialColor"
                @input="updateMaterialProperty('color', $event.target.value)"
                class="color-text"
              />
            </div>
          </div>
          <div class="property-row">
            <label class="property-label">Opacity:</label>
            <div class="range-input">
              <input 
                type="range" 
                :value="materialOpacity * 100"
                @input="updateMaterialProperty('opacity', $event.target.value / 100)"
                min="0"
                max="100"
                class="range-slider"
              />
              <span class="range-value">{{ Math.round(materialOpacity * 100) }}%</span>
            </div>
          </div>
          <div class="property-row">
            <label class="property-label">Wireframe:</label>
            <input 
              type="checkbox" 
              :checked="materialWireframe"
              @change="updateMaterialProperty('wireframe', $event.target.checked)"
              class="checkbox-input"
            />
          </div>
        </div>
      </div>

      <!-- 可见性和锁定 -->
      <div class="property-section">
        <div class="section-header">
          <span class="section-title">Visibility & Lock</span>
        </div>
        <div class="property-grid">
          <div class="property-row">
            <label class="property-label">Visible:</label>
            <input 
              type="checkbox" 
              :checked="nodeVisible"
              @change="updateNodeProperty('visible', $event.target.checked)"
              class="checkbox-input"
            />
          </div>
          <div class="property-row">
            <label class="property-label">Locked:</label>
            <input 
              type="checkbox" 
              :checked="nodeLocked"
              @change="updateNodeProperty('locked', $event.target.checked)"
              class="checkbox-input"
            />
          </div>
        </div>
      </div>

      <!-- 自定义属性 -->
      <div v-if="customProperties.length > 0" class="property-section">
        <div class="section-header">
          <span class="section-title">Custom Properties</span>
          <button class="section-action" @click="addCustomProperty" title="Add Property">+</button>
        </div>
        <div class="property-grid">
          <div 
            v-for="(prop, index) in customProperties" 
            :key="index"
            class="property-row custom-property"
          >
            <input 
              v-model="prop.name"
              @blur="updateCustomProperty(index)"
              placeholder="Property name"
              class="property-input small"
            />
            <input 
              v-model="prop.value"
              @blur="updateCustomProperty(index)"
              placeholder="Value"
              class="property-input small"
            />
            <button 
              @click="removeCustomProperty(index)"
              class="remove-button"
              title="Remove Property"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useApplicationStore } from '@/stores/application'

export default {
  name: 'PropertyPanel',
  setup() {
    const appStore = useApplicationStore()
    
    // 状态
    const editableName = ref('')
    const uniformScale = ref(true)
    const customProperties = ref([])

    // 计算属性
    const selectedNode = computed(() => {
      return appStore.activeDocument?.selectedNodes?.[0] || null
    })

    const geometryProperties = computed(() => {
      if (!selectedNode.value) return null
      
      // 从节点获取几何属性
      const props = selectedNode.value.getProperty('geometry') || {}
      return Object.keys(props).length > 0 ? props : null
    })

    const materialColor = computed(() => {
      const material = selectedNode.value?.getProperty('material') || {}
      return material.color || '#ffffff'
    })

    const materialOpacity = computed(() => {
      const material = selectedNode.value?.getProperty('material') || {}
      return material.opacity ?? 1.0
    })

    const materialWireframe = computed(() => {
      const material = selectedNode.value?.getProperty('material') || {}
      return material.wireframe || false
    })

    const nodeVisible = computed(() => {
      return selectedNode.value?.getProperty('visible') ?? true
    })

    const nodeLocked = computed(() => {
      return selectedNode.value?.getProperty('locked') ?? false
    })

    // 监听选中节点变化
    watch(selectedNode, (newNode) => {
      if (newNode) {
        editableName.value = newNode.name || ''
        loadCustomProperties()
      } else {
        editableName.value = ''
        customProperties.value = []
      }
    }, { immediate: true })

    // 方法
    const updateNodeProperty = (property, value) => {
      if (!selectedNode.value) return
      
      try {
        selectedNode.value.setProperty(property, value)
        console.log(`Updated ${property} to:`, value)
      } catch (error) {
        console.error(`Failed to update property ${property}:`, error)
      }
    }

    const getTransformValue = (type, axis) => {
      if (!selectedNode.value) return 0
      
      const transform = selectedNode.value.getProperty('transform') || {}
      const values = transform[type] || { x: type === 'scale' ? 1 : 0, y: type === 'scale' ? 1 : 0, z: type === 'scale' ? 1 : 0 }
      return values[axis] || (type === 'scale' ? 1 : 0)
    }

    const updateTransform = (type, axis, value) => {
      if (!selectedNode.value) return
      
      const numValue = parseFloat(value) || (type === 'scale' ? 1 : 0)
      const transform = selectedNode.value.getProperty('transform') || {}
      
      if (!transform[type]) {
        transform[type] = { x: type === 'scale' ? 1 : 0, y: type === 'scale' ? 1 : 0, z: type === 'scale' ? 1 : 0 }
      }
      
      transform[type][axis] = numValue
      updateNodeProperty('transform', transform)
    }

    const getRotationDegrees = (axis) => {
      const radians = getTransformValue('rotation', axis)
      return Math.round((radians * 180) / Math.PI)
    }

    const updateRotation = (axis, degrees) => {
      const radians = (parseFloat(degrees) || 0) * (Math.PI / 180)
      updateTransform('rotation', axis, radians)
    }

    const updateScale = (axis, value) => {
      const numValue = Math.max(0.001, parseFloat(value) || 1)
      
      if (uniformScale.value) {
        updateTransform('scale', 'x', numValue)
        updateTransform('scale', 'y', numValue)
        updateTransform('scale', 'z', numValue)
      } else {
        updateTransform('scale', axis, numValue)
      }
    }

    const resetTransform = () => {
      const defaultTransform = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      }
      updateNodeProperty('transform', defaultTransform)
    }

    const updateGeometryProperty = (property, value) => {
      if (!selectedNode.value) return
      
      const geometry = selectedNode.value.getProperty('geometry') || {}
      
      // 转换值类型
      if (typeof geometry[property] === 'number') {
        value = parseFloat(value) || 0
      } else if (typeof geometry[property] === 'boolean') {
        value = Boolean(value)
      }
      
      geometry[property] = value
      updateNodeProperty('geometry', geometry)
    }

    const updateMaterialProperty = (property, value) => {
      if (!selectedNode.value) return
      
      const material = selectedNode.value.getProperty('material') || {}
      material[property] = value
      updateNodeProperty('material', material)
    }

    const resetMaterial = () => {
      const defaultMaterial = {
        color: '#ffffff',
        opacity: 1.0,
        wireframe: false
      }
      updateNodeProperty('material', defaultMaterial)
    }

    const loadCustomProperties = () => {
      if (!selectedNode.value) return
      
      const custom = selectedNode.value.getProperty('custom') || {}
      customProperties.value = Object.entries(custom).map(([name, value]) => ({
        name,
        value: String(value)
      }))
    }

    const addCustomProperty = () => {
      customProperties.value.push({ name: '', value: '' })
    }

    const removeCustomProperty = (index) => {
      customProperties.value.splice(index, 1)
      updateCustomProperties()
    }

    const updateCustomProperty = (index) => {
      updateCustomProperties()
    }

    const updateCustomProperties = () => {
      if (!selectedNode.value) return
      
      const custom = {}
      customProperties.value.forEach(prop => {
        if (prop.name.trim()) {
          custom[prop.name.trim()] = prop.value
        }
      })
      
      updateNodeProperty('custom', custom)
    }

    const formatPropertyName = (name) => {
      return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1')
    }

    const formatDate = (date) => {
      if (!date) return 'Unknown'
      return new Date(date).toLocaleString()
    }

    return {
      // 状态
      editableName,
      uniformScale,
      customProperties,
      
      // 计算属性
      selectedNode,
      geometryProperties,
      materialColor,
      materialOpacity,
      materialWireframe,
      nodeVisible,
      nodeLocked,
      
      // 方法
      updateNodeProperty,
      getTransformValue,
      updateTransform,
      getRotationDegrees,
      updateRotation,
      updateScale,
      resetTransform,
      updateGeometryProperty,
      updateMaterialProperty,
      resetMaterial,
      addCustomProperty,
      removeCustomProperty,
      updateCustomProperty,
      formatPropertyName,
      formatDate
    }
  }
}
</script>

<style scoped>
.property-panel {
  height: 100%;
  overflow-y: auto;
  font-size: 12px;
}

.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888888;
}

.placeholder-content {
  text-align: center;
  padding: 40px 20px;
}

.placeholder-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.placeholder-content h3 {
  margin: 0 0 8px 0;
  color: #cccccc;
  font-size: 16px;
}

.placeholder-content p {
  margin: 0;
  font-size: 12px;
}

.property-content {
  padding: 0;
}

.property-section {
  border-bottom: 1px solid #3e3e42;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #2d2d30;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #cccccc;
}

.section-title {
  flex: 1;
}

.section-action {
  background: none;
  border: none;
  color: #cccccc;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  transition: background-color 0.2s;
}

.section-action:hover {
  background-color: #3e3e42;
}

.property-grid {
  padding: 12px;
}

.property-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.property-row:last-child {
  margin-bottom: 0;
}

.property-label {
  min-width: 60px;
  color: #cccccc;
  font-size: 11px;
  flex-shrink: 0;
}

.property-input {
  flex: 1;
  padding: 4px 8px;
  background-color: #3e3e42;
  border: 1px solid #555555;
  border-radius: 3px;
  color: #ffffff;
  font-size: 11px;
}

.property-input:focus {
  outline: none;
  border-color: #007acc;
}

.property-input.small {
  flex: 0 1 auto;
  min-width: 80px;
}

.property-value {
  flex: 1;
  color: #cccccc;
  font-size: 11px;
}

.property-value.readonly {
  color: #888888;
  font-style: italic;
}

.property-group {
  margin-bottom: 12px;
}

.group-label {
  display: block;
  margin-bottom: 6px;
  color: #cccccc;
  font-size: 11px;
  font-weight: 500;
}

.vector-input {
  display: flex;
  gap: 4px;
}

.vector-component {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vector-component label {
  font-size: 10px;
  color: #888888;
  text-align: center;
}

.number-input {
  padding: 4px;
  background-color: #3e3e42;
  border: 1px solid #555555;
  border-radius: 3px;
  color: #ffffff;
  font-size: 11px;
  text-align: center;
}

.number-input:focus {
  outline: none;
  border-color: #007acc;
}

.number-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scale-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.uniform-scale {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.checkbox-input {
  width: 14px;
  height: 14px;
  accent-color: #007acc;
}

.color-input {
  display: flex;
  gap: 4px;
  flex: 1;
}

.color-picker {
  width: 30px;
  height: 24px;
  border: 1px solid #555555;
  border-radius: 3px;
  cursor: pointer;
  background: none;
}

.color-text {
  flex: 1;
  padding: 4px 8px;
  background-color: #3e3e42;
  border: 1px solid #555555;
  border-radius: 3px;
  color: #ffffff;
  font-size: 11px;
  font-family: monospace;
}

.range-input {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.range-slider {
  flex: 1;
  height: 4px;
  background: #3e3e42;
  border-radius: 2px;
  outline: none;
  accent-color: #007acc;
}

.range-value {
  min-width: 35px;
  text-align: right;
  color: #cccccc;
  font-size: 11px;
}

.custom-property {
  align-items: center;
  gap: 4px;
}

.remove-button {
  width: 20px;
  height: 20px;
  background-color: #dc3545;
  border: none;
  border-radius: 3px;
  color: white;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.remove-button:hover {
  background-color: #c82333;
}

/* 滚动条样式 */
.property-panel::-webkit-scrollbar {
  width: 6px;
}

.property-panel::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.property-panel::-webkit-scrollbar-thumb {
  background: #3e3e42;
  border-radius: 3px;
}

.property-panel::-webkit-scrollbar-thumb:hover {
  background: #007acc;
}
</style>

