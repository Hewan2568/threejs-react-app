import * as THREE from 'three';

class SceneExporter {
  /**
   * Serializes a Three.js object to a plain JavaScript object
   * @param {THREE.Object3D} object - The Three.js object to serialize
   * @returns {Object} Serialized object data
   */
  static serializeObject(object) {
    const data = {
      uuid: object.uuid,
      type: object.type,
      name: object.name,
      layers: object.layers.mask,
      matrix: object.matrix.toArray(),
      userData: JSON.parse(JSON.stringify(object.userData)),
      children: []
    };

    // Handle different geometry types
    if (object.geometry) {
      data.geometry = {
        type: object.geometry.type,
        uuid: object.geometry.uuid
      };
      
      // Store geometry attributes
      const attributes = {};
      for (const [name, attribute] of Object.entries(object.geometry.attributes)) {
        attributes[name] = {
          itemSize: attribute.itemSize,
          type: attribute.array.constructor.name,
          array: Array.from(attribute.array),
          normalized: attribute.normalized
        };
      }
      data.geometry.attributes = attributes;
    }

    // Handle materials
    if (object.material) {
      if (Array.isArray(object.material)) {
        data.material = object.material.map(mat => this.serializeMaterial(mat));
      } else {
        data.material = this.serializeMaterial(object.material);
      }
    }

    // Process children
    for (const child of object.children) {
      data.children.push(this.serializeObject(child));
    }

    return data;
  }

  /**
   * Serializes a Three.js material to a plain JavaScript object
   * @param {THREE.Material} material - The material to serialize
   * @returns {Object} Serialized material data
   */
  static serializeMaterial(material) {
    return {
      uuid: material.uuid,
      type: material.type,
      name: material.name,
      color: material.color ? material.color.getHex() : 0xffffff,
      transparent: material.transparent,
      opacity: material.opacity,
      wireframe: material.wireframe,
      side: material.side,
      userData: JSON.parse(JSON.stringify(material.userData || {}))
    };
  }

  /**
   * Exports the entire scene to a JSON string
   * @param {THREE.Scene} scene - The Three.js scene to export
   * @returns {string} JSON string of the scene
   */
  static exportScene(scene) {
    const output = {
      metadata: {
        version: 4.6,
        type: 'Object',
        generator: 'Three.js Scene Exporter',
        exportedAt: new Date().toISOString()
      },
      object: this.serializeObject(scene)
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Downloads the current scene as a JSON file
   * @param {THREE.Scene} scene - The scene to download
   * @param {string} filename - The name of the file (without extension)
   */
  static downloadScene(scene, filename = 'scene') {
    const json = this.exportScene(scene);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export default SceneExporter;
