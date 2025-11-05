import React, { useRef } from 'react';
import SceneExporter from '../utils/SceneExporter';
import SceneImporter from '../utils/SceneImporter';
import { readFileAsText } from '../utils/fileUtils';

const ImportExportControls = ({ scene, onSceneImport }) => {
  const fileInputRef = useRef(null);

  const handleExport = () => {
    if (!scene) {
      console.warn('No scene to export');
      return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `scene-${timestamp}.json`;
    
    try {
      const sceneJson = SceneExporter.exportScene(scene);
      const blob = new Blob([sceneJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting scene:', error);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      const importedScene = await SceneImporter.importFromFile(file);
      if (onSceneImport) {
        onSceneImport(importedScene);
      }
    } catch (error) {
      console.error('Error importing scene:', error);
    } finally {
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="import-export-controls" style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      zIndex: 1000,
      display: 'flex',
      gap: '8px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: '8px',
      borderRadius: '4px'
    }}>
      <button 
        onClick={handleExport}
        style={{
          padding: '8px 16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
        title="Export Scene"
      >
        Export
      </button>
      <button 
        onClick={handleImportClick}
        style={{
          padding: '8px 16px',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
        title="Import Scene"
      >
        Import
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ImportExportControls;
