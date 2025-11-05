import * as THREE from 'three';
import { Entity } from './Entity';
import { createMeshWithMetadata } from '../utils/geometryUtils';

export class Cube extends Entity {
  /**
   * Creates a cube with face and edge metadata
   * @param {Object} options - Options for the cube
   * @param {number} [options.size=1] - Size of the cube
   * @param {THREE.Color|string|number} [options.color=0x00ff00] - Color of the cube
   * @param {number} [options.rotationSpeed=0.01] - Base rotation speed
   */
  constructor({ 
    size = 1, 
    color = 0x00ff00, 
    rotationSpeed = 0.01 
  } = {}) {
    super();
    
    // Create geometry and material
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshPhongMaterial({
      color,
      shininess: 100,
      side: THREE.DoubleSide
    });
    
    // Create mesh with metadata
    const { mesh, metadata } = createMeshWithMetadata(geometry, material, { size });
    
    // Initialize the entity with the mesh and metadata
    this.createMesh(geometry, material, metadata);
    
    // Set a gentle rotation
    this.setRotationSpeed(
      rotationSpeed * (0.5 + Math.random() * 0.5),
      rotationSpeed * (0.5 + Math.random() * 0.5),
      rotationSpeed * (0.5 + Math.random() * 0.5)
    );
  }
  
  /**
   * Gets the metadata for a specific face
   * @param {string} faceId - The ID of the face (f0-f5 for a cube)
   * @returns {Object|null} The face metadata or null if not found
   */
  getFace(faceId) {
    return this.metadata.faces.find(face => face.id === faceId) || null;
  }
  
  /**
   * Gets the metadata for a specific edge
   * @param {string} edgeId - The ID of the edge (e0-e11 for a cube)
   * @returns {Object|null} The edge metadata or null if not found
   */
  getEdge(edgeId) {
    return this.metadata.edges.find(edge => edge.id === edgeId) || null;
  }
  
  /**
   * Gets all faces with a specific normal direction (within a threshold)
   * @param {THREE.Vector3} normal - The normal to compare against
   * @param {number} [threshold=0.01] - The maximum angle difference in radians
   * @returns {Array} Array of matching face metadata
   */
  getFacesWithNormal(normal, threshold = 0.01) {
    const targetNormal = normal.clone().normalize();
    return this.metadata.faces.filter(face => {
      const faceNormal = new THREE.Vector3().fromArray(face.normal).normalize();
      return faceNormal.angleTo(targetNormal) < threshold;
    });
  }
}
