import * as THREE from 'three';

export const calculateEdgeLength = (v1, v2) => {
  return v1.distanceTo(v2);
};

export const calculateFaceArea = (face, geometry) => {
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  
  vA.fromBufferAttribute(geometry.attributes.position, face.a);
  vB.fromBufferAttribute(geometry.attributes.position, face.b);
  vC.fromBufferAttribute(geometry.attributes.position, face.c);
  
  // Calculate area using Heron's formula
  const a = vA.distanceTo(vB);
  const b = vB.distanceTo(vC);
  const c = vC.distanceTo(vA);
  
  const s = (a + b + c) / 2; // semi-perimeter
  return Math.sqrt(s * (s - a) * (s - b) * (s - c));
};

export const calculateBoundingBox = (object) => {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  
  return {
    min: box.min,
    max: box.max,
    size: size,
    center: box.getCenter(new THREE.Vector3()),
    volume: size.x * size.y * size.z
  };
};

export const calculateDistance = (point1, point2) => {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) +
    Math.pow(point2.y - point1.y, 2) +
    Math.pow(point2.z - point1.z, 2)
  );
};
