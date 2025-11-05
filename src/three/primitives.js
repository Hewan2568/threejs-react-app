import * as THREE from 'three';
import { sceneManager } from './SceneManager';

const createGeometry = (type, params) => {
  let geometry;
  
  switch (type) {
    case 'box':
      geometry = new THREE.BoxGeometry(
        params.width || 1,
        params.height || 1,
        params.depth || 1
      );
      break;
      
    case 'sphere':
      geometry = new THREE.SphereGeometry(
        params.radius || 0.5,
        params.widthSegments || 32,
        params.heightSegments || 32
      );
      break;
      
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(
        params.radiusTop || 0.5,
        params.radiusBottom || 0.5,
        params.height || 1,
        params.radialSegments || 32
      );
      break;
      
    default:
      console.warn(`Unknown geometry type: ${type}`);
      return null;
  }
  
  return geometry;
};

export const createPrimitive = (type, params = {}) => {
  const geometry = createGeometry(type, params);
  if (!geometry) return null;
  
  const material = new THREE.MeshStandardMaterial({
    color: params.color || 0x00ff00,
    metalness: 0.1,
    roughness: 0.7,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  // Add some default position if not provided
  if (!params.position) {
    mesh.position.x = (Math.random() - 0.5) * 5;
    mesh.position.y = (Math.random() - 0.5) * 5;
    mesh.position.z = (Math.random() - 0.5) * 5;
  } else {
    mesh.position.set(params.position.x, params.position.y, params.position.z);
  }
  
  // Add to scene with proper metadata
  sceneManager.addObject({
    mesh,
    type: type,
    params: {
      ...params,
      position: mesh.position.toArray()
    }
  });
  return mesh;
};

export const createBox = (params = {}) => {
  return createPrimitive('box', {
    ...params,
    width: params.width || 1,
    height: params.height || 1,
    depth: params.depth || 1,
    color: params.color || 0x00ff00
  });
};

export const createSphere = (params = {}) => {
  return createPrimitive('sphere', {
    ...params,
    radius: params.radius || 0.5,
    color: params.color || 0xff0000
  });
};

export const createCylinder = (params = {}) => {
  return createPrimitive('cylinder', {
    ...params,
    radiusTop: params.radiusTop || 0.5,
    radiusBottom: params.radiusBottom || 0.5,
    height: params.height || 1,
    color: params.color || 0x0000ff
  });
};
