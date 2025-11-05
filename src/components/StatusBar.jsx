import React from 'react';

const StatusBar = ({ currentMode, isSnapEnabled, gridSize, onGridSizeChange, onToggleSnap }) => {
  return (
    <div style={{
      position: 'absolute',
      bottom: '0',
      left: '0',
      right: '0',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '6px 12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '14px',
      zIndex: 10
    }}>
      <div>
        <span style={{ marginRight: '20px' }}>Mode: <strong>{currentMode || 'Select'}</strong></span>
        <span>
          <label style={{ marginRight: '10px' }}>
            <input 
              type="checkbox" 
              checked={isSnapEnabled} 
              onChange={onToggleSnap}
              style={{ marginRight: '5px' }}
            />
            Snap to Grid
          </label>
          <span style={{ marginLeft: '10px' }}>
            Grid Size: 
            <input 
              type="number" 
              value={gridSize} 
              onChange={(e) => onGridSizeChange(Number(e.target.value))}
              min="0.1" 
              step="0.1"
              style={{
                width: '50px',
                marginLeft: '5px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid #555',
                color: 'white',
                padding: '2px 5px',
                borderRadius: '3px'
              }}
            />
          </span>
        </span>
      </div>
      <div>
        <span title="Select (Q)" style={{ margin: '0 10px' }}>🖱️ Q: Select</span>
        <span title="Move (W)" style={{ margin: '0 10px' }}>✋ W: Move</span>
        <span title="Rotate (E)" style={{ margin: '0 10px' }}>🔄 E: Rotate</span>
        <span title="Scale (R)" style={{ margin: '0 10px' }}>📏 R: Scale</span>
        <span title="Delete (Del)" style={{ margin: '0 10px' }}>🗑️ Del: Delete</span>
        <span title="Duplicate (Ctrl+D)" style={{ margin: '0 10px' }}>⎘ Ctrl+D: Duplicate</span>
      </div>
    </div>
  );
};

export default StatusBar;
