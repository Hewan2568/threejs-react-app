import { useEffect, useState } from 'react';
import { sceneManager } from '../three/SceneManager';

export const PropertiesPanel = () => {
  const [selectedObject, setSelectedObject] = useState(null);
  const [properties, setProperties] = useState({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    color: '#ffffff'
  });

  useEffect(() => {
    const handleSelectionChange = () => {
      const obj = sceneManager.selectedObject;
      setSelectedObject(obj);
      
      if (obj) {
        setProperties({
          position: {
            x: obj.position.x.toFixed(2),
            y: obj.position.y.toFixed(2),
            z: obj.position.z.toFixed(2)
          },
          rotation: {
            x: (obj.rotation.x * (180 / Math.PI)).toFixed(2),
            y: (obj.rotation.y * (180 / Math.PI)).toFixed(2),
            z: (obj.rotation.z * (180 / Math.PI)).toFixed(2)
          },
          scale: {
            x: obj.scale.x.toFixed(2),
            y: obj.scale.y.toFixed(2),
            z: obj.scale.z.toFixed(2)
          },
          color: obj.material.color.getHexString()
        });
      }
    };

    // Initial setup
    handleSelectionChange();

    // Listen for selection changes (you'll need to implement this in SceneManager)
    // For now, we'll use a simple interval
    const interval = setInterval(handleSelectionChange, 100);
    
    return () => clearInterval(interval);
  }, []);

  const handlePropertyChange = (property, axis, value) => {
    if (!selectedObject) return;
    
    const newValue = parseFloat(value) || 0;
    
    switch (property) {
      case 'position':
        selectedObject.position[axis] = newValue;
        break;
      case 'rotation':
        // Convert degrees to radians for rotation
        selectedObject.rotation[axis] = newValue * (Math.PI / 180);
        break;
      case 'scale':
        selectedObject.scale[axis] = newValue;
        break;
      case 'color':
        selectedObject.material.color.set(value);
        break;
      default:
        break;
    }
    
    // Update local state
    setProperties(prev => ({
      ...prev,
      [property]: {
        ...prev[property],
        [axis]: property === 'color' ? value : newValue
      }
    }));
  };

  if (!selectedObject) {
    return (
      <div style={panelStyle}>
        <h3>Properties</h3>
        <p>No object selected</p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <h3>Properties</h3>
      
      <div style={sectionStyle}>
        <h4>Position</h4>
        {['x', 'y', 'z'].map(axis => (
          <div key={`pos-${axis}`} style={inputGroupStyle}>
            <label>{axis.toUpperCase()}:</label>
            <input
              type="number"
              value={properties.position[axis]}
              onChange={(e) => handlePropertyChange('position', axis, e.target.value)}
              style={inputStyle}
            />
          </div>
        ))}
      </div>

      <div style={sectionStyle}>
        <h4>Rotation (degrees)</h4>
        {['x', 'y', 'z'].map(axis => (
          <div key={`rot-${axis}`} style={inputGroupStyle}>
            <label>{axis.toUpperCase()}:</label>
            <input
              type="number"
              value={properties.rotation[axis]}
              onChange={(e) => handlePropertyChange('rotation', axis, e.target.value)}
              style={inputStyle}
            />
          </div>
        ))}
      </div>

      <div style={sectionStyle}>
        <h4>Scale</h4>
        {['x', 'y', 'z'].map(axis => (
          <div key={`scale-${axis}`} style={inputGroupStyle}>
            <label>{axis.toUpperCase()}:</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={properties.scale[axis]}
              onChange={(e) => handlePropertyChange('scale', axis, e.target.value)}
              style={inputStyle}
            />
          </div>
        ))}
      </div>

      <div style={sectionStyle}>
        <h4>Material</h4>
        <div style={inputGroupStyle}>
          <label>Color:</label>
          <input
            type="color"
            value={`#${properties.color}`}
            onChange={(e) => handlePropertyChange('color', null, e.target.value)}
            style={{...inputStyle, padding: '2px', width: '60px'}}
          />
        </div>
      </div>
    </div>
  );
};

// Styles
const panelStyle = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  background: 'rgba(0, 0, 0, 0.7)',
  color: 'white',
  padding: '15px',
  borderRadius: '4px',
  width: '250px',
  maxHeight: '90vh',
  overflowY: 'auto',
  zIndex: 10
};

const sectionStyle = {
  marginBottom: '15px',
  paddingBottom: '15px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
};

const inputGroupStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px'
};

const inputStyle = {
  width: '80px',
  padding: '4px',
  borderRadius: '3px',
  border: '1px solid #444',
  background: '#333',
  color: 'white'
};
