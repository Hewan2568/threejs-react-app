import * as THREE from 'three';

export class Entity {
  constructor() {
    this.mesh = null;
    this.metadata = {
      faces: [],
      edges: [],
      type: 'entity',
      geometryParams: {}
    };
    this.rotationSpeed = {
      x: 0,
      y: 0,
      z: 0
    };
    this.isSelected = false;
    this.highlightedFace = null;
    this.highlightedEdge = null;
  }

  /**
   * Creates a mesh with metadata
   * @param {THREE.BufferGeometry} geometry 
   * @param {THREE.Material} material 
   * @param {Object} metadata 
   * @returns {THREE.Mesh}
   */
  createMesh(geometry, material, metadata = {}) {
    this.mesh = new THREE.Mesh(geometry, material);
    this.metadata = {
      ...this.metadata,
      ...metadata,
      uuid: this.mesh.uuid
    };
    return this.mesh;
  }

  setPosition(x, y, z) {
    if (this.mesh) {
      this.mesh.position.set(x, y, z);
    }
  }

  setRotationSpeed(x, y, z) {
    this.rotationSpeed = { x, y, z };
  }

  /**
   * Sets the selection state of the entity
   * @param {boolean} selected 
   */
  setSelected(selected) {
    this.isSelected = selected;
    this.updateMaterial();
  }

  /**
   * Highlights a specific face
   * @param {string|null} faceId - The ID of the face to highlight, or null to clear
   */
  highlightFace(faceId) {
    this.highlightedFace = faceId;
    this.updateMaterial();
  }

  /**
   * Highlights a specific edge
   * @param {string|null} edgeId - The ID of the edge to highlight, or null to clear
   */
  highlightEdge(edgeId) {
    this.highlightedEdge = edgeId;
    this.updateMaterial();
  }

  /**
   * Updates the material based on the current state
   */
  updateMaterial() {
    if (!this.mesh || !this.mesh.material) return;
    
    // Clone the material to avoid affecting other meshes
    if (!this.originalMaterial) {
      this.originalMaterial = this.mesh.material;
    }
    
    if (this.isSelected) {
      // Create a new material for selection highlight
      this.mesh.material = this.originalMaterial.clone();
      this.mesh.material.emissive = new THREE.Color(0x444444);
    } else if (this.highlightedFace || this.highlightedEdge) {
      // Create a new material for face/edge highlight
      this.mesh.material = this.originalMaterial.clone();
      this.mesh.material.wireframe = true;
      this.mesh.material.wireframeLinewidth = 2;
    } else {
      // Restore original material
      this.mesh.material = this.originalMaterial;
    }
  }

  /**
   * Finds the closest face to a given point in world coordinates
   * @param {THREE.Vector3} worldPoint 
   * @returns {Object|null} The closest face metadata or null if not found
   */
  findClosestFace(worldPoint) {
    if (!this.mesh || !this.metadata.faces) return null;
    
    const localPoint = this.mesh.worldToLocal(worldPoint.clone());
    let closestFace = null;
    let minDistance = Infinity;
    
    for (const face of this.metadata.faces) {
      // Simple distance to face center (for demo purposes)
      // In a real app, you'd want to implement proper raycasting or point-in-face testing
      const distance = localPoint.distanceTo(face.center || new THREE.Vector3());
      
      if (distance < minDistance) {
        minDistance = distance;
        closestFace = face;
      }
    }
    
    return closestFace;
  }

  update() {
    if (this.mesh) {
      this.mesh.rotation.x += this.rotationSpeed.x;
      this.mesh.rotation.y += this.rotationSpeed.y;
      this.mesh.rotation.z += this.rotationSpeed.z;
    }
  }

  /**
   * Cleans up resources
   */
  dispose() {
    if (this.mesh) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(material => material.dispose());
        } else {
          this.mesh.material.dispose();
        }
      }
      
      if (this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
    }
  }
}
