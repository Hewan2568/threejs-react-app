import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';

// Simple function to get TransformControls
const getTransformControls = async () => {
  try {
    if (typeof TransformControls === 'function') {
      return TransformControls;
    }
    
    // If we're here, the import might have failed, try dynamic import
    const module = await import('three/examples/jsm/controls/TransformControls');
    return module.TransformControls || module.default;
  } catch (error) {
    console.error('Failed to load TransformControls:', error);
    return null;
  }
};

const transformControlsPromise = getTransformControls();

import { buildEdgesFromGeometry, triangleToFaceMapFromGeometry } from './primitives';
import { SketchMode } from './SketchMode';

const SKETCH_MODES = {
  NONE: 'none',
  RECTANGLE: 'sketch-rect',
  CIRCLE: 'sketch-circle'
};

export default class SceneManager {
  constructor({ scene, camera, renderer, domElement }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.domElement = domElement;
    
    // Selection and highlighting
    this.edgeThreshold = 0.1;
    this.highlightedFace = null;
    this.highlightedEdge = null;
    this.defaultMaterial = null;
    this.selected = { type: null, id: null };
    this.objects = new Map(); // id -> metadata
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.highlighted = null;
    this.highlightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffff00,
      emissive: 0x444400,
      emissiveIntensity: 0.5
    });
    this.defaultMaterials = new WeakMap();
    
    // Sketch mode properties
    this.sketchMode = SKETCH_MODES.NONE;
    this.sketchStartPoint = null;
    this.sketchPreview = null;
    this.drawPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // XZ plane at y=0
    this.gridSize = 0.5; // Size of grid for snap-to-grid
    
    // Initialize transform controls
    this.transformControls = null;
    this.currentTransformMode = 'translate';
    
    // Store the camera and domElement for later use
    this._camera = camera;
    this._domElement = domElement;
    
    // Initialize sketch mode
    this.sketchMode = new SketchMode(this);
    
    // Add keyboard event listeners
    this.onKeyDown = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.onKeyDown);
    
    // Bind methods
    this.render = this.render.bind(this);
    this.dispose = this.dispose.bind(this);
    
    // Setup transform controls in the next tick to ensure everything is ready
    this.initializeTransformControls();
  }
  
  async initializeTransformControls() {
    try {
      // Wait for the next frame to ensure everything is ready
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Try to set up transform controls
      const success = await this.setupTransformControls();
      
      // If setup failed, retry after a delay
      if (!success) {
        console.warn('Retrying transform controls initialization...');
        setTimeout(() => this.initializeTransformControls(), 1000);
      }
    } catch (error) {
      console.error('Error in initializeTransformControls:', error);
      // Retry after a delay
      setTimeout(() => this.initializeTransformControls(), 1000);
    }
  }
  
  async setupTransformControls() {
    // Check for required dependencies
    if (!this.scene || !this._camera || !this._domElement) {
      console.warn('Scene, camera, or DOM element not available for TransformControls');
      return false;
    }

    try {
      // Clean up existing controls
      if (this.transformControls) {
        this.scene.remove(this.transformControls);
        if (typeof this.transformControls.dispose === 'function') {
          this.transformControls.dispose();
        }
        this.transformControls = null;
      }

      // Get TransformControls constructor
      const TC = await transformControlsPromise;
      if (!TC) {
        throw new Error('Failed to load TransformControls');
      }

      // Create and configure new transform controls
      this.transformControls = new TC(this._camera, this._domElement);
      
      // Add to scene first (some versions of TransformControls need this)
      this.scene.add(this.transformControls);
      
      // Configure transform controls
      if (typeof this.transformControls.setMode === 'function') {
        this.transformControls.setMode(this.currentTransformMode || 'translate');
      }
      
      if (typeof this.transformControls.enabled !== 'undefined') {
        this.transformControls.enabled = true;
      }
      
      // Set up event listeners
      if (this.controls) {
        this.transformControls.addEventListener('dragging-changed', (event) => {
          // Disable orbit controls when transforming
          if (this.controls) {
            this.controls.enabled = !event.value;
          }
        });
      }
      
      // Add object change listener
      this.transformControls.addEventListener('objectChange', () => {
        if (this.transformControls?.object) {
          this.transformControls.object.updateMatrixWorld();
        }
      });
      
      console.log('TransformControls initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Error initializing TransformControls:', error);
      // Retry after a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.setupTransformControls();
    }
  }
  
  // Keyboard event handler
  onKeyDown(event) {
    if (!this.transformControls) {
      // Try to initialize transform controls if they're not available
      this.setupTransformControls();
      if (!this.transformControls) return;
    }
    
    switch (event.key.toLowerCase()) {
      case 'w':
        this.currentTransformMode = 'translate';
        break;
      case 'e':
        this.currentTransformMode = 'rotate';
        break;
      case 'r':
        this.currentTransformMode = 'scale';
        break;
      default:
        return; // Skip if not a transform mode key
    }
    
    this.transformControls.setMode(this.currentTransformMode);
  }
  
  // Object selection methods
  selectObject(object) {
    if (!object) {
      this.deselectObject();
      return;
    }
    
    // If we have a previously selected object, reset its material
    if (this.selected.object) {
      this.deselectObject();
    }
    
    // Store the selected object
    this.selected.object = object;
    this.selected.originalMaterial = object.material;
    
    // Apply highlight material
    object.material = this.highlightMaterial;
    
    // Attach to transform controls
    if (this.transformControls) {
      this.transformControls.attach(object);
      this.transformControls.setMode(this.currentTransformMode);
    }
  }
  
  deselectObject() {
    if (!this.selected.object) return;
    
    // Restore original material
    if (this.selected.originalMaterial) {
      this.selected.object.material = this.selected.originalMaterial;
    }
    
    // Detach from transform controls
    if (this.transformControls) {
      this.transformControls.detach();
    }
    
    // Clear selection
    this.selected.object = null;
    this.selected.originalMaterial = null;
  }
  
  // Cleanup method
  dispose() {
    // Remove event listeners
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    
    // Clean up transform controls
    if (this.transformControls) {
      this.scene.remove(this.transformControls);
      this.transformControls.dispose();
    }
    
    // Clean up other resources
    if (this.sketchMode && this.sketchMode.dispose) {
      this.sketchMode.dispose();
    }
  }
  
  // Pointer event handlers
  onPointerDown(event) {
    // Skip if transform controls are in use
    if (this.transformControls?.dragging) return;
    
    const rect = this.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update the mouse position
    this.mouse.x = x;
    this.mouse.y = y;
    
    // Update the raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Check for object intersections
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0) {
      // Find the first non-helper object that was clicked
      const clickedObject = intersects.find(item => 
        !item.object.isTransformControls && 
        !item.object.isGridHelper &&
        item.object.visible
      );
      
      if (clickedObject) {
        // If the same object is clicked again, deselect it
        if (this.selected.object === clickedObject.object) {
          this.deselectObject();
        } else {
          // Select the clicked object
          this.selectObject(clickedObject.object);
        }
        return;
      }
    }
    
    // If we get here, we clicked on empty space - deselect any selected object
    this.deselectObject();
    
    // Handle sketch mode if active
    if (this.sketchMode !== SKETCH_MODES.NONE) {
      const intersection = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.drawPlane, intersection)) {
        // Snap to grid
        this.sketchStartPoint = new THREE.Vector3(
          Math.round(intersection.x / this.gridSize) * this.gridSize,
          0,
          Math.round(intersection.z / this.gridSize) * this.gridSize
        );
      }
    }
  }

  onPointerMove(event) {
    if (this.sketchMode !== SKETCH_MODES.NONE && this.sketchStartPoint) {
      const rect = this.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera({ x, y }, this.camera);
      
      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(this.drawPlane, intersection)) {
        // Snap to grid
        const endPoint = new THREE.Vector3(
          Math.round(intersection.x / this.gridSize) * this.gridSize,
          0,
          Math.round(intersection.z / this.gridSize) * this.gridSize
        );
        
        this.updateSketchPreview(endPoint);
      }
    }
  }

  onPointerUp(event) {
    if (this.sketchMode !== SKETCH_MODES.NONE && this.sketchStartPoint) {
      const rect = this.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera({ x, y }, this.camera);
      
      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(this.drawPlane, intersection)) {
        // Snap to grid
        const endPoint = new THREE.Vector3(
          Math.round(intersection.x / this.gridSize) * this.gridSize,
          0,
          Math.round(intersection.z / this.gridSize) * this.gridSize
        );
        
        this.completeSketch(endPoint);
      }
      
      this.cleanupSketch();
    }
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  
  updateSketchPreview(endPoint) {
    // Implementation of updateSketchPreview
    if (this.sketchPreview) {
      this.scene.remove(this.sketchPreview);
      this.sketchPreview.geometry.dispose();
    }
    
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    
    const points = [];
    points.push(this.sketchStartPoint);
    points.push(new THREE.Vector3(endPoint.x, 0, this.sketchStartPoint.z));
    points.push(endPoint);
    points.push(new THREE.Vector3(this.sketchStartPoint.x, 0, endPoint.z));
    points.push(this.sketchStartPoint);
    
    geometry.setFromPoints(points);
    this.sketchPreview = new THREE.Line(geometry, material);
    this.scene.add(this.sketchPreview);
  }
  
  completeSketch(endPoint) {
    // Create the final shape based on sketch mode
    if (this.sketchMode === SKETCH_MODES.RECTANGLE) {
      this.createBox({
        width: Math.abs(endPoint.x - this.sketchStartPoint.x) || 1,
        height: 0.1,
        depth: Math.abs(endPoint.z - this.sketchStartPoint.z) || 1,
        position: [
          (this.sketchStartPoint.x + endPoint.x) / 2,
          0.05,
          (this.sketchStartPoint.z + endPoint.z) / 2
        ]
      });
    }
    // Add other shape types (circle, etc.) here
  }
  
  cleanupSketch() {
    if (this.sketchPreview) {
      this.scene.remove(this.sketchPreview);
      this.sketchPreview.geometry.dispose();
      this.sketchPreview = null;
    }
    this.sketchStartPoint = null;
  }
  
  // Set the current sketch mode
  setSketchMode(mode) {
    if (mode === SKETCH_MODES.NONE) {
      this.sketchMode.disable();
    } else {
      this.sketchMode.enable(mode);
    }
  }
  
  // Add an object to the scene manager
  addObject({ mesh, type, params = {} }) {
    // Validate input
    if (!mesh || !(mesh instanceof THREE.Object3D)) {
      console.error('Invalid mesh provided to addObject. Expected a THREE.Object3D instance.');
      return null;
    }

    try {
      // Add the mesh to the scene if it's not already added
      if (mesh.parent !== this.scene) {
        this.scene.add(mesh);
      }

      const id = mesh.uuid;
      const meta = {
        id,
        mesh,
        type,
        params,
        faces: mesh.geometry ? triangleToFaceMapFromGeometry(mesh.geometry) : {},
        edges: mesh.geometry ? buildEdgesFromGeometry(mesh.geometry) : []
      };
      
      this.objects.set(id, meta);
      return meta;
    } catch (error) {
      console.error('Error adding object to scene:', error);
      return null;
    }
  }

  addBox({ width = 1, height = 1, depth = 1, name = 'Box', position = [0, 0, 0] }) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x8888ff,
      metalness: 0.3,
      roughness: 0.8 
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.name = name;
    this.scene.add(mesh);
    
    const id = mesh.uuid;
    const meta = {
      id,
      mesh,
      type: 'Box',
      params: { width, height, depth },
      faces: triangleToFaceMapFromGeometry(geometry),
      edges: buildEdgesFromGeometry(geometry)
    };
    this.objects.set(id, meta);
    return meta;
  }

  addSphere({ radius = 1, widthSegments = 32, heightSegments = 16, name = 'Sphere', position = [0, 0, 0] }) {
    const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xff8888,
      metalness: 0.3,
      roughness: 0.4 
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.name = name;
    this.scene.add(mesh);
    
    const id = mesh.uuid;
    const meta = {
      id,
      mesh,
      type: 'Sphere',
      params: { radius, widthSegments, heightSegments },
      faces: triangleToFaceMapFromGeometry(geometry),
      edges: buildEdgesFromGeometry(geometry)
    };
    this.objects.set(id, meta);
    return meta;
  }

  addCylinder({ 
    radiusTop = 1, 
    radiusBottom = 1, 
    height = 2, 
    radialSegments = 16, 
    name = 'Cylinder',
    position = [0, 0, 0] 
  } = {}) {
    const geometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      radialSegments
    );
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x88ff88,
      metalness: 0.2,
      roughness: 0.7
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.name = name;
    this.scene.add(mesh);
    
    const id = mesh.uuid;
    const meta = {
      id,
      mesh,
      type: 'Cylinder',
      params: { radiusTop, radiusBottom, height, radialSegments },
      faces: triangleToFaceMapFromGeometry(geometry),
      edges: buildEdgesFromGeometry(geometry)
    };
    this.objects.set(id, meta);
    return meta;
  }

  addExtrude(shape, settings = {}) {
    const { 
      amount = 1, 
      bevelEnabled = true, 
      bevelThickness = 0.1, 
      bevelSize = 0.1,
      name = 'Extruded',
      position = [0, 0, 0]
    } = settings;

    const extrudeSettings = {
      steps: 2,
      depth: amount,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelSegments: 1
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x88ffff,
      metalness: 0.1,
      roughness: 0.8
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.name = name;
    this.scene.add(mesh);
    
    const id = mesh.uuid;
    const meta = {
      id,
      mesh,
      type: 'Extruded',
      params: { ...settings },
      faces: triangleToFaceMapFromGeometry(geometry),
      edges: buildEdgesFromGeometry(geometry)
    };
    this.objects.set(id, meta);
    return meta;
  }

  buildFaceEdgeMetadata(mesh) {
    if (!mesh || !mesh.geometry) return null;
    
    const geometry = mesh.geometry;
    
    // Ensure we have position data
    if (!geometry.attributes.position) {
      console.warn('Mesh geometry has no position data');
      return null;
    }
    
    // Compute vertex normals if not present
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }
    
    // Generate face and edge data
    const faceMap = triangleToFaceMapFromGeometry(geometry);
    const edges = buildEdgesFromGeometry(geometry);
    
    // Store the original vertices for later reference
    const vertices = [];
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      vertices.push(new THREE.Vector3().fromBufferAttribute(positions, i));
    }
    
    return {
      faces: faceMap,
      edges,
      vertices
    };
  }

  raycast(clientX, clientY) {
    const rect = this.domElement.getBoundingClientRect();
    
    // Convert mouse position to normalized device coordinates
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update the raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Get all selectable objects
    const pickables = Array.from(this.objects.values())
      .filter(obj => obj.mesh && obj.mesh.visible)
      .map(obj => obj.mesh);
    
    // Get all intersections
    const intersects = this.raycaster.intersectObjects(pickables, true);
    
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const object = intersect.object;
      const objectMeta = this.objects.get(object.uuid);
      
      if (objectMeta) {
        // If Shift is pressed, try to select an edge
        if (this.inputManager.isKeyDown('Shift')) {
          const edge = this.findClosestEdge(object, intersect.point, objectMeta);
          if (edge) {
            return { 
              type: 'edge', 
              object, 
              edge, 
              point: intersect.point, 
              objectMeta 
            };
          }
        }
        
        // If Ctrl is pressed, try to select a face
        if (this.inputManager.isKeyDown('Control') || this.inputManager.isKeyDown('Meta')) {
          if (intersect.face) {
            return { 
              type: 'face', 
              object, 
              faceIndex: intersect.faceIndex, 
              point: intersect.point, 
              objectMeta 
            };
          }
        }
        
        // Default to object selection
        return { 
          type: 'object', 
          object, 
          point: intersect.point, 
          objectMeta 
        };
      }
    }
    
    // Return null if no intersection
    return null;
  }

raycastEdges(clientX, clientY) {
  // This is a simplified version - you might need to implement a more accurate edge detection
  const rect = this.domElement.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;
  
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera({ x, y }, this.camera);
  
  // Check all objects for edge intersections
  for (const [id, meta] of this.objects.entries()) {
    const edges = meta.edges || [];
    
    for (const edge of edges) {
      const distance = this.distanceToEdge(raycaster.ray, edge, meta.mesh);
      if (distance < this.edgeThreshold) {
        return {
          object: meta.mesh,
          objectMeta: meta,
          point: this.getClosestPointOnEdge(raycaster.ray, edge, meta.mesh),
          edge: edge,
          distance: distance
        };
      }
    }
  }
  
  return null;
}
distanceToEdge(ray, edge, object) {
  // Convert edge points to world space
  const start = new THREE.Vector3().copy(edge.start).applyMatrix4(object.matrixWorld);
  const end = new THREE.Vector3().copy(edge.end).applyMatrix4(object.matrixWorld);
  
  // Create a line segment
  const line = new THREE.Line3(start, end);
  
  // Find closest point on the line to the ray
  const closestPoint = new THREE.Vector3();
  ray.closestPointToLine(line, closestPoint);
  
  // Return distance from ray origin to closest point
  return ray.origin.distanceTo(closestPoint);
}

findClosestEdge(object, point, objectMeta) {
    const metadata = object.userData.metadata || this.buildFaceEdgeMetadata(object);
    if (!metadata || !metadata.edges || !metadata.vertices) return null;
    
    // Convert world point to object's local space
    const matrixWorld = object.matrixWorld;
    const inverseMatrix = new THREE.Matrix4().getInverse(matrixWorld);
    const localPoint = point.clone().applyMatrix4(inverseMatrix);
    
    const edges = metadata.edges;
    const vertices = metadata.vertices;
    const threshold = 0.1; // Threshold for edge selection
    
    let closestEdge = null;
    let closestDistance = Infinity;
    
    // Find the closest edge to the intersection point
    for (const edge of edges) {
      const start = vertices[edge[0]];
      const end = vertices[edge[1]];
      
      // Calculate the closest point on the edge to our intersection point
      const edgeVector = new THREE.Vector3().subVectors(end, start);
      const pointVector = new THREE.Vector3().subVectors(localPoint, start);
      const edgeLength = edgeVector.length();
      const edgeDirection = edgeVector.normalize();
      
      // Project the point onto the edge
      let t = pointVector.dot(edgeDirection);
      t = Math.max(0, Math.min(edgeLength, t));
      
      const closestPoint = new THREE.Vector3().copy(start).add(
        edgeDirection.multiplyScalar(t)
      );
      
      // Calculate distance from point to closest point on edge
      const distance = localPoint.distanceTo(closestPoint);
      
      // Update closest edge if this one is closer
      if (distance < threshold && distance < closestDistance) {
        closestDistance = distance;
        closestEdge = edge;
      }
    }
    
    return closestEdge;
  }

  handleSelection(intersect) {
    if (!intersect) {
      this.clearSelection();
      return;
    }

    this.clearSelection();
    this.selected = { type: intersect.type, id: intersect.meta.id };

    switch (intersect.type) {
      case 'face':
        this.highlightFace(intersect.meta, intersect.faceId);
        break;
      case 'edge':
        this.highlightEdge(intersect.meta, intersect.edge);
        break;
      case 'shape':
        this.highlightShape(intersect.meta.mesh);
        break;
    }
  }

  selectShape(meta) {
    this.clearSelection();
    this.selected = { type: 'shape', id: meta.id };
    this.highlightShape(meta.mesh);
  }

  highlightShape(mesh) {
    if (this.highlighted) {
      const prevMesh = this.highlighted;
      const prevMaterial = this.defaultMaterials.get(prevMesh);
      if (prevMaterial) {
        prevMesh.material = prevMaterial;
      }
    }

    if (mesh) {
      this.defaultMaterials.set(mesh, mesh.material);
      const highlightMaterial = mesh.material.clone();
      highlightMaterial.emissive.set(0x444400);
      highlightMaterial.emissiveIntensity = 0.5;
      mesh.material = highlightMaterial;
      this.highlighted = mesh;
    } else {
      this.highlighted = null;
    }
  }

  highlightFace(meta, faceId) {
    if (!meta || !faceId) {
      if (this.highlightedFace) {
        this.scene.remove(this.highlightedFace);
        this.highlightedFace = null;
      }
      return;
    }

    const geometry = meta.mesh.geometry;
    const index = geometry.index;
    const position = geometry.attributes.position;
    const indices = [];

    // Find all triangles that belong to this face
    Object.entries(meta.faces).forEach(([triIndex, face]) => {
      if (face.faceId === faceId) {
        const i = parseInt(triIndex) * 3;
        if (index) {
          indices.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
        } else {
          indices.push(i, i + 1, i + 2);
        }
      }
    });

    if (indices.length === 0) return;

    // Create a new geometry for the highlighted face
    const faceGeometry = new THREE.BufferGeometry();
    const vertices = [];
    const normals = [];

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      vertices.push(
        position.getX(idx),
        position.getY(idx),
        position.getZ(idx)
      );
      
      // Calculate face normal
      if (i % 3 === 0) {
        const i0 = i, i1 = i + 1, i2 = i + 2;
        const p1 = new THREE.Vector3(
          position.getX(indices[i0]),
          position.getY(indices[i0]),
          position.getZ(indices[i0])
        );
        const p2 = new THREE.Vector3(
          position.getX(indices[i1]),
          position.getY(indices[i1]),
          position.getZ(indices[i1])
        );
        const p3 = new THREE.Vector3(
          position.getX(indices[i2]),
          position.getY(indices[i2]),
          position.getZ(indices[i2])
        );
        
        const normal = new THREE.Vector3()
          .crossVectors(
            new THREE.Vector3().subVectors(p2, p1),
            new THREE.Vector3().subVectors(p3, p1)
          )
          .normalize();
          
        // Add the same normal for all three vertices of the triangle
        normals.push(normal.x, normal.y, normal.z);
        normals.push(normal.x, normal.y, normal.z);
        normals.push(normal.x, normal.y, normal.z);
      }
    }

    faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    faceGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    
    // Create a semi-transparent material for the highlighted face
    const material = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    // Create and position the highlight mesh
    const highlightMesh = new THREE.Mesh(faceGeometry, material);
    highlightMesh.matrix.copy(meta.mesh.matrixWorld);
    highlightMesh.matrix.decompose(
      highlightMesh.position,
      highlightMesh.quaternion,
      highlightMesh.scale
    );
    
    // Remove any existing highlight
    if (this.highlightedFace) {
      this.scene.remove(this.highlightedFace);
    }
    
    this.highlightedFace = highlightMesh;
    this.scene.add(highlightMesh);
  }

  highlightEdge(object, edge, objectMeta) {
    // Handle null/undefined edge case
    if (!edge) {
      if (this.highlightedEdge) {
        this.scene.remove(this.highlightedEdge);
        if (this.highlightedEdge.geometry) this.highlightedEdge.geometry.dispose();
        if (this.highlightedEdge.material) this.highlightedEdge.material.dispose();
        this.highlightedEdge = null;
      }
      return;
    }

    // Clear previous edge highlight
    this.clearHighlight();

    // Use objectMeta if provided, otherwise use object
    const mesh = objectMeta?.mesh || object;
    if (!mesh || !mesh.geometry) return;

    const geometry = mesh.geometry;
    const position = geometry.attributes.position;
    
    // Create a highlight material for edges
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xff0000,
      linewidth: 4
    });
    
    // Create geometry for the edge
    let edgeGeometry;
    
    if (edge.v1 !== undefined && edge.v2 !== undefined) {
      // Handle edge defined by vertex indices
      const v1 = new THREE.Vector3().fromBufferAttribute(position, edge.v1);
      const v2 = new THREE.Vector3().fromBufferAttribute(position, edge.v2);
      edgeGeometry = new THREE.BufferGeometry().setFromPoints([v1, v2]);
    } else if (edge.start && edge.end) {
      // Handle edge defined by start/end points
      edgeGeometry = new THREE.BufferGeometry().setFromPoints([
        edge.start,
        edge.end
      ]);
    } else {
      console.error('Invalid edge format:', edge);
      return;
    }
    
    // Create and add the highlight line
    this.highlightedEdge = new THREE.Line(edgeGeometry, edgeMaterial);
    
    // Apply the mesh's transformation if available
    if (mesh.matrixWorld) {
      this.highlightedEdge.matrix.copy(mesh.matrixWorld);
      this.highlightedEdge.matrix.decompose(
        this.highlightedEdge.position,
        this.highlightedEdge.quaternion,
        this.highlightedEdge.scale
      );
    }
    
    this.scene.add(this.highlightedEdge);
  }

  clearSelection() {
    if (this.selected) {
      this.selected = null;
      this.highlightShape(null);
      this.highlightFace(null, null);
      this.highlightEdge(null, null);
    }
  }

  exportScene() {
    const sceneData = {
      objects: [],
      metadata: {
        version: '1.0',
        generator: 'SceneManager',
        type: 'scene',
        date: new Date().toISOString()
      }
    };

    this.objects.forEach(meta => {
      const object = meta.mesh;
      const objectData = {
        type: meta.type,
        name: object.name,
        uuid: object.uuid,
        position: object.position.toArray(),
        rotation: object.rotation.toArray(),
        scale: object.scale.toArray(),
        params: meta.params,
        userData: object.userData
      };
      sceneData.objects.push(objectData);
    });

    return JSON.stringify(sceneData, null, 2);
  }
// In SceneManager.js, add these methods:

handleSelection(intersect) {
  if (!intersect) {
    this.clearSelection();
    return;
  }

  const { object, point, face, objectMeta } = intersect;
  
  // Check if we clicked on a face or edge
  if (face) {
    this.handleFaceSelection(object, face, point, objectMeta);
  } else {
    this.handleEdgeSelection(object, point, objectMeta);
  }
}
highlightFace(object, face, objectMeta) {
  // Clear any existing highlights
  this.clearHighlight();
  
  // Create a highlight material
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  });
  
  // Store the original material
  this.defaultMaterial = object.material;
  
  // For face selection, we'll create a new mesh with just this face
  const geometry = new THREE.BufferGeometry();
  const positionAttribute = object.geometry.getAttribute('position');
  
  // Get the three vertices of the face
  const vertices = [
    new THREE.Vector3().fromBufferAttribute(positionAttribute, face.a),
    new THREE.Vector3().fromBufferAttribute(positionAttribute, face.b),
    new THREE.Vector3().fromBufferAttribute(positionAttribute, face.c)
  ];
  
  // Apply object's transform to the vertices
  const matrix = object.matrixWorld;
  vertices.forEach(v => v.applyMatrix4(matrix));
  
  // Create a new geometry for the highlighted face
  const faceGeometry = new THREE.BufferGeometry().setFromPoints(vertices);
  faceGeometry.setIndex([0, 1, 2]);
  
  // Create and add the highlight mesh
  this.highlightedFace = new THREE.Mesh(faceGeometry, highlightMaterial);
  this.scene.add(this.highlightedFace);
}

highlightEdge(object, edge, objectMeta) {
  // Clear any existing highlights
  this.clearHighlight();
  
  // Create a highlight material for edges
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 4
  });
  
  // Create geometry for the edge
  const edgeGeometry = new THREE.BufferGeometry().setFromPoints([
    edge.start,
    edge.end
  ]);
  
  // Create and add the highlight line
  this.highlightedEdge = new THREE.Line(edgeGeometry, edgeMaterial);
  this.scene.add(this.highlightedEdge);
}

clearHighlight() {
  // Remove face highlight
  if (this.highlightedFace) {
    this.scene.remove(this.highlightedFace);
    this.highlightedFace.geometry.dispose();
    this.highlightedFace.material.dispose();
    this.highlightedFace = null;
  }
  
  // Remove edge highlight
  if (this.highlightedEdge) {
    this.scene.remove(this.highlightedEdge);
    this.highlightedEdge.geometry.dispose();
    this.highlightedEdge.material.dispose();
    this.highlightedEdge = null;
  }
  
  // Restore original material if it exists
  if (this.defaultMaterial && this.selected?.object) {
    this.selected.object.material = this.defaultMaterial;
    this.defaultMaterial = null;
  }
}
handleFaceSelection(object, face, point, objectMeta) {
  // Clear previous selection
  this.clearSelection();
  
  // Store selection
  this.selected = {
    type: 'face',
    object,
    face,
    objectMeta,
    point
  };
  
  // Highlight the face
  this.highlightFace(object, face, objectMeta);
}

handleEdgeSelection(object, point, objectMeta) {
  // Find the closest edge
  const edge = this.findClosestEdge(object, point, objectMeta);
  if (!edge) return;
  
  // Clear previous selection
  this.clearSelection();
  
  // Store selection
  this.selected = {
    type: 'edge',
    object,
    edge,
    objectMeta,
    point
  };
  
  // Highlight the edge
  this.highlightEdge(object, edge, objectMeta);
}

findClosestEdge(object, point, objectMeta) {
  // Implementation for finding the closest edge to the click point
  // This is a simplified version - you might need to adjust based on your edge data structure
  const edges = objectMeta.edges || [];
  let closestEdge = null;
  let minDistance = this.edgeThreshold;
  
  for (const edge of edges) {
    const distance = this.distanceToEdge(point, edge, object);
    if (distance < minDistance) {
      minDistance = distance;
      closestEdge = edge;
    }
  }
  
  return closestEdge;
}
  importScene(json) {
    try {
      const sceneData = typeof json === 'string' ? JSON.parse(json) : json;
      
      if (!sceneData.objects || !Array.isArray(sceneData.objects)) {
        console.error('Invalid scene data format');
        return false;
      }

      // Clear existing objects
      this.objects.forEach(meta => {
        this.scene.remove(meta.mesh);
        if (meta.mesh.geometry) meta.mesh.geometry.dispose();
        if (meta.mesh.material) {
          if (Array.isArray(meta.mesh.material)) {
            meta.mesh.material.forEach(m => m.dispose());
          } else {
            meta.mesh.material.dispose();
          }
        }
      });
      this.objects.clear();

      // Import objects
      sceneData.objects.forEach(objData => {
        let meta;
        const position = objData.position || [0, 0, 0];
        
        switch (objData.type) {
          case 'Box':
            meta = this.addBox({ ...objData.params, name: objData.name, position });
            break;
          case 'Sphere':
            meta = this.addSphere({ ...objData.params, name: objData.name, position });
            break;
          case 'Cylinder':
            meta = this.addCylinder({ ...objData.params, name: objData.name, position });
            break;
          // Handle other types as needed
        }
        
        if (meta && objData.rotation) {
          meta.mesh.rotation.fromArray(objData.rotation);
        }
        if (meta && objData.scale) {
          meta.mesh.scale.fromArray(objData.scale);
        }
        if (meta && objData.userData) {
          meta.mesh.userData = objData.userData;
        }
      });

      return true;
    } catch (error) {
      console.error('Error importing scene:', error);
      return false;
    }
  }

attachTransformControl() {
  if (this.selected && this.selected.object) {
    this.transform.attach(this.selected.object);
    this.transform.visible = true;
  } else {
    this.detachTransformControl();
  }
}

detachTransformControl() {
  this.transform.detach();
  this.transform.visible = false;
}

// Call this after selection changes
updateTransformControls() {
  if (this.selected && this.selected.object) {
    this.attachTransformControl();
  } else {
    this.detachTransformControl();
  }
}

  setTransformMode(mode) {
    this.transform.setMode(mode); // 'translate', 'rotate', or 'scale'
  }

  dispose() {
    // Cleanup sketch mode
    if (this.sketchMode && typeof this.sketchMode.dispose === 'function') {
      this.sketchMode.dispose();
    }
    
    // Cleanup all objects
    this.objects.forEach(meta => {
      this.scene.remove(meta.mesh);
      if (meta.mesh.geometry) meta.mesh.geometry.dispose();
      if (meta.mesh.material) {
        if (Array.isArray(meta.mesh.material)) {
          meta.mesh.material.forEach(m => m.dispose());
        } else {
          meta.mesh.material.dispose();
        }
      }
    });
    
    // Remove event listeners
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    
    this.objects.clear();
    this.transform.dispose();
    this.highlightMaterial.dispose();
    this.defaultMaterials.clear();
  }
}

