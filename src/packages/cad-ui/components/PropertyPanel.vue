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
      <!-- Object basic information -->
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

      <!-- Transform properties -->
      <div class="property-section">
        <div class="section-header">
          <span class="section-title">Transform</span>
          <button class="section-action" @click="resetTransform" title="Reset Transform">↺</button>
        </div>
        <div class="property-grid">
          <!-- Position -->
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

          <!-- Rotation -->
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

          <!-- Scale -->
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

      <!-- Geometry properties -->
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

      <!-- Material properties -->
      <div class="property-section">
        <div class="section-header">
          <span class="section-title">Material</span>
          <button class="section-action" @click="resetMaterial" title="Reset Material">↺</button>
        </div>

        <!-- Material Selector -->
        <MaterialSelector
          :visual-object="selectedVisualObject"
          @material-applied="onMaterialApplied"
        />

        <!-- Basic Material Properties -->
        <div class="property-grid">
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

      <!-- Visibility and lock -->
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

      <!-- Custom properties -->
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
import { storeToRefs } from 'pinia'
import MaterialSelector from './MaterialSelector.vue'
import { useApplicationStore } from '@/stores/application'

export default {
  name: 'PropertyPanel',
  components: {
    MaterialSelector
  },
  setup() {
    const appStore = useApplicationStore()
    const { activeDocument } = storeToRefs(appStore)

    // State
    const editableName = ref('')
    const uniformScale = ref(true)
    const customProperties = ref([])

    // Computed properties
    const selectedNode = computed(() => {
      console.log('PropertyPanel - Computing selectedNode...')
      console.log('PropertyPanel - activeDocument.value:', activeDocument.value)

      const doc = activeDocument.value
      if (!doc) {
        console.log('PropertyPanel - No active document')
        return null
      }

      const selectedNodes = doc.selectedNodes
      console.log('PropertyPanel - selectedNodes:', selectedNodes)
      console.log('PropertyPanel - selectedNodes type:', typeof selectedNodes)
      console.log('PropertyPanel - selectedNodes length:', selectedNodes?.length)
      console.log('PropertyPanel - selectedNodes items:', selectedNodes?.items)

      if (!selectedNodes || selectedNodes.length === 0) {
        console.log('PropertyPanel - No selected nodes (length is 0 or null)')
        return null
      }

      // Get the first selected node
      const node = selectedNodes.items?.[0] || null
      console.log('PropertyPanel - First selected node:', node)
      if (node) {
        console.log('PropertyPanel - Node id:', node.id)
        console.log('PropertyPanel - Node name:', node.name)
        console.log('PropertyPanel - Node type:', node.type)
        console.log('PropertyPanel - Node keys:', Object.keys(node))
      }

      return node
    })

    const selectedVisualObject = computed(() => {
      if (!selectedNode.value) {
        console.log('PropertyPanel - No selected node')
        return null
      }

      console.log('PropertyPanel - selectedNode.value:', selectedNode.value)
      console.log('PropertyPanel - selectedNode.value.visualObject:', selectedNode.value.visualObject)

      // Try to get visual object from node
      const visualObject = selectedNode.value.visualObject
      console.log('PropertyPanel - visualObject from node:', visualObject)
      if (visualObject) {
        console.log('PropertyPanel - Found visual object:', visualObject)
        console.log('PropertyPanel - visualObject properties:', Object.keys(visualObject))
        console.log('PropertyPanel - visualObject width:', visualObject.width)
        console.log('PropertyPanel - visualObject height:', visualObject.height)
        console.log('PropertyPanel - visualObject _position:', visualObject._position)
        return visualObject
      }

      // If no direct visual object, try to get from ThreeView
      const threeView = window.__THREESCENE_INSTANCE__
      if (threeView && selectedNode.value.id) {
        const vo = threeView.getVisualObjectInstance(selectedNode.value.id)
        console.log('PropertyPanel - Found visual object from ThreeView:', vo)
        return vo
      }

      console.log('PropertyPanel - No visual object found')
      return null
    })

    const geometryProperties = computed(() => {
      if (!selectedVisualObject.value) return null

      // Get geometry properties from VisualObject
      const props = {}

      // Get basic geometry properties
      if (selectedVisualObject.value.width !== undefined) props.width = selectedVisualObject.value.width
      if (selectedVisualObject.value.height !== undefined) props.height = selectedVisualObject.value.height
      if (selectedVisualObject.value.depth !== undefined) props.depth = selectedVisualObject.value.depth
      if (selectedVisualObject.value.radius !== undefined) props.radius = selectedVisualObject.value.radius
      if (selectedVisualObject.value.radiusTop !== undefined) props.radiusTop = selectedVisualObject.value.radiusTop
      if (selectedVisualObject.value.radiusBottom !== undefined) props.radiusBottom = selectedVisualObject.value.radiusBottom

      // Get calculated properties
      if (selectedVisualObject.value.volume !== undefined) props.volume = selectedVisualObject.value.volume
      if (selectedVisualObject.value.area !== undefined) props.area = selectedVisualObject.value.area
      if (selectedVisualObject.value.surfaceArea !== undefined) props.surfaceArea = selectedVisualObject.value.surfaceArea
      if (selectedVisualObject.value.circumference !== undefined) props.circumference = selectedVisualObject.value.circumference

      return Object.keys(props).length > 0 ? props : null
    })

    const materialColor = computed(() => {
      if (!selectedVisualObject.value) return '#ffffff'

      // Get color from VisualObject material config
      const materialConfig = selectedVisualObject.value._materialConfig?.default
      if (materialConfig && materialConfig.color !== undefined) {
        // Convert hex to CSS color
        return `#${materialConfig.color.toString(16).padStart(6, '0')}`
      }

      return '#ffffff'
    })

    const materialOpacity = computed(() => {
      if (!selectedVisualObject.value) return 1.0
      return selectedVisualObject.value._opacity ?? 1.0
    })

    const materialWireframe = computed(() => {
      if (!selectedVisualObject.value) return false

      // Get wireframe from VisualObject material config
      const materialConfig = selectedVisualObject.value._materialConfig?.default
      return materialConfig?.wireframe || false
    })

    const nodeVisible = computed(() => {
      // Node is a plain object, access properties directly
      return selectedNode.value?.visible ?? true
    })

    const nodeLocked = computed(() => {
      // Node is a plain object, access properties directly
      return selectedNode.value?.locked ?? false
    })

    // Methods
    const updateNodeProperty = (property, value) => {
      if (!selectedNode.value) return

      try {
        // Node is a plain object, so update properties directly
        selectedNode.value[property] = value
        console.log(`Updated ${property} to:`, value)
      } catch (error) {
        console.error(`Failed to update property ${property}:`, error)
      }
    }

    const getTransformValue = (type, axis) => {
      if (!selectedVisualObject.value) return 0

      switch (type) {
        case 'position':
          return selectedVisualObject.value._position[axis] || 0
        case 'rotation':
          return selectedVisualObject.value._rotation[axis] || 0
        case 'scale':
          return selectedVisualObject.value._scale[axis] || (axis === 'x' || axis === 'y' || axis === 'z' ? 1 : 0)
        default:
          return 0
      }
    }

    const updateTransform = (type, axis, value) => {
      if (!selectedVisualObject.value) return

      const numValue = parseFloat(value) || (type === 'scale' ? 1 : 0)

      console.log(`🔧 Updating ${type}.${axis} to ${numValue}`)

      switch (type) {
        case 'position': {
          // Update the position directly on the Three.js object
          if (selectedVisualObject.value._object3D) {
            selectedVisualObject.value._object3D.position[axis] = numValue
            // Also update the internal position
            selectedVisualObject.value._position[axis] = numValue
            // Trigger property change
            selectedVisualObject.value.setProperty('position', selectedVisualObject.value._position.clone())
            console.log(`✅ Position updated:`, selectedVisualObject.value._object3D.position)
          }
          break
        }
        case 'rotation': {
          // Update the rotation directly on the Three.js object
          if (selectedVisualObject.value._object3D) {
            selectedVisualObject.value._object3D.rotation[axis] = numValue
            // Also update the internal rotation
            selectedVisualObject.value._rotation[axis] = numValue
            // Trigger property change
            selectedVisualObject.value.setProperty('rotation', selectedVisualObject.value._rotation.clone())
            console.log(`✅ Rotation updated:`, selectedVisualObject.value._object3D.rotation)
          }
          break
        }
        case 'scale': {
          // Update the scale directly on the Three.js object
          if (selectedVisualObject.value._object3D) {
            selectedVisualObject.value._object3D.scale[axis] = numValue
            // Also update the internal scale
            selectedVisualObject.value._scale[axis] = numValue
            // Trigger property change
            selectedVisualObject.value.setProperty('scale', selectedVisualObject.value._scale.clone())
            console.log(`✅ Scale updated:`, selectedVisualObject.value._object3D.scale)
          }
          break
        }
      }
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
      if (!selectedVisualObject.value) return

      try {
        // Reset position using setter
        selectedVisualObject.value.position = { x: 0, y: 0, z: 0 }

        // Reset rotation using setter
        selectedVisualObject.value.rotation = { x: 0, y: 0, z: 0 }

        // Reset scale using setter
        selectedVisualObject.value.scale = { x: 1, y: 1, z: 1 }

        console.log('Transform reset to defaults')
      } catch (error) {
        console.error('Failed to reset transform:', error)
      }
    }

    const updateGeometryProperty = (property, value) => {
      if (!selectedVisualObject.value) return

      try {
        // Convert value type
        const currentValue = selectedVisualObject.value[property]
        if (typeof currentValue === 'number') {
          value = parseFloat(value) || 0
        } else if (typeof currentValue === 'boolean') {
          value = Boolean(value)
        }

        // Update the property on the VisualObject
        selectedVisualObject.value[property] = value

        // Recreate the geometry if it's a geometry property
        if (selectedVisualObject.value.recreateGeometry) {
          selectedVisualObject.value.recreateGeometry()
        }

        console.log(`Updated geometry property ${property} to:`, value)
      } catch (error) {
        console.error(`Failed to update geometry property ${property}:`, error)
      }
    }

    const updateMaterialProperty = (property, value) => {
      if (!selectedVisualObject.value) return

      try {
        // Update the material config in VisualObject
        if (!selectedVisualObject.value._materialConfig.default) {
          selectedVisualObject.value._materialConfig.default = {}
        }

        selectedVisualObject.value._materialConfig.default[property] = value

        // Update opacity separately as it's stored in _opacity
        if (property === 'opacity') {
          selectedVisualObject.value._opacity = value
        }

        // Apply the material changes
        selectedVisualObject.value.updateMaterial()

        console.log(`Updated material ${property} to:`, value)
      } catch (error) {
        console.error(`Failed to update material property ${property}:`, error)
      }
    }

    const resetMaterial = () => {
      if (!selectedVisualObject.value) return

      try {
        // Reset to default material config
        selectedVisualObject.value._materialConfig.default = {
          color: 0xffffff,
          opacity: 1.0,
          wireframe: false,
          metalness: 0.1,
          roughness: 0.3
        }

        selectedVisualObject.value._opacity = 1.0

        // Apply the material changes
        selectedVisualObject.value.updateMaterial()

        console.log('Material reset to defaults')
      } catch (error) {
        console.error('Failed to reset material:', error)
      }
    }

    const onMaterialApplied = (materialInfo) => {
      console.log('Material applied:', materialInfo)
      // Additional processing logic can be added here
      // Such as updating UI state, recording history, etc.
    }

    const loadCustomProperties = () => {
      if (!selectedNode.value) return

      // Node is a plain object, not an Observable, so access properties directly
      const custom = selectedNode.value.properties?.custom || selectedNode.value.custom || {}
      customProperties.value = Object.entries(custom).map(([name, value]) => ({
        name,
        value: String(value)
      }))
    }

    const addCustomProperty = () => {
      customProperties.value.push({ name: '', value: '' })
    }

    // Watch selected node changes (must be after loadCustomProperties is defined)
    watch(selectedNode, (newNode) => {
      console.log('PropertyPanel - selectedNode changed:', newNode)
      if (newNode) {
        editableName.value = newNode.name || ''
        loadCustomProperties()
        console.log('PropertyPanel - Set editable name to:', editableName.value)
      } else {
        editableName.value = ''
        customProperties.value = []
        console.log('PropertyPanel - Cleared editable name')
      }
    }, { immediate: true })

    const removeCustomProperty = (index) => {
      customProperties.value.splice(index, 1)
      updateCustomProperties()
    }

    const updateCustomProperty = () => {
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
      // State
      editableName,
      uniformScale,
      customProperties,

      // Computed properties
      selectedNode,
      selectedVisualObject,
      geometryProperties,
      materialColor,
      materialOpacity,
      materialWireframe,
      nodeVisible,
      nodeLocked,

      // Methods
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
      onMaterialApplied,
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
  position: relative;
  z-index: 1;
  pointer-events: auto;
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

/* Scrollbar styles */
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

