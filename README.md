# architecture in action (aia)

A 3D/4D visualization tool for software architectures that combines component diagrams with sequence diagrams through animated data flows.

## Overview

**architecture in action (aia)** is a web-based visualization tool that helps communicate software architectures to both technical and non-technical audiences. Unlike traditional 2D UML diagrams, aia provides:

- **3D Component Model**: Visualize software components in three-dimensional space
- **Animated Data Flows**: See how data moves between components over time
- **4D Visualization**: 3D space plus time dimension (x, y, z, t)
- **Interactive Exploration**: Rotate, zoom, and pan through your architecture

The tool uses a declarative JSON-based modeling approach, making it easy to version control and integrate with other tools.

## Technology Stack

- **JavaScript** (ES6 modules)
- **[THREE.js](https://threejs.org/)** - 3D graphics library
- **WebGL** - Hardware-accelerated 3D rendering
- Pure client-side application (no build step required)

## Getting Started

Since this is a client-side web application, you need to serve it through a local web server (CORS requirements prevent opening HTML files directly).

### Option 1: Python HTTP Server

If you have Python installed:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open your browser and navigate to:
```
http://localhost:8000/aiaViewer.html
```

### Option 2: Node.js http-server

If you have Node.js installed:

```bash
# Install globally (one time)
npm install -g http-server

# Run in project directory
http-server -p 8000
```

Or use npx (no installation needed):

```bash
npx http-server -p 8000
```

Then open:
```
http://localhost:8000/aiaViewer.html
```

### Option 3: VS Code Live Server

1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) in VS Code
2. Open the project folder in VS Code
3. Right-click on `aiaViewer.html` in the file explorer
4. Select "Open with Live Server"

### Option 4: Other Web Servers

Any web server that can serve static files will work:
- Apache
- Nginx
- Any other local development server

## Project Structure

```
arcInAction/
├── aiaViewer.html          # Main HTML entry point
├── js/
│   ├── viewer.js          # Main viewer application logic
│   └── text-labels.js     # Text labeling system
├── css/
│   └── viewer.css         # Application styles
├── lib/                   # THREE.js library files
├── fonts/                 # Font files for 3D text
├── model.json             # Default model file
├── simple-model.json      # Simple example model
├── model-files.properties # Additional predefined models
├── doc/
│   ├── english/          # English documentation
│   ├── german/           # German documentation
│   └── img/              # Documentation images
└── README.md             # This file
```

## Basic Usage

1. **Load a Model**: The viewer automatically loads `model.json` on startup. You can also:
   - Click "Modell laden" (Load Model) to load a custom JSON file
   - Use the "Modelle…" (Models) button to switch between predefined models

### Configure Additional Predefined Models

The default models (`model.json` and `simple-model.json`) stay configured in `js/viewer.js`.
Additional predefined models can be managed externally in `model-files.properties`.
This file is optional: if it does not exist, only the default models are shown.

Properties format:

```properties
model.1.name=My Model
model.1.file=model/my-model.json
model.2.name=Another Model
model.2.file=model/another-model.json
```

Notes:
- `name` is the label shown in the model list
- `file` is the relative path to the model JSON file
- Entries are loaded in numeric order (`model.1`, `model.2`, ...)

2. **Interact with the 3D Scene**:
   - **Mouse**: Rotate the view
   - **Mouse Wheel**: Zoom in/out
   - **Shift + Mouse**: Pan the view
   - **Click**: Select components to see details

3. **Control Data Flow Animation**:
   - **Play**: Start automatic animation through all connections
   - **Stop**: Stop the current animation
   - **Prev/Next**: Step through connections manually
   - **Click on connections**: Trigger animation for a specific connection

4. **View Controls**:
   - **Camera Views**: Switch between Isometric, Top, and Front views
   - **Grid**: Toggle grid display
   - **Connection Groups**: Enable/disable groups of connections

## Documentation

### English
- **[Architecture in Action](doc/english/architectureInAction.md)** - Full project documentation
- **[Modeling Instructions](doc/english/modelingInstructions.md)** - Guide to creating JSON models

### German
- **[Architecture in Action (Deutsch)](doc/german/architectureInAction.md)** - Vollständige Projektdokumentation
- **[Modellierungsanleitung (Deutsch)](doc/german/modelingInstructions.md)** - Anleitung zur Erstellung von JSON-Modellen

## Features

- **Multiple Component Types**: Boxes, cylinders (databases), queues, schedulers, actors
- **Layered Architecture**: Organize components into architectural layers
- **Connection Groups**: Group related connections for better organization
- **Animated Data Flows**: Visualize data movement with animated spheres
- **Interactive Details**: Click components to see metadata (owner, version, tech stack, criticality)
- **Camera Presets**: Quick access to common viewing angles
- **Grid System**: Optional grid for spatial reference

## License

Apache License, Version 2.0
