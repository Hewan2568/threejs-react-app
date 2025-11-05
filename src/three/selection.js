// src/core/selection.js
import * as THREE from 'three';

export class SelectionManager {
constructor(sceneManager) {
  this.sceneManager = sceneManager;
  
  // Materials for different selection types
  this.highlightMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffff00,
    emissive: 0x444400,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  
  this.edgeMaterial = new THREE.LineBasicMaterial({ 
    color: 0x00ffff, 
    linewidth: 3,
    transparent: true,
    opacity: 0.8
  });
  
  this.faceMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  });
  
  // Selection state
  this.edgeThreshold = 0.2; // Distance threshold for edge selection
  this.mouse = new THREE.Vector2();
  this.raycaster = new THREE.Raycaster();
}
handlePointerDown(event, raycaster) {
  // Update the raycaster with the mouse position
  this.updateRaycaster(event, raycaster);
  
  // Find intersections
  const intersects = raycaster.intersectObjects(this.sceneManager.scene.children, true);
  
  if (intersects.length > 0) {
    const intersection = intersects[0];
    
    // Check for edge selection first (hold Shift for edge selection)
    if (event.shiftKey) {
      const edge = this.findClosestEdge(intersection);
      if (edge) {
        this.selectObject(intersection.object, null, edge);
        return;
      }
    }
    
    // Check for face selection (hold Ctrl for face selection)
    if (event.ctrlKey) {
      const faceIndex = this.findClosestFace(intersection);
      if (faceIndex !== null) {
        this.selectObject(intersection.object, faceIndex, null);
        return;
      }
    }
    
    // Default to object selection
    this.selectObject(intersection.object);
  } else {
    // Clicked on empty space, deselect
    this.deselect();
  }
}
// Find the closest edge to the intersection point
findClosestEdge(intersection, threshold = 0.1) {
  const { object, point } = intersection;
  const geometry = object.geometry;
  
  if (!geometry || !geometry.attributes.position) return null;
  
  // Get the position attribute
  const positionAttribute = geometry.attributes.position;
  const positions = positionAttribute.array;
  
  // Get the index of the closest vertex to the intersection point
  let closestVertexIndex = -1;
  let minDistance = Infinity;
  
  for (let i = 0; i < positions.length; i += 3) {
    const vertex = new THREE.Vector3(
      positions[i],
      positions[i + 1],
      positions[i + 2]
    );
    
    vertex.applyMatrix4(object.matrixWorld);
    const distance = point.distanceTo(vertex);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestVertexIndex = i / 3;
    }
  }
  
  if (closestVertexIndex === -1) return null;
  
  // Find edges connected to this vertex
  const edges = [];
  
  // For indexed geometry
  if (geometry.index) {
    const index = geometry.index.array;
    
    for (let i = 0; i < index.length; i += 3) {
      const a = index[i];
      const b = index[i + 1];
      const c = index[i + 2];
      
      if (a === closestVertexIndex || b === closestVertexIndex || c === closestVertexIndex) {
        if (a !== b) edges.push([Math.min(a, b), Math.max(a, b)]);
        if (b !== c) edges.push([Math.min(b, c), Math.max(b, c)]);
        if (c !== a) edges.push([Math.min(c, a), Math.max(c, a)]);
      }
    }
  } else {
    // For non-indexed geometry
    const count = positions.length / 3;
    for (let i = 0; i < count; i += 3) {
      const a = i;
      const b = i + 1;
      const c = i + 2;
      
      if (a === closestVertexIndex || b === closestVertexIndex || c === closestVertexIndex) {
        if (a !== b) edges.push([Math.min(a, b), Math.max(a, b)]);
        if (b !== c) edges.push([Math.min(b, c), Math.max(b, c)]);
        if (c !== a) edges.push([Math.min(c, a), Math.max(c, a)]);
      }
    }
  }
  
  // Remove duplicate edges
  const uniqueEdges = Array.from(new Set(edges.map(JSON.stringify))).map(JSON.parse);
  
  // Find the closest edge
  let closestEdge = null;
  minDistance = threshold;
  
  for (const edge of uniqueEdges) {
    const v1 = new THREE.Vector3(
      positions[edge[0] * 3],
      positions[edge[0] * 3 + 1],
      positions[edge[0] * 3 + 2]
    );
    
    const v2 = new THREE.Vector3(
      positions[edge[1] * 3],
      positions[edge[1] * 3 + 1],
      positions[edge[1] * 3 + 2]
    );
    
    v1.applyMatrix4(object.matrixWorld);
    v2.applyMatrix4(object.matrixWorld);
    
    const edgeCenter = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
    const distance = point.distanceTo(edgeCenter);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestEdge = edge;
    }
  }
  
  return closestEdge;
}

// Find the closest face to the intersection point
findClosestFace(intersection) {
  const { face } = intersection;
  if (!face) return null;
  
  // For indexed geometry, the face index is faceIndex
  if (intersection.object.geometry.index) {
    return intersection.faceIndex;
  }
  
  // For non-indexed geometry, calculate the face index
  return Math.floor(intersection.faceIndex / 2);
}

// Update raycaster with current mouse position
updateRaycaster(event, raycaster) {
  const rect = this.renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  this.mouse.set(x, y);
  raycaster.setFromCamera(this.mouse, this.camera);
}
  selectObject(object, faceIndex = null, edge = null) {
    if (!object) {
      this.deselect();
      return;
    }

    // Clear previous selection
    this.deselect();

    // Update selection
    this.selection = {
      object,
      type: edge ? 'edge' : (faceIndex !== null ? 'face' : 'object'),
      faceIndex,
      edge,
      originalMaterial: object.material,
      originalFaceMaterials: {}
    };

    // Apply highlighting
    if (edge) {
      this.highlightEdge(edge);
    } else if (faceIndex !== null) {
      this.highlightFace(faceIndex);
    } else {
      this.highlightObject();
    }

    // Update transform controls
    this.sceneManager.updateTransformControls();
  }

  highlightObject() {
    const { object } = this.selection;
    if (!object) return;

    if (object.material instanceof Array) {
      // Handle multi-material objects
      object.material = object.material.map(mat => {
        const highlightMat = this.highlightMaterial.clone();
        highlightMat.map = mat.map;
        return highlightMat;
      });
    } else {
      const highlightMat = this.highlightMaterial.clone();
      highlightMat.map = object.material.map;
      object.material = highlightMat;
    }
  }

  highlightFace(faceIndex) {
    const { object } = this.selection;
    if (!object || !object.userData.faceMap) return;

    const face = object.userData.faceMap[faceIndex];
    if (!face) return;

    if (object.material instanceof Array) {
      const matIndex = face.materialIndex;
      this.selection.originalFaceMaterials[matIndex] = object.material[matIndex].clone();
      
      const highlightMat = this.highlightMaterial.clone();
      highlightMat.side = THREE.DoubleSide;
      highlightMat.map = object.material[matIndex]?.map;
      
      const newMaterials = [...object.material];
      newMaterials[matIndex] = highlightMat;
      object.material = newMaterials;
    }
  }

highlightEdge(edge) {
  const { object } = this.selection;
  if (!object || !edge) return;

  // Remove any existing edge highlight
  if (object.userData.edgeHighlight) {
    object.remove(object.userData.edgeHighlight);
    object.userData.edgeHighlight.geometry.dispose();
  }

  // Create a new edge highlight
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const positionAttribute = object.geometry.attributes.position;

  // Get the edge vertices
  const v1 = new THREE.Vector3().fromBufferAttribute(positionAttribute, edge[0]);
  const v2 = new THREE.Vector3().fromBufferAttribute(positionAttribute, edge[1]);

  positions.push(v1.x, v1.y, v1.z);
  positions.push(v2.x, v2.y, v2.z);

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  
  const line = new THREE.Line(geometry, this.edgeMaterial);
  object.userData.edgeHighlight = line;
  object.add(line);
}

highlightFace(faceIndex) {
  const { object } = this.selection;
  if (!object || faceIndex === null || !object.geometry.attributes.position) return;

  // Remove any existing face highlight
  if (object.userData.faceHighlight) {
    object.remove(object.userData.faceHighlight);
    object.userData.faceHighlight.geometry.dispose();
  }

  const geometry = object.geometry;
  const positionAttribute = geometry.attributes.position;
  const index = geometry.index || new THREE.BufferAttribute(
    new Uint16Array(geometry.attributes.position.count), 
    1
  );

  // Get the face vertices
  const a = index.getX(faceIndex * 3);
  const b = index.getX(faceIndex * 3 + 1);
  const c = index.getX(faceIndex * 3 + 2);

  const positions = [];
  positions.push(
    positionAttribute.getX(a), positionAttribute.getY(a), positionAttribute.getZ(a),
    positionAttribute.getX(b), positionAttribute.getY(b), positionAttribute.getZ(b),
    positionAttribute.getX(c), positionAttribute.getY(c), positionAttribute.getZ(c)
  );

  const faceGeometry = new THREE.BufferGeometry();
  faceGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  faceGeometry.setIndex([0, 1, 2]);

  const faceMesh = new THREE.Mesh(faceGeometry, this.faceMaterial);
  faceMesh.renderOrder = 1; // Ensure it renders on top
  object.userData.faceHighlight = faceMesh;
  object.add(faceMesh);
}

highlightObject() {
  const { object } = this.selection;
  if (!object) return;

  // Store original material if not already stored
  if (!this.originalMaterial) {
    this.originalMaterial = object.material;
  }

  // Apply highlight material
  if (object.material instanceof Array) {
    // Handle multi-material objects
    object.material = object.material.map(mat => {
      const highlightMat = this.highlightMaterial.clone();
      highlightMat.map = mat.map;
      return highlightMat;
    });
  } else {
    const highlightMat = this.highlightMaterial.clone();
    highlightMat.map = object.material.map;
    object.material = highlightMat;
  }
}

deselect() {
  const { object } = this.selection;
  if (!object) return;

  // Restore original materials
  if (this.selection.originalMaterial) {
    if (Array.isArray(this.selection.originalMaterial)) {
      Object.entries(this.selection.originalFaceMaterials).forEach(([index, material]) => {
        object.material[parseInt(index)] = material;
      });
    } else {
      object.material = this.selection.originalMaterial;
    }
  }

  // Clean up edge highlight
  if (object.userData.edgeHighlight) {
    object.remove(object.userData.edgeHighlight);
    object.userData.edgeHighlight.geometry.dispose();
    delete object.userData.edgeHighlight;
  }

  // Clean up face highlight
  if (object.userData.faceHighlight) {
    object.remove(object.userData.faceHighlight);
    object.userData.faceHighlight.geometry.dispose();
    delete object.userData.faceHighlight;
  }

  // Reset selection
  this.selection = {
    object: null,
    type: null,
    faceIndex: null,
    edge: null,
    originalMaterial: null,
    originalFaceMaterials: {}
  };
}
  get currentSelection() {
    return this.selection;
  }
}