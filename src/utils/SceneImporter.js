import * as THREE from 'three';

class SceneImporter {
  /**
   * Deserializes a material from a plain JavaScript object
   * @param {Object} data - The material data
   * @returns {THREE.Material} The deserialized material
   */
  static deserializeMaterial(data) {
    let material;
    
    // Create the appropriate material type
    switch (data.type) {
      case 'MeshStandardMaterial':
        material = new THREE.MeshStandardMaterial();
        break;
      case 'MeshBasicMaterial':
        material = new THREE.MeshBasicMaterial();
        break;
      case 'MeshPhongMaterial':
        material = new THREE.MeshPhongMaterial();
        break;
      default:
        material = new THREE.MeshStandardMaterial();
    }

    // Apply common properties
    material.uuid = data.uuid || THREE.MathUtils.generateUUID();
    material.name = data.name || '';
    if (data.color !== undefined) material.color.setHex(data.color);
    if (data.transparent !== undefined) material.transparent = data.transparent;
    if (data.opacity !== undefined) material.opacity = data.opacity;
    if (data.wireframe !== undefined) material.wireframe = data.wireframe;
    if (data.side !== undefined) material.side = data.side;
    if (data.userData) material.userData = data.userData;

    return material;
  }

  /**
   * Deserializes a geometry from a plain JavaScript object
   * @param {Object} data - The geometry data
   * @returns {THREE.BufferGeometry} The deserialized geometry
   */
  static deserializeGeometry(data) {
    const geometry = new THREE.BufferGeometry();
    
    // Set attributes
    if (data.attributes) {
      for (const [name, attribute] of Object.entries(data.attributes)) {
        const TypedArray = window[attribute.type] || Float32Array;
        const array = new TypedArray(attribute.array);
        geometry.setAttribute(
          name,
          new THREE.BufferAttribute(array, attribute.itemSize, attribute.normalized)
        );
      }
    }
    
    return geometry;
  }

  /**
   * Deserializes an object from a plain JavaScript object
   * @param {Object} data - The object data
   * @returns {THREE.Object3D} The deserialized object
   */
  static deserializeObject(data) {
    let object;
    
    // Create the appropriate object type
    switch (data.type) {
      case 'Scene':
        object = new THREE.Scene();
        break;
      case 'Mesh':
        const geometry = data.geometry ? this.deserializeGeometry(data.geometry) : new THREE.BoxGeometry();
        const material = data.material ? 
          (Array.isArray(data.material) ? 
            data.material.map(mat => this.deserializeMaterial(mat)) : 
            this.deserializeMaterial(data.material)) : 
          new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        object = new THREE.Mesh(geometry, material);
        break;
      case 'Group':
        object = new THREE.Group();
        break;
      default:
        object = new THREE.Object3D();
    }
    
    // Set common properties
    object.uuid = data.uuid || THREE.MathUtils.generateUUID();
    object.name = data.name || '';
    
    // Apply transform
    if (data.matrix) {
      object.matrix.fromArray(data.matrix);
      object.matrix.decompose(object.position, object.quaternion, object.scale);
    }
    
    if (data.layers !== undefined) object.layers.mask = data.layers;
    if (data.userData) object.userData = data.userData;
    
    // Add children recursively
    if (data.children) {
      for (const childData of data.children) {
        const child = this.deserializeObject(childData);
        object.add(child);
      }
    }
    
    return object;
  }

  /**
   * Imports a scene from a JSON string
   * @param {string} json - The JSON string to import
   * @returns {THREE.Scene} The imported scene
   */
  static importScene(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      if (!data.object || data.object.type !== 'Scene') {
        throw new Error('Invalid scene format: root object must be a Scene');
      }
      
      return this.deserializeObject(data.object);
    } catch (error) {
      console.error('Error importing scene:', error);
      throw error;
    }
  }

  /**
   * Handles file upload and imports the scene
   * @param {File} file - The file to import
   * @returns {Promise<THREE.Scene>} A promise that resolves with the imported scene
   */
  static async importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const scene = this.importScene(event.target.result);
          resolve(scene);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        reject(new Error(`Error reading file: ${error.message}`));
      };
      
      reader.readAsText(file);
    });
  }
}

export default SceneImporter;
