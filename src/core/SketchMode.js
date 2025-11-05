import * as THREE from 'three';

export const SKETCH_MODES = {
  NONE: 'none',
  RECTANGLE: 'sketch-rect',
  CIRCLE: 'sketch-circle'
};

export class SketchMode {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.scene = sceneManager.scene;
    this.renderer = sceneManager.renderer;
    this.camera = sceneManager.camera;
    this.domElement = sceneManager.domElement;
    
    // Sketch mode properties
    this.mode = SKETCH_MODES.NONE;
    this.startPoint = null;
    this.preview = null;
    this.drawPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // XZ plane at y=0
    this.gridSize = 0.5; // Size of grid for snap-to-grid
    
    // Bind methods
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
  }
  
  // Enable sketch mode
  enable(mode) {
    if (this.mode !== SKETCH_MODES.NONE) {
      this.disable();
    }
    
    this.mode = mode;
    this.domElement.style.cursor = 'crosshair';
    this.attachEventListeners();
  }
  
  // Disable sketch mode
  disable() {
    this.mode = SKETCH_MODES.NONE;
    this.clearPreview();
    this.startPoint = null;
    this.domElement.style.cursor = '';
    this.removeEventListeners();
  }
  
  // Attach event listeners
  attachEventListeners() {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
  }
  
  // Remove event listeners
  removeEventListeners() {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
  }
  
  // Convert screen coordinates to 3D point on the draw plane
  getIntersectionPoint(x, y) {
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    
    // Convert to normalized device coordinates
    mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;

    // Update the raycaster
    raycaster.setFromCamera(mouse, this.camera);
    
    // Find intersection with the draw plane
    const intersection = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(this.drawPlane, intersection)) {
      // Snap to grid
      intersection.x = Math.round(intersection.x / this.gridSize) * this.gridSize;
      intersection.z = Math.round(intersection.z / this.gridSize) * this.gridSize;
      return intersection;
    }
    return null;
  }
  
  // Clear the preview
  clearPreview() {
    if (this.preview) {
      this.scene.remove(this.preview);
      this.preview.geometry.dispose();
      this.preview = null;
    }
  }
  
  // Update the preview based on current mouse position
  updatePreview(currentPoint) {
    if (!this.startPoint) return;
    
    this.clearPreview();

    if (this.mode === SKETCH_MODES.RECTANGLE) {
      this.updateRectanglePreview(currentPoint);
    } else if (this.mode === SKETCH_MODES.CIRCLE) {
      this.updateCirclePreview(currentPoint);
    }
  }
  
  // Update rectangle preview
  updateRectanglePreview(currentPoint) {
    const points = [];
    points.push(new THREE.Vector3(this.startPoint.x, 0, this.startPoint.z));
    points.push(new THREE.Vector3(currentPoint.x, 0, this.startPoint.z));
    points.push(new THREE.Vector3(currentPoint.x, 0, currentPoint.z));
    points.push(new THREE.Vector3(this.startPoint.x, 0, currentPoint.z));
    points.push(points[0]); // Close the loop

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    this.preview = new THREE.Line(geometry, material);
    this.scene.add(this.preview);
  }
  
  // Update circle preview
  updateCirclePreview(currentPoint) {
    const radius = this.startPoint.distanceTo(currentPoint);
    const segments = 32;
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const points = [];

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        this.startPoint.x + Math.cos(theta) * radius,
        0,
        this.startPoint.z + Math.sin(theta) * radius
      ));
    }
    points.push(points[0]); // Close the loop

    geometry.setFromPoints(points);
    this.preview = new THREE.Line(geometry, material);
    this.scene.add(this.preview);
  }
  
  // Create the final shape
  createShape(endPoint) {
    if (!this.startPoint) return;

    if (this.mode === SKETCH_MODES.RECTANGLE) {
      this.createRectangle(endPoint);
    } else if (this.mode === SKETCH_MODES.CIRCLE) {
      this.createCircle(endPoint);
    }
    
    this.clearPreview();
    this.startPoint = null;
  }
  
  // Create a rectangle shape
  createRectangle(endPoint) {
    const width = Math.abs(endPoint.x - this.startPoint.x);
    const depth = Math.abs(endPoint.z - this.startPoint.z);
    
    // Skip if the shape is too small
    if (width < 0.1 || depth < 0.1) return;

    const shape = new THREE.Shape();
    const x = Math.min(this.startPoint.x, endPoint.x);
    const z = Math.min(this.startPoint.z, endPoint.z);
    
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width, depth);
    shape.lineTo(0, depth);
    shape.lineTo(0, 0);

    this.extrudeShape(shape, new THREE.Vector3(x, 0, z));
  }
  
  // Create a circle shape
  createCircle(endPoint) {
    const radius = this.startPoint.distanceTo(endPoint);
    if (radius < 0.1) return; // Skip if too small

    const shape = new THREE.Shape();
    shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
    
    this.extrudeShape(shape, new THREE.Vector3(
      this.startPoint.x, 
      0, 
      this.startPoint.z
    ));
  }
  
  // Extrude a shape to create a 3D object
  extrudeShape(shape, position) {
    const extrudeSettings = {
      depth: 1,
      bevelEnabled: false
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2); // Rotate to align with XZ plane
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x8888ff,
      metalness: 0.3,
      roughness: 0.8
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    this.scene.add(mesh);

    // Add to scene manager's objects
    if (this.sceneManager.addObject) {
      this.sceneManager.addObject({
        mesh,
        type: this.mode === SKETCH_MODES.RECTANGLE ? 'Rectangle' : 'Circle',
        params: {}
      });
    }
    
    return mesh;
  }
  
  // Event handlers
  onPointerDown(event) {
    if (this.mode === SKETCH_MODES.NONE) return;
    
    const point = this.getIntersectionPoint(event.clientX, event.clientY);
    if (point) {
      this.startPoint = point;
    }
  }
  
  onPointerMove(event) {
    if (this.mode === SKETCH_MODES.NONE || !this.startPoint) return;
    
    const point = this.getIntersectionPoint(event.clientX, event.clientY);
    if (point) {
      this.updatePreview(point);
    }
  }
  
  onPointerUp(event) {
    if (this.mode === SKETCH_MODES.NONE || !this.startPoint) return;
    
    const point = this.getIntersectionPoint(event.clientX, event.clientY);
    if (point) {
      this.createShape(point);
    } else {
      this.clearPreview();
      this.startPoint = null;
    }
  }
  
  // Cleanup
  dispose() {
    this.disable();
    this.clearPreview();
  }
}
