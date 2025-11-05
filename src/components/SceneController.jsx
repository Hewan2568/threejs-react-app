import { useEffect } from 'react';
import { Cube } from '../entities/Cube';
import { sceneManager } from '../core/SceneManager';

const SceneController = () => {
  useEffect(() => {
    // Add a cube to the scene
    const cube = new Cube(1, 0x00ff00);
    cube.setPosition(0, 0, 0);
    sceneManager.addEntity(cube);

    // Cleanup on unmount
    return () => {
      sceneManager.removeEntity(cube);
    };
  }, []);

  return null; // This component doesn't render anything visible
};

export default SceneController;
