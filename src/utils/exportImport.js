import * as THREE from 'three';
import { createBox, createSphere, createCylinder } from '../core/primitives';

/**
 * Exports the scene objects to a JSON string
 * @param {Object} sceneManager - The scene manager instance
 * @returns {string} JSON string of the scene
 */
export function exportSceneToJson(sceneManager) {
  const objects = [];
  
  for (const [id, meta] of sceneManager.objects.entries()) {
    const objData = {
      id: id,
      type: meta.type,
      params: meta.params || {},
      transform: {
        position: meta.mesh.position.toArray(),
        rotation: [
          meta.mesh.rotation.x,
          meta.mesh.rotation.y,
          meta.mesh.rotation.z
        ],
        scale: meta.mesh.scale.toArray()
      },
      metadata: {
        faces: meta.faces || [],
        edges: meta.edges || []
      },
      name: meta.mesh.name || ''
    };

    // Store shape points for extrusions or custom shapes
    if (meta.shapePoints) {
      objData.shapePoints = meta.shapePoints.map(p => p.toArray());
    }
    
    // Store extrude settings if available
    if (meta.extrudeSettings) {
      objData.extrudeSettings = meta.extrudeSettings;
    }
    
    objects.push(objData);
  }
  
  return JSON.stringify({
    objects: objects,
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      generator: '3D-Editor-Exporter'
    }
  }, (key, value) => {
    // Handle special cases for non-serializable data
    if (value instanceof THREE.Vector3 || 
        value instanceof THREE.Euler || 
        value instanceof THREE.Quaternion) {
      return value.toArray();
    }
    return value;
  }, 2);
}

/**
 * Imports a scene from JSON and adds objects to the scene manager
 * @param {string} jsonString - JSON string to import
 * @param {Object} sceneManager - The scene manager instance
 * @returns {Promise<Array>} Array of imported object IDs
 */
export async function importSceneFromJson(jsonString, sceneManager) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.objects || !Array.isArray(data.objects)) {
      throw new Error('Invalid scene format: missing objects array');
    }

    const importedIds = [];
    
    for (const objData of data.objects) {
      let newObj;
      const { type, params, transform, id, metadata = {} } = objData;
      
      // Create the appropriate object based on type
      switch (type) {
        case 'box':
          newObj = await sceneManager.addBox({
            ...params,
            position: transform.position,
            rotation: transform.rotation,
            scale: transform.scale,
            id
          });
          break;
          
        case 'sphere':
          newObj = await sceneManager.addSphere({
            ...params,
            position: transform.position,
            rotation: transform.rotation,
            scale: transform.scale,
            id
          });
          break;
          
        case 'cylinder':
          newObj = await sceneManager.addCylinder({
            ...params,
            position: transform.position,
            rotation: transform.rotation,
            scale: transform.scale,
            id
          });
          break;
          
        case 'extrude':
          if (objData.shapePoints && objData.extrudeSettings) {
            const points = objData.shapePoints.map(p => new THREE.Vector3().fromArray(p));
            newObj = await sceneManager.addExtrude({
              shapePoints: points,
              extrudeSettings: objData.extrudeSettings,
              position: transform.position,
              rotation: transform.rotation,
              scale: transform.scale,
              id
            });
          }
          break;
          
        default:
          console.warn(`Unsupported object type: ${type}`);
          continue;
      }
      
      if (newObj) {
        // Apply name if specified
        if (objData.name) {
          newObj.mesh.name = objData.name;
        }
        
        // Store metadata
        if (metadata.faces) newObj.faces = metadata.faces;
        if (metadata.edges) newObj.edges = metadata.edges;
        
        importedIds.push(id);
      }
    }
    
    return importedIds;
    
  } catch (error) {
    console.error('Error importing scene:', error);
    throw error;
  }
}

/**
 * Downloads the scene as a JSON file
 * @param {Object} sceneManager - The scene manager instance
 * @param {string} filename - Name of the file to save (without extension)
 */
export function downloadScene(sceneManager, filename = 'scene') {
  const json = exportSceneToJson(sceneManager);
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

/**
 * Handles file upload and imports the scene
 * @param {Event} event - File input change event
 * @param {Object} sceneManager - The scene manager instance
 * @returns {Promise<Array>} Array of imported object IDs
 */
export async function handleFileUpload(event, sceneManager) {
  const file = event.target.files[0];
  if (!file) return [];
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedIds = await importSceneFromJson(e.target.result, sceneManager);
        resolve(importedIds);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}
    return true;
  } catch (error) {
    console.error('Error importing scene:', error);
    return false;
  }
};
