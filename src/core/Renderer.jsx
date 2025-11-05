import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { sceneManager } from './SceneManager';

const Renderer = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    // Initialize the scene
    const { scene, camera, renderer } = sceneManager.init();
    mountRef.current.appendChild(renderer.domElement);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      sceneManager.update();
      renderer.render(scene, camera);
    };
    
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current.removeChild(renderer.domElement);
      sceneManager.cleanup();
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />;
};

export default Renderer;
