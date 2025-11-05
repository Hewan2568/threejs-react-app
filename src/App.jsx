import './App.css';
import { useState, useRef, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import Canvas3D from './components/Canvas3D';
import { PropertiesPanel } from './components/PropertiesPanel';
import SketchControls from './components/SketchControls';
import { SKETCH_MODES } from './core/SketchMode';
import ImportExportControls from './components/ImportExportControls';

function App() {
  const [selectedObject, setSelectedObject] = useState(null);
  const [sketchMode, setSketchMode] = useState(SKETCH_MODES.NONE);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const sceneManagerRef = useRef(null);
  const sceneRef = useRef();
  const canvasRef = useRef();

  const handleCanvasReady = useCallback((manager) => {
    if (sceneManagerRef.current !== manager) {
      sceneManagerRef.current = manager;
      if (manager?.scene) {
        sceneRef.current = manager.scene;
        setIsSceneReady(true);
      } else {
        setIsSceneReady(false);
      }
    }
  }, []);
  
  const handleSetSketchMode = useCallback((mode) => {
    setSketchMode(mode);
    sceneManagerRef.current?.setSketchMode(mode);
  }, []);

  const handleSceneImport = useCallback((importedScene) => {
    if (!sceneRef.current || !sceneManagerRef.current) return;
    
    try {
      while (sceneRef.current.children.length > 0) { 
        const child = sceneRef.current.children[0];
        sceneRef.current.remove(child);
        
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
      
      while (importedScene.children.length > 0) {
        const child = importedScene.children[0];
        sceneRef.current.add(child);
      }
      
      sceneManagerRef.current.updateObjectMap?.();
      setSelectedObject(null);
      
    } catch (error) {
      console.error('Error handling scene import:', error);
    }
  }, []);
  
  return (
    <div className="app">
      <div className="app-container">
        <div className="top-controls">
          <aside className="toolbar-panel">
            {isSceneReady && (
              <Toolbar 
                onSelectObject={setSelectedObject} 
                sceneManager={sceneManagerRef.current} 
                transformMode={sketchMode}
                onTransformModeChange={handleSetSketchMode}
              />
            )}
          </aside>
          
          {sceneRef.current && (
            <div className="import-export-panel">
              <ImportExportControls 
                scene={sceneRef.current}
                onSceneImport={handleSceneImport}
              />
            </div>
          )}
        </div>
        
        <main className="canvas-container" ref={canvasRef}>
          <Canvas3D 
            ref={canvasRef}
            onReady={handleCanvasReady}
            selectedObject={selectedObject}
            onObjectSelect={setSelectedObject}
          />
        </main>
        
        <aside className="properties-panel">
          <PropertiesPanel 
            selectedObject={selectedObject}
            onUpdateObject={(updates) => {
              if (selectedObject) {
                const updatedObject = { ...selectedObject, ...updates };
                setSelectedObject(updatedObject);
                
                // Update the actual object in the scene
                if (sceneManagerRef.current?.updateObject) {
                  sceneManagerRef.current.updateObject(selectedObject.id, updates);
                }
              }
            }}
          />
        </aside>
      </div>
    </div>
  );
}

export default App;