import * as THREE from 'three';

export class SceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.objects = [];
    this.selectedObject = null;
  }

  init() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    // Lights
    this.setupLights();

    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
    };
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
  }

  addObject(object) {
    if (object) {
      this.scene.add(object);
      this.objects.push(object);
      this.selectObject(object);
      return object;
    }
    return null;
  }

  removeObject(object) {
    if (object) {
      this.scene.remove(object);
      this.objects = this.objects.filter(obj => obj !== object);
      if (this.selectedObject === object) {
        this.selectedObject = null;
      }
    }
  }

  selectObject(object) {
    // Reset previously selected object's material if it exists
    if (this.selectedObject && this.selectedObject.userData.originalMaterial) {
      this.selectedObject.material = this.selectedObject.userData.originalMaterial;
    }

    this.selectedObject = object;

    // Highlight selected object
    if (object) {
      object.userData.originalMaterial = object.material;
      const highlightMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        wireframe: true
      });
      object.material = highlightMaterial;
    }
  }

  update() {
    // Update scene objects here if needed
  }

  cleanup() {
    // Cleanup resources
    this.objects.forEach(object => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    if (this.renderer) {
      this.renderer.dispose();
    }

    this.objects = [];
    this.selectedObject = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}

export const sceneManager = new SceneManager();
