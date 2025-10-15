/**
 * SelectionOverlay - Creates outline overlays for selected objects
 *
 * Provides smart outline rendering for different geometry types:
 * - Box/Cube: Shows 12 edges in red using EdgesGeometry
 * - Sphere: Shows guide lines (equator + 2 meridians)
 * - Cylinder: Shows top/bottom rims and vertical guides
 *
 * The overlay is added as a child of the selected mesh so it inherits transforms.
 * Uses slight scaling (1.001) to avoid z-fighting.
 */

import * as THREE from 'three'

export class SelectionOverlay {
  /**
   * Material used for all selection outlines
   */
  static SELECTION_MATERIAL = new THREE.LineBasicMaterial({
    color: 0xff0000, // Red
    linewidth: 2,
    depthTest: true,
    transparent: false
  })

  static HOVER_MATERIAL = new THREE.LineBasicMaterial({
    color: 0x4444ff, // Blue
    linewidth: 2,
    depthTest: true,
    transparent: false
  })

  /**
   * Apply selection overlay to an object
   * @param {THREE.Object3D} object - Object to add selection overlay to
   * @param {boolean} isHover - Whether this is a hover state (blue) or selection (red)
   */
  static applySelection(object, isHover = false) {
    if (!object) return

    // Remove existing overlay first
    SelectionOverlay.clearSelection(object)

    // Determine geometry type and create appropriate overlay
    let overlayGroup = null

    if (object.geometry) {
      const geometryType = SelectionOverlay._detectGeometryType(object.geometry)

      switch (geometryType) {
        case 'box':
          overlayGroup = SelectionOverlay._createBoxOverlay(object.geometry)
          break
        case 'sphere':
          overlayGroup = SelectionOverlay._createSphereOverlay(object.geometry)
          break
        case 'cylinder':
          overlayGroup = SelectionOverlay._createCylinderOverlay(object.geometry)
          break
        case 'torus':
          overlayGroup = SelectionOverlay._createTorusOverlay(object.geometry)
          break
        default:
          // Fallback: use EdgesGeometry for any other geometry
          overlayGroup = SelectionOverlay._createEdgesOverlay(object.geometry)
          break
      }
    }

    if (overlayGroup) {
      // Scale slightly to avoid z-fighting
      overlayGroup.scale.setScalar(1.001)

      // Use the appropriate material
      const material = isHover ? SelectionOverlay.HOVER_MATERIAL : SelectionOverlay.SELECTION_MATERIAL
      overlayGroup.traverse((child) => {
        if (child.material) {
          child.material = material
        }
      })

      // Mark as selection overlay for easy identification
      overlayGroup.userData.isSelectionOverlay = true
      overlayGroup.userData.isHoverOverlay = isHover

      // Add as child of the object (inherits transforms automatically)
      object.add(overlayGroup)
    }
  }

  /**
   * Clear selection overlay from an object
   * @param {THREE.Object3D} object - Object to remove selection overlay from
   */
  static clearSelection(object) {
    if (!object) return

    // Find and remove all selection overlays
    const overlaysToRemove = []
    object.children.forEach(child => {
      if (child.userData.isSelectionOverlay) {
        overlaysToRemove.push(child)
      }
    })

    overlaysToRemove.forEach(overlay => {
      object.remove(overlay)
      // Dispose geometries to free memory
      overlay.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose()
        }
      })
    })
  }

  /**
   * Detect geometry type from BufferGeometry
   * @private
   */
  static _detectGeometryType(geometry) {
    // Check userData first (set by our geometry factory)
    if (geometry.userData.type) {
      return geometry.userData.type.toLowerCase()
    }

    // Fallback: analyze geometry parameters
    const params = geometry.parameters
    if (params) {
      if (params.width !== undefined && params.height !== undefined && params.depth !== undefined) {
        return 'box'
      }
      if (params.radius !== undefined && params.widthSegments !== undefined && !params.height) {
        return 'sphere'
      }
      if (params.radiusTop !== undefined && params.radiusBottom !== undefined && params.height !== undefined) {
        return 'cylinder'
      }
      if (params.tube !== undefined && params.tubularSegments !== undefined) {
        return 'torus'
      }
    }

    return 'generic'
  }

  /**
   * Create box overlay (12 edges)
   * @private
   */
  static _createBoxOverlay(geometry) {
    const group = new THREE.Group()

    // Use EdgesGeometry to get all 12 edges of the box
    const edges = new THREE.EdgesGeometry(geometry)
    const lines = new THREE.LineSegments(edges, SelectionOverlay.SELECTION_MATERIAL)

    group.add(lines)
    return group
  }

  /**
   * Create sphere overlay (equator + 2 meridians)
   * @private
   */
  static _createSphereOverlay(geometry) {
    const group = new THREE.Group()
    const params = geometry.parameters || {}
    const radius = params.radius || 1
    const segments = 64 // High resolution for smooth circles

    // Equator (horizontal circle in XZ plane)
    const equatorPoints = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      equatorPoints.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ))
    }
    const equatorGeometry = new THREE.BufferGeometry().setFromPoints(equatorPoints)
    const equator = new THREE.Line(equatorGeometry, SelectionOverlay.SELECTION_MATERIAL)
    group.add(equator)

    // Meridian 1 (vertical circle in XY plane)
    const meridian1Points = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      meridian1Points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      ))
    }
    const meridian1Geometry = new THREE.BufferGeometry().setFromPoints(meridian1Points)
    const meridian1 = new THREE.Line(meridian1Geometry, SelectionOverlay.SELECTION_MATERIAL)
    group.add(meridian1)

    // Meridian 2 (vertical circle in YZ plane)
    const meridian2Points = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      meridian2Points.push(new THREE.Vector3(
        0,
        Math.sin(angle) * radius,
        Math.cos(angle) * radius
      ))
    }
    const meridian2Geometry = new THREE.BufferGeometry().setFromPoints(meridian2Points)
    const meridian2 = new THREE.Line(meridian2Geometry, SelectionOverlay.SELECTION_MATERIAL)
    group.add(meridian2)

    return group
  }

  /**
   * Create cylinder overlay (top/bottom rims + vertical guides)
   * @private
   */
  static _createCylinderOverlay(geometry) {
    const group = new THREE.Group()
    const params = geometry.parameters || {}
    const radiusTop = params.radiusTop || 1
    const radiusBottom = params.radiusBottom || 1
    const height = params.height || 1
    const segments = 64

    const halfHeight = height / 2

    // Top rim
    const topPoints = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      topPoints.push(new THREE.Vector3(
        Math.cos(angle) * radiusTop,
        halfHeight,
        Math.sin(angle) * radiusTop
      ))
    }
    const topGeometry = new THREE.BufferGeometry().setFromPoints(topPoints)
    const topRim = new THREE.Line(topGeometry, SelectionOverlay.SELECTION_MATERIAL)
    group.add(topRim)

    // Bottom rim
    const bottomPoints = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      bottomPoints.push(new THREE.Vector3(
        Math.cos(angle) * radiusBottom,
        -halfHeight,
        Math.sin(angle) * radiusBottom
      ))
    }
    const bottomGeometry = new THREE.BufferGeometry().setFromPoints(bottomPoints)
    const bottomRim = new THREE.Line(bottomGeometry, SelectionOverlay.SELECTION_MATERIAL)
    group.add(bottomRim)

    // Vertical guides (4 lines connecting top and bottom)
    const numGuides = 4
    for (let i = 0; i < numGuides; i++) {
      const angle = (i / numGuides) * Math.PI * 2
      const guidePoints = [
        new THREE.Vector3(
          Math.cos(angle) * radiusTop,
          halfHeight,
          Math.sin(angle) * radiusTop
        ),
        new THREE.Vector3(
          Math.cos(angle) * radiusBottom,
          -halfHeight,
          Math.sin(angle) * radiusBottom
        )
      ]
      const guideGeometry = new THREE.BufferGeometry().setFromPoints(guidePoints)
      const guide = new THREE.Line(guideGeometry, SelectionOverlay.SELECTION_MATERIAL)
      group.add(guide)
    }

    return group
  }

  /**
   * Create torus overlay (outer ring + cross-section circles)
   * @private
   */
  static _createTorusOverlay(geometry) {
    const group = new THREE.Group()
    const params = geometry.parameters || {}
    const radius = params.radius || 1
    const tube = params.tube || 0.4
    const segments = 64

    // Outer ring (main circle)
    const outerPoints = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      outerPoints.push(new THREE.Vector3(
        Math.cos(angle) * (radius + tube),
        0,
        Math.sin(angle) * (radius + tube)
      ))
    }
    const outerGeometry = new THREE.BufferGeometry().setFromPoints(outerPoints)
    const outerRing = new THREE.Line(outerGeometry, SelectionOverlay.SELECTION_MATERIAL)
    group.add(outerRing)

    // Inner ring
    const innerPoints = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      innerPoints.push(new THREE.Vector3(
        Math.cos(angle) * (radius - tube),
        0,
        Math.sin(angle) * (radius - tube)
      ))
    }
    const innerGeometry = new THREE.BufferGeometry().setFromPoints(innerPoints)
    const innerRing = new THREE.Line(innerGeometry, SelectionOverlay.SELECTION_MATERIAL)
    group.add(innerRing)

    // Cross-section circles at 4 points
    const numCrossSections = 4
    for (let i = 0; i < numCrossSections; i++) {
      const mainAngle = (i / numCrossSections) * Math.PI * 2
      const centerX = Math.cos(mainAngle) * radius
      const centerZ = Math.sin(mainAngle) * radius

      const crossPoints = []
      for (let j = 0; j <= segments / 2; j++) {
        const angle = (j / (segments / 2)) * Math.PI * 2
        const localX = Math.cos(angle) * tube
        const localY = Math.sin(angle) * tube

        // Rotate the cross-section to align with the torus
        crossPoints.push(new THREE.Vector3(
          centerX + localX * Math.cos(mainAngle),
          localY,
          centerZ + localX * Math.sin(mainAngle)
        ))
      }
      const crossGeometry = new THREE.BufferGeometry().setFromPoints(crossPoints)
      const crossSection = new THREE.Line(crossGeometry, SelectionOverlay.SELECTION_MATERIAL)
      group.add(crossSection)
    }

    return group
  }

  /**
   * Create generic edges overlay (fallback for unknown geometries)
   * @private
   */
  static _createEdgesOverlay(geometry) {
    const group = new THREE.Group()

    // Use EdgesGeometry with threshold for clean edges
    const edges = new THREE.EdgesGeometry(geometry, 15) // 15 degree threshold
    const lines = new THREE.LineSegments(edges, SelectionOverlay.SELECTION_MATERIAL)

    group.add(lines)
    return group
  }

  /**
   * Dispose of static materials when no longer needed
   */
  static dispose() {
    if (SelectionOverlay.SELECTION_MATERIAL) {
      SelectionOverlay.SELECTION_MATERIAL.dispose()
    }
    if (SelectionOverlay.HOVER_MATERIAL) {
      SelectionOverlay.HOVER_MATERIAL.dispose()
    }
  }
}

