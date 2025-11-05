import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { triangleArea } from '../utils/math';

const EntityPropertiesPanel = ({ selectedEntity }) => {
  const [properties, setProperties] = useState(null);

  useEffect(() => {
    if (!selectedEntity) {
      setProperties(null);
      return;
    }

    const updateProperties = () => {
      const props = { type: selectedEntity.type };

      // Common properties for all entity types
      if (selectedEntity.object) {
        const { position, rotation, scale } = selectedEntity.object;
        props.position = {
          x: position.x.toFixed(2),
          y: position.y.toFixed(2),
          z: position.z.toFixed(2)
        };
        props.rotation = {
          x: THREE.MathUtils.radToDeg(rotation.x).toFixed(2),
          y: THREE.MathUtils.radToDeg(rotation.y).toFixed(2),
          z: THREE.MathUtils.radToDeg(rotation.z).toFixed(2)
        };
        props.scale = {
          x: scale.x.toFixed(2),
          y: scale.y.toFixed(2),
          z: scale.z.toFixed(2)
        };
      }

      // Shape specific properties
      if (selectedEntity.type === 'shape') {
        const geometry = selectedEntity.object.geometry;
        if (geometry) {
          props.numFaces = geometry.attributes.position ? 
            Math.floor(geometry.attributes.position.count / 3) : 0;
          
          // Calculate number of edges (assuming triangles, each has 3 edges)
          // This is a simplification and might need adjustment based on your geometry
          props.numEdges = Math.floor((props.numFaces * 3) / 2);
        }
      }
      // Face specific properties
      else if (selectedEntity.type === 'face' && selectedEntity.face) {
        const { face, object } = selectedEntity;
        const geometry = object.geometry;
        
        // Get face vertices
        const vA = new THREE.Vector3();
        const vB = new THREE.Vector3();
        const vC = new THREE.Vector3();
        
        vA.fromBufferAttribute(geometry.attributes.position, face.a);
        vB.fromBufferAttribute(geometry.attributes.position, face.b);
        vC.fromBufferAttribute(geometry.attributes.position, face.c);
        
        // Calculate face normal
        const normal = new THREE.Vector3();
        const cb = new THREE.Vector3();
        const ab = new THREE.Vector3();
        
        cb.subVectors(vC, vB);
        ab.subVectors(vA, vB);
        normal.crossVectors(cb, ab).normalize();
        
        // Calculate face area
        props.area = triangleArea(vA, vB, vC).toFixed(4);
        props.normal = {
          x: normal.x.toFixed(4),
          y: normal.y.toFixed(4),
          z: normal.z.toFixed(4)
        };
      }
      // Edge specific properties
      else if (selectedEntity.type === 'edge' && selectedEntity.edge) {
        const { edge } = selectedEntity;
        const [v1, v2] = edge.vertices;
        
        props.length = Math.sqrt(
          Math.pow(v2.x - v1.x, 2) +
          Math.pow(v2.y - v1.y, 2) +
          Math.pow(v2.z - v1.z, 2)
        ).toFixed(4);
        
        props.endpoints = {
          start: { x: v1.x.toFixed(4), y: v1.y.toFixed(4), z: v1.z.toFixed(4) },
          end: { x: v2.x.toFixed(4), y: v2.y.toFixed(4), z: v2.z.toFixed(4) }
        };
      }

      setProperties(props);
    };

    updateProperties();
  }, [selectedEntity]);

  const renderVector = (label, vector) => (
    <div style={styles.vectorContainer}>
      <strong>{label}:</strong>
      <div style={styles.vectorValues}>
        <div>X: {vector.x}</div>
        <div>Y: {vector.y}</div>
        <div>Z: {vector.z}</div>
      </div>
    </div>
  );

  if (!properties) {
    return (
      <div style={styles.panel}>
        <h3 style={styles.header}>No selection</h3>
        <p>Select an entity to view its properties</p>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <h3 style={styles.header}>Properties: {properties.type}</h3>
      
      {properties.position && (
        <div style={styles.section}>
          <h4 style={styles.sectionHeader}>Transform</h4>
          {renderVector('Position', properties.position)}
          {properties.rotation && renderVector('Rotation (deg)', properties.rotation)}
          {properties.scale && renderVector('Scale', properties.scale)}
        </div>
      )}

      {properties.type === 'shape' && (
        <div style={styles.section}>
          <h4 style={styles.sectionHeader}>Geometry</h4>
          <div>Type: {properties.object?.geometry?.type || 'N/A'}</div>
          <div>Faces: {properties.numFaces || 0}</div>
          <div>Edges: {properties.numEdges || 0}</div>
        </div>
      )}

      {properties.type === 'face' && (
        <div style={styles.section}>
          <h4 style={styles.sectionHeader}>Face Properties</h4>
          <div>Area: {properties.area || 0}</div>
          {properties.normal && (
            <div>
              <div>Normal:</div>
              <div style={styles.vectorValues}>
                <div>X: {properties.normal.x}</div>
                <div>Y: {properties.normal.y}</div>
                <div>Z: {properties.normal.z}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {properties.type === 'edge' && (
        <div style={styles.section}>
          <h4 style={styles.sectionHeader}>Edge Properties</h4>
          <div>Length: {properties.length || 0}</div>
          {properties.endpoints && (
            <div>
              <div>Start: [{properties.endpoints.start.x}, {properties.endpoints.start.y}, {properties.endpoints.start.z}]</div>
              <div>End: [{properties.endpoints.end.x}, {properties.endpoints.end.y}, {properties.endpoints.end.z}]</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  panel: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '15px',
    borderRadius: '4px',
    width: '280px',
    maxHeight: '90vh',
    overflowY: 'auto',
    zIndex: 10,
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    lineHeight: '1.4',
  },
  header: {
    marginTop: 0,
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
  },
  section: {
    marginBottom: '15px',
    paddingBottom: '15px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  sectionHeader: {
    marginTop: 0,
    marginBottom: '10px',
    fontSize: '14px',
    color: '#64B5F6',
  },
  vectorContainer: {
    marginBottom: '8px',
  },
  vectorValues: {
    marginLeft: '15px',
    color: '#B0BEC5',
  },
};

export default EntityPropertiesPanel;
