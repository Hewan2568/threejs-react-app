import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import SceneManager from '../core/SceneManager';
const Canvas3D = ({ onReady, onObjectSelect }) => {
  const mountRef = useRef();
  const controlsRef = useRef();
  const animationRef = useRef();
  const rendererRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();
  const mgrRef = useRef();
  const onObjectSelectRef = useRef();
  
  // Keep the callback reference up to date
  useEffect(() => {
    onObjectSelectRef.current = onObjectSelect;
  }, [onObjectSelect]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      el.clientWidth / el.clientHeight,
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer with context preservation
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Grid helper
    const grid = new THREE.GridHelper(20, 20);
    scene.add(grid);

    // Initialize scene manager
    const sceneManager = new SceneManager({ 
      scene,
      camera,
      renderer,
      domElement: renderer.domElement
    });
    mgrRef.current = sceneManager;

    // Call onReady with the sceneManager
    if (onReady) {
      onReady(sceneManager);
    }

    // Add event listener for object selection
    const onControlsEnd = () => {
      if (onObjectSelectRef.current && sceneManager) {
        const intersects = sceneManager.raycast();
        if (intersects && intersects.length > 0) {
          onObjectSelectRef.current(intersects[0].object);
        } else {
          onObjectSelectRef.current(null);
        }
      }
    };

    controls.addEventListener('end', onControlsEnd);

    // Handle window resize
    const onResize = () => {
      if (!el || !camera || !renderer) return;

      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };

    window.addEventListener('resize', onResize);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      if (controls) controls.update();
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };

    animate();

    // Cleanup
    return () => {
      // Cancel animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      // Remove event listeners
      window.removeEventListener('resize', onResize);
      if (controls) {
        controls.removeEventListener('end', onControlsEnd);
        controls.dispose();
      }
      
      // Clean up renderer
      if (renderer) {
        if (el && renderer.domElement) {
          el.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
      
      // Clean up scene
      if (scene) {
        scene.traverse((child) => {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else if (child.material) {
              child.material.dispose();
            }
          }
        });
      }
      
      // Clear refs
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      mgrRef.current = null;
    };
  }, [onReady]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
};

export default Canvas3D;