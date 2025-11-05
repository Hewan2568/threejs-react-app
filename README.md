# 3D Scene Editor with Three.js and React

A powerful 3D scene editor built with Three.js and React, featuring a modern UI for creating and manipulating 3D objects in real-time.

## ✨ Features

- 🖥️ Interactive 3D canvas with camera controls
- 🧊 Support for basic 3D primitives (cubes, spheres, etc.)
- 🛠️ Transform controls (move, rotate, scale)
- 📦 Scene graph hierarchy viewer
- 💾 Import/Export scene functionality
- 📐 Property editing for 3D objects
- 🎨 Real-time preview of changes

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```
3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser

## 🏗️ Project Structure

```
src/
├── components/       # React components
│   ├── Canvas3D.jsx          # Main 3D canvas component
│   ├── EntityPropertiesPanel.jsx  # Properties editor
│   ├── ImportExportControls.jsx   # Import/export UI
│   ├── PropertiesPanel.jsx   # Main properties panel
│   ├── Scene.jsx             # Scene container
│   ├── SceneController.jsx   # Scene management
│   ├── SceneGraph.jsx        # Scene hierarchy view
│   ├── SketchControls.jsx    # Drawing controls
│   ├── StatusBar.jsx         # Application status bar
│   └── Toolbar.jsx           # Main toolbar
├── core/             # Core functionality
│   ├── Renderer.jsx          # Three.js renderer setup
│   ├── SceneManager.js       # Scene management logic
│   ├── SketchMode.js         # Sketching functionality
│   ├── TransformModes.js     # Transform control modes
│   └── primitives.js         # 3D primitive generators
├── entities/         # 3D entity definitions
│   ├── Cube.js              # Cube entity
│   └── Entity.js            # Base entity class
├── three/            # Three.js specific code
│   ├── SceneManager.js      # Three.js scene management
│   ├── primitives.js        # Three.js primitive generators
│   └── selection.js         # Object selection logic
└── utils/            # Utility functions
    ├── SceneExporter.js     # Scene export functionality
    ├── SceneImporter.js     # Scene import functionality
    ├── exportImport.js      # Import/export utilities
    ├── fileUtils.js         # File handling utilities
    ├── geometryUtils.js     # Geometry manipulation
    └── math.js              # Math utilities
```

## 🛠️ Development

- Start development server: `npm run dev`
- Build for production: `npm run build`
- Preview production build: `npm run preview`
- Lint code: `npm run lint`

## 🌐 Live Demo

Check out the live demo of the 3D Scene Editor:
[![Live Demo](https://img.shields.io/badge/demo-live%20demo-green.svg)](https://threejs-react-app.vercel.app/)

## 🛠 Implementation Details

### Core Technologies
- **React**: For building the user interface and managing application state
- **Three.js**: For 3D rendering and scene management
- **Vite**: For fast development and production builds
- **React Three Fiber**: React renderer for Three.js
- **Drei**: Helper library for Three.js in React




## 📦 Dependencies

- [React](https://reactjs.org/) - UI library
- [Three.js](https://threejs.org/) - 3D library
- [Vite](https://vitejs.dev/) - Build tool
- [ESLint](https://eslint.org/) - Code linting

