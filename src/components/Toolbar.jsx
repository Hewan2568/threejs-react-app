import { createBox, createSphere, createCylinder } from '../core/primitives';

const Button = ({ children, onClick, title, style = {} }) => (
  <button 
    onClick={onClick}
    title={title}
    style={{
      background: 'rgba(50, 50, 50, 0.8)',
      border: '1px solid #666',
      color: 'white',
      padding: '8px 12px',
      cursor: 'pointer',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.2s',
      ...style
    }}
    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(70, 70, 70, 0.9)'}
    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(50, 50, 50, 0.8)'}
  >
    {children}
  </button>
);

export const Toolbar = ({ sceneManager, onSelectObject, transformMode, onTransformModeChange }) => {
  const handleAddPrimitive = (createFn) => {
    if (!sceneManager) {
      console.error('Scene manager not available');
      return null;
    }
    
    const object = createFn({ sceneManager });
    if (object && onSelectObject) {
      onSelectObject(object);
    }
    return object;
  };

  const handleAddBox = () => handleAddPrimitive(createBox);
  const handleAddSphere = () => handleAddPrimitive(createSphere);
  const handleAddCylinder = () => handleAddPrimitive(createCylinder);

  const transformModes = [
    { id: 'select', icon: '🖱️', label: 'Select (Q)' },
    { id: 'translate', icon: '✋', label: 'Move (W)' },
    { id: 'rotate', icon: '🔄', label: 'Rotate (E)' },
    { id: 'scale', icon: '📏', label: 'Scale (R)' }
  ];

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0, 0, 0, 0.5)',
      padding: '8px',
      borderRadius: '6px',
      zIndex: 10,
      display: 'flex',
      gap: '8px',
      backdropFilter: 'blur(4px)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
    }}>
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '4px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '4px'
      }}>
        {transformModes.map((mode) => (
          <Button
            key={mode.id}
            onClick={() => onTransformModeChange(mode.id)}
            title={mode.label}
            style={{
              background: transformMode === mode.id ? 'rgba(100, 149, 237, 0.8)' : 'transparent',
              border: transformMode === mode.id ? '1px solid #6495ed' : '1px solid transparent'
            }}
          >
            <span style={{ fontSize: '16px' }}>{mode.icon}</span>
          </Button>
        ))}
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '4px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '4px',
        marginLeft: '8px'
      }}>
        <Button onClick={handleAddBox} title="Add Box">
          <span style={{ fontSize: '16px' }}>📦</span>
        </Button>
        <Button onClick={handleAddSphere} title="Add Sphere">
          <span style={{ fontSize: '16px' }}>⚪</span>
        </Button>
        <Button onClick={handleAddCylinder} title="Add Cylinder">
          <span style={{ fontSize: '16px' }}>🪣</span>
        </Button>
      </div>
    </div>
  );
};
