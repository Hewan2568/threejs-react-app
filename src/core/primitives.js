// src/core/primitives.js
import * as THREE from 'three';


/**
 * Creates a mapping from triangle indices to face information
 * @param {THREE.BufferGeometry} geo - The geometry to process
 * @returns {Object} Map from triangle index to face information
 */
export function triangleToFaceMapFromGeometry(geometry) {
  if (!geometry || !geometry.attributes.position) return {};

  const faceMap = {};
  const position = geometry.attributes.position;
  const index = geometry.index ? geometry.index.array : null;
  const triangleCount = index ? index.length / 3 : position.count / 3;

  for (let i = 0; i < triangleCount; i++) {
    const face = {
      materialIndex: 0, // Default material index
      normal: new THREE.Vector3(),
      vertices: []
    };

    if (index) {
      for (let j = 0; j < 3; j++) {
        const vertexIndex = index[i * 3 + j];
        const x = position.getX(vertexIndex);
        const y = position.getY(vertexIndex);
        const z = position.getZ(vertexIndex);
        face.vertices.push(new THREE.Vector3(x, y, z));
      }
    } else {
      for (let j = 0; j < 3; j++) {
        const x = position.getX(i * 3 + j);
        const y = position.getY(i * 3 + j);
        const z = position.getZ(i * 3 + j);
        face.vertices.push(new THREE.Vector3(x, y, z));
      }
    }

    // Calculate face normal
    const cb = new THREE.Vector3();
    const ab = new THREE.Vector3();
    cb.subVectors(face.vertices[2], face.vertices[1]);
    ab.subVectors(face.vertices[0], face.vertices[1]);
    cb.cross(ab).normalize();
    face.normal.copy(cb);

    faceMap[i] = face;
  }

  return faceMap;
}

/**
 * Builds a list of unique edges from a geometry
 * @param {THREE.BufferGeometry} geo - The geometry to process
 * @returns {Array} Array of edge objects with v1, v2 vertex indices
 */

export function buildEdgesFromGeometry(geometry, thresholdAngle = 1) {
  const edges = [];
  const edgeMap = new Map();
  const keys = ['x', 'y', 'z'];
  
  // Helper to get a unique key for an edge
  const getEdgeKey = (a, b) => a < b ? `${a}_${b}` : `${b}_${a}`;

  // Process triangles
  const index = geometry.index ? geometry.index.array : null;
  const position = geometry.attributes.position;
  const triangleCount = index ? index.length / 3 : position.count / 3;

  for (let i = 0; i < triangleCount; i++) {
    const a = index ? index[i * 3] : i * 3;
    const b = index ? index[i * 3 + 1] : i * 3 + 1;
    const c = index ? index[i * 3 + 2] : i * 3 + 2;

    // Add edges
    [ [a, b], [b, c], [c, a] ].forEach(edge => {
      const key = getEdgeKey(edge[0], edge[1]);
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { count: 0, triangles: [] });
      }
      const edgeData = edgeMap.get(key);
      edgeData.count++;
      edgeData.triangles.push(i);
    });
  }

  // Only include edges that are shared by fewer than 2 triangles (boundary edges)
  // or edges between faces with normals that differ by more than the threshold
  for (const [key, data] of edgeMap.entries()) {
    if (data.count === 1) {
      // Boundary edge
      const [a, b] = key.split('_').map(Number);
      edges.push([a, b]);
    } else if (data.count === 2) {
      // Shared edge, check angle between normals
      const [t1, t2] = data.triangles;
      const faceMap = triangleToFaceMapFromGeometry(geometry);
      const normal1 = faceMap[t1].normal;
      const normal2 = faceMap[t2].normal;
      const angle = normal1.angleTo(normal2);
      
      if (angle > thresholdAngle) {
        const [a, b] = key.split('_').map(Number);
        edges.push([a, b]);
      }
    }
  }

  return edges;
}

/**
 * Helper function to add an edge to the edges map
 * @private
 */
function addEdge(edges, v1, v2) {
  // Create a consistent key regardless of vertex order
  const key = v1 < v2 ? `${v1}_${v2}` : `${v2}_${v1}`;
  if (!edges[key]) {
    edges[key] = { 
      id: `edge_${key}`, 
      v1: Math.min(v1, v2), 
      v2: Math.max(v1, v2),
      name: `Edge ${v1}-${v2}`
    };
  }
  return edges[key];
}

/**
 * Creates a THREE.LineSegments object for visualizing edges
 * @param {THREE.BufferGeometry} geometry - The geometry to create edges from
 * @param {Object} options - Options for the edge material
 * @returns {THREE.LineSegments} Line segments representing the edges
 */
export function createEdgeLines(geometry, options = {}) {
  const edgesGeometry = new THREE.EdgesGeometry(geometry);
  const material = new THREE.LineBasicMaterial({
    color: options.color || 0x000000,
    linewidth: options.width || 1,
    transparent: true,
    opacity: options.opacity || 0.8
  });
  
  return new THREE.LineSegments(edgesGeometry, material);
}



export function createBox({ sceneManager, width = 1, height = 1, depth = 1, position = [0, 0, 0] } = {}) {
  if (!sceneManager) {
    console.error('Scene manager is required to create a box');
    return null;
  }
  
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0x8888ff,
    metalness: 0.3,
    roughness: 0.8 
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  
  // Add the mesh to the scene using the scene manager's scene
  sceneManager.scene.add(mesh);
  
  // Add to scene manager's object tracking if the method exists
  if (sceneManager.addObject) {
    return sceneManager.addObject({
      mesh,
      type: 'box',
      params: { width, height, depth }
    });
  }
  
  return mesh;
}

export function createSphere({ sceneManager, radius = 1, position = [0, 0, 0] } = {}) {
  if (!sceneManager) {
    console.error('Scene manager is required to create a sphere');
    return null;
  }
  
  const geometry = new THREE.SphereGeometry(radius, 32, 16);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xff8888,
    metalness: 0.3,
    roughness: 0.4 
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  
  return sceneManager.addObject({
    mesh,
    type: 'sphere',
    params: { radius }
  });
}

export function createCylinder({ sceneManager, radiusTop = 0.5, radiusBottom = 0.5, height = 1, position = [0, 0, 0] } = {}) {
  if (!sceneManager) {
    console.error('Scene manager is required to create a cylinder');
    return null;
  }
  
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0x88ff88,
    metalness: 0.3,
    roughness: 0.6 
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  
  return sceneManager.addObject({
    mesh,
    type: 'cylinder',
    params: { radiusTop, radiusBottom, height }
  });
}