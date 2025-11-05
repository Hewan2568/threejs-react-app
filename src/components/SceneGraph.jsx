import { useEffect, useState } from 'react';
import { sceneManager } from '../three/SceneManager';

export const SceneGraph = () => {
  const [objects, setObjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const updateSceneGraph = () => {
      const sceneObjects = sceneManager.objects.map(obj => ({
        id: obj.uuid,
        name: obj.name || `Object-${obj.uuid.slice(0, 6)}`,
        type: obj.type,
        visible: obj.visible
      }));
      setObjects(sceneObjects);
      
      // Update selected ID if needed
      if (sceneManager.selectedObject && 
          (!selectedId || sceneManager.selectedObject.uuid !== selectedId)) {
        setSelectedId(sceneManager.selectedObject.uuid);
      } else if (!sceneManager.selectedObject) {
        setSelectedId(null);
      }
    };

    // Initial update
    updateSceneGraph();
    
    // Set up an interval to check for changes
    const interval = setInterval(updateSceneGraph, 100);
    
    return () => clearInterval(interval);
  }, [selectedId]);

  const handleSelect = (objectId) => {
    const obj = sceneManager.objects.find(o => o.uuid === objectId);
    if (obj) {
      sceneManager.selectObject(obj);
      setSelectedId(objectId);
    }
  };

  const toggleVisibility = (objectId) => {
    const obj = sceneManager.objects.find(o => o.uuid === objectId);
    if (obj) {
      obj.visible = !obj.visible;
      setObjects(prev => prev.map(o => 
        o.id === objectId ? { ...o, visible: obj.visible } : o
      ));
    }
  };

  if (objects.length === 0) {
    return (
      <div style={panelStyle}>
        <h3>Scene Graph</h3>
        <p>No objects in the scene</p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <h3>Scene Graph</h3>
      <ul style={listStyle}>
        {objects.map(obj => (
          <li key={obj.id} style={itemStyle}>
            <div 
              style={{
                ...itemContentStyle,
                background: selectedId === obj.id ? 'rgba(0, 120, 215, 0.3)' : 'transparent'
              }}
              onClick={() => handleSelect(obj.id)}
            >
              <input
                type="checkbox"
                checked={obj.visible}
                onChange={() => toggleVisibility(obj.id)}
                onClick={e => e.stopPropagation()}
                style={checkboxStyle}
              />
              <span style={{ flex: 1 }}>{obj.name}</span>
              <span style={typeStyle}>{obj.type}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Styles
const panelStyle = {
  position: 'absolute',
  top: '10px',
  left: '10px',
  background: 'rgba(0, 0, 0, 0.7)',
  color: 'white',
  padding: '15px',
  borderRadius: '4px',
  width: '250px',
  maxHeight: '80vh',
  overflowY: 'auto',
  zIndex: 10
};

const listStyle = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  marginTop: '10px'
};

const itemStyle = {
  marginBottom: '4px',
  borderRadius: '4px',
  overflow: 'hidden'
};

const itemContentStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '6px 10px',
  cursor: 'pointer',
  borderRadius: '4px',
  transition: 'background 0.2s',
  ':hover': {
    background: 'rgba(255, 255, 255, 0.1)'
  }
};

const checkboxStyle = {
  marginRight: '8px',
  cursor: 'pointer'
};

const typeStyle = {
  fontSize: '0.8em',
  opacity: 0.7,
  marginLeft: '8px'
};
