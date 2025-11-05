import * as THREE from 'three';

// Cache for triangle index to face ID mapping
const triangleToFaceMap = new WeakMap();

/**
 * Builds a map from triangle indices to face IDs for quick lookup
 * @param {Array} faces - Array of face metadata objects
 * @returns {Map} Map from triangle index to face ID
 */
function buildTriangleToFaceMap(faces) {
  const map = new Map();
  faces.forEach(face => {
    face.triangleIndices.forEach(triIndex => {
      map.set(triIndex, face.id);
    });
  });
  return map;
}

/**
 * Creates an EdgesGeometry with additional metadata for selection
 * @param {THREE.BufferGeometry} geometry 
 * @param {Array} edges - Edge metadata array
 * @returns {Object} Contains edgesGeometry and line segments for selection
 */
export function createEdgesGeometry(geometry, edges) {
  // Create standard edges geometry for rendering
  const edgesGeometry = new THREE.EdgesGeometry(geometry);
  
  // Create a line segments object for raycasting
  const edgesMaterial = new THREE.LineBasicMaterial({ 
    color: 0x000000,
    transparent: true,
    opacity: 0.5
  });
  
  const lineSegments = new THREE.LineSegments(edgesGeometry, edgesMaterial);
  lineSegments.userData.isEdge = true;
  
  // Store edge indices for selection
  lineSegments.userData.edgeIndices = edges.map((_, i) => i);
  
  return {
    edgesGeometry,
    lineSegments
  };
}

/**
 * Finds the closest edge to a ray
 * @param {THREE.Ray} ray - The ray to test against
 * @param {THREE.Vector3} origin - Ray origin
 * @param {Array} edges - Edge metadata array
 * @param {THREE.Object3D} object - The object containing the edges
 * @param {number} threshold - Maximum distance threshold
 * @returns {Object|null} The closest edge and distance, or null if none found
 */
export function findClosestEdge(ray, origin, edges, object, threshold = 0.1) {
  const matrixWorld = object.matrixWorld;
  const inverseMatrix = new THREE.Matrix4().copy(matrixWorld).invert();
  
  // Transform ray to object space
  const localRay = ray.clone().applyMatrix4(inverseMatrix);
  const localOrigin = origin.clone().applyMatrix4(inverseMatrix);
  
  let closestEdge = null;
  let minDistanceSq = threshold * threshold;
  
  // Test each edge
  edges.forEach(edge => {
    const v1 = new THREE.Vector3().fromBufferAttribute(
      object.geometry.attributes.position,
      edge.v1
    );
    const v2 = new THREE.Vector3().fromBufferAttribute(
      object.geometry.attributes.position,
      edge.v2
    );
    
    // Transform to world space
    v1.applyMatrix4(matrixWorld);
    v2.applyMatrix4(matrixWorld);
    
    // Find closest point on edge to ray
    const [pointOnRay, pointOnEdge] = [new THREE.Vector3(), new THREE.Vector3()];
    const distanceSq = localRay.distanceSqToSegment(
      v1, v2, pointOnRay, pointOnEdge
    );
    
    if (distanceSq < minDistanceSq) {
      minDistanceSq = distanceSq;
      closestEdge = {
        ...edge,
        distance: Math.sqrt(distanceSq),
        point: pointOnEdge.clone()
      };
    }
  });
  
  return closestEdge;
}

/**
 * Gets the face ID for a given triangle index
 * @param {THREE.BufferGeometry} geometry - The geometry
 * @param {number} triangleIndex - The triangle index to look up
 * @returns {string|null} The face ID or null if not found
 */
export function getFaceIdFromTriangle(geometry, triangleIndex) {
  if (!triangleToFaceMap.has(geometry)) {
    console.warn('No face mapping found for geometry. Call analyzeGeometry first.');
    return null;
  }
  return triangleToFaceMap.get(geometry).get(triangleIndex) || null;
}

/**
 * Analyzes a geometry and extracts face and edge metadata
 * @param {THREE.BufferGeometry} geometry - The geometry to analyze
 * @returns {Object} Metadata containing faces and edges information
 */
export function analyzeGeometry(geometry) {
  if (!geometry.attributes.position) {
    throw new Error('Geometry must have position attributes');
  }

  const position = geometry.attributes.position;
  const index = geometry.index ? geometry.index.array : null;
  const faces = [];
  const edgeMap = new Map();
  
  // Helper to create a unique edge key
  const edgeKey = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;
  
  // Process geometry groups or treat as a single group
  const groups = geometry.groups && geometry.groups.length > 0
    ? geometry.groups
    : [{ start: 0, count: index ? index.length : position.count }];
  
  let faceIndex = 0;
  
  groups.forEach((group, groupIndex) => {
    const triangleStart = group.start / 3;
    const triangleCount = group.count / 3;
    const triangleIndices = [];
    
    // Collect triangle indices for this face
    for (let t = 0; t < triangleCount; t++) {
      triangleIndices.push(triangleStart + t);
    }
    
    // Calculate face normal and area using the first triangle
    let normal = new THREE.Vector3();
    let area = 0;
    const center = new THREE.Vector3();
    
    if (index) {
      const i0 = index[group.start];
      const i1 = index[group.start + 1];
      const i2 = index[group.start + 2];
      
      const v0 = new THREE.Vector3().fromBufferAttribute(position, i0);
      const v1 = new THREE.Vector3().fromBufferAttribute(position, i1);
      const v2 = new THREE.Vector3().fromBufferAttribute(position, i2);
      
      // Calculate normal
      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      normal.crossVectors(edge1, edge2).normalize();
      
      // Calculate area
      area = edge1.cross(edge2).length() / 2;
      
      // Calculate center
      center.add(v0).add(v1).add(v2).divideScalar(3);
    }
    
    const face = {
      id: `f${faceIndex++}`,
      groupIndex: groupIndex,
      triangleIndices,
      normal: normal.toArray(),
      area,
      center: center.toArray()
    };
    
    faces.push(face);
    
    // Process edges for this face
    if (index) {
      const triangleCountInGroup = group.count / 3;
      
      for (let i = 0; i < triangleCountInGroup; i++) {
        const base = group.start + i * 3;
        const i0 = index[base];
        const i1 = index[base + 1];
        const i2 = index[base + 2];
        
        // Process each edge of the triangle
        [
          [i0, i1],
          [i1, i2],
          [i2, i0]
        ].forEach(([a, b]) => {
          const key = edgeKey(a, b);
          
          if (!edgeMap.has(key)) {
            const p1 = new THREE.Vector3().fromBufferAttribute(position, a);
            const p2 = new THREE.Vector3().fromBufferAttribute(position, b);
            
            edgeMap.set(key, {
              id: `e${edgeMap.size}`,
              v1: a,
              v2: b,
              length: p1.distanceTo(p2),
              center: new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5),
              faceIds: new Set([face.id])
            });
          } else {
            // Add this face to the edge's face set
            edgeMap.get(key).faceIds.add(face.id);
          }
        });
      }
    }
  });
  
  // Convert edge map to array
  const edges = Array.from(edgeMap.values()).map(edge => ({
    ...edge,
    faceIds: Array.from(edge.faceIds)
  }));
  
  // Build triangle to face mapping
  const triangleMap = buildTriangleToFaceMap(faces);
  triangleToFaceMap.set(geometry, triangleMap);
  
  return { faces, edges };
}