import React from 'react';
import { SKETCH_MODES } from '../core/SketchMode';

export default function SketchControls({ onSetSketchMode, activeMode }) {
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 100,
      display: 'flex',
      gap: '5px'
    }}>
      <button 
        style={{
          backgroundColor: activeMode === SKETCH_MODES.RECTANGLE ? '#4CAF50' : '#555',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
        onClick={() => onSetSketchMode(SKETCH_MODES.RECTANGLE)}
      >
        Rectangle
      </button>
      <button 
        style={{
          backgroundColor: activeMode === SKETCH_MODES.CIRCLE ? '#4CAF50' : '#555',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
        onClick={() => onSetSketchMode(SKETCH_MODES.CIRCLE)}
      >
        Circle
      </button>
      <button 
        style={{
          backgroundColor: activeMode === SKETCH_MODES.NONE ? '#f44336' : '#555',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginLeft: '10px'
        }}
        onClick={() => onSetSketchMode(SKETCH_MODES.NONE)}
      >
        Select
      </button>
    </div>
  );
}
