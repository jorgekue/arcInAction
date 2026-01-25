/**
 * @module viewer
 * @description Main viewer application for 3D/4D architecture visualization.
 * Handles scene setup, component rendering, connection visualization,
 * data flow animations, and user interactions.
 */

import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';
import * as LABEL from '../js/text-labels.js';
import { TextGeometry } from '../lib/TextGeometry.js';

// ============================================================================
// Constants and Configuration
// ============================================================================

console.log('Three-Revision:', THREE.REVISION);

/** @type {Array<Object>} Currently active data flow animations */
const activeFlows = [];

/** @type {Array<Object>} Connection groups parsed from the model */
let connectionGroups = [];

/** @type {Array<THREE.Line>} Ordered list of connection line objects for animation sequence */
let connectionSequence = [];

/** @type {number} Current index in the connection sequence for animation playback */
let currentConnectionIndex = 0;

/** @type {THREE.GridHelper|null} Grid helper for spatial reference */
let gridHelper = null;

/** @type {Object} Controller for data flow animation playback */
const flowController = {
    /** @type {boolean} Whether auto-play mode is active */
    isPlaying: false,
    /** @type {string} Animation mode: 'auto' or 'step' */
    mode: 'auto',
    /** @type {number} Default duration in seconds per connection animation */
    defaultDuration: 2
};

/**
 * Predefined model files available in the viewer.
 * @type {Array<{name: string, file: string}>}
 */
const modelFiles = [
    { name: 'Standardmodell', file: 'model.json' },
    { name: 'Einfaches Modell', file: 'simple-model.json' }
    // Additional models can be added here:
    // { name: 'XY', file: 'xy.json' }
];

/** @type {string} Currently loaded model file name */
let currentModelFile = 'model.json';

/**
 * Camera view presets for quick navigation.
 * @type {Array<{id: string, label: string, position: {x: number, y: number, z: number}, target: {x: number, y: number, z: number}}>}
 */
const cameraViews = [
    {
        id: 'iso',
        label: 'Iso',
        position: { x: 10, y: 10, z: 15 },
        target: { x: 0, y: 0, z: 0 }
    },
    {
        id: 'top',
        label: 'Oben',
        position: { x: 0, y: 25, z: 0 },
        target: { x: 0, y: 0, z: 0 }
    },
    {
        id: 'front',
        label: 'Front',
        position: { x: 0, y: 8, z: 25 },
        target: { x: 0, y: 0, z: 0 }
    }
];
/** @type {string} Currently active camera view preset ID */
let currentCameraViewId = 'iso';

/** @type {Object|null} Current camera animation state */
let cameraAnimation = null;

// ============================================================================
// Scene Setup: Scene, Camera, Renderer
// ============================================================================

/** @type {THREE.Scene} Main 3D scene */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

/** @type {THREE.PerspectiveCamera} Main camera */
const camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(10, 10, 15);

/** @type {THREE.WebGLRenderer} WebGL renderer */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

/** @type {OrbitControls} Camera orbit controls for user interaction */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;

// ============================================================================
// Lighting
// ============================================================================

/** @type {THREE.HemisphereLight} Ambient hemisphere light */
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

/** @type {THREE.DirectionalLight} Main directional light */
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// ============================================================================
// Grid and Spatial Reference
// ============================================================================

gridHelper = new THREE.GridHelper(50, 50);
scene.add(gridHelper);
gridHelper.visible = false;

// ============================================================================
// Layer and Label Management
// ============================================================================

/**
 * Adds text labels for each architectural layer in the model.
 * @param {Object} model - The model object containing layers
 * @param {Array<Object>} [model.layers] - Array of layer objects with z and name properties
 */
function addLayerLabels(model) {
    const layers = model.layers || [];
    const y = 0.3;          // Same height as grid labels
    const x = -18;          // Offset to the left of center

    layers.forEach(layer => {
        const z = layer.z || 0;
        const name = layer.name || `Layer ${z}`;

        const label = createTextSprite(name);
        label.position.set(x, y, z);
        scene.add(label);
    });
}


/**
 * Creates a 2D text sprite using canvas-based texture.
 * Used for UI overlays and layer labels.
 * @param {string} text - Text to display (supports multiline with \n)
 * @returns {THREE.Sprite} Text sprite object
 */
function createTextSprite(text) {
    const font = '14px Arial';                // Font size
    const color = '#ffffff';
    const background = 'rgba(0, 0, 0, 0.7)';
    const padding = 6;
    const lineHeight = 18;                    // Line height in pixels

    // Split text into lines
    const lines = String(text).split('\n');

    // Prepare canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = font;

    // Width = widest line, height = number of lines * lineHeight
    let maxLineWidth = 0;
    for (const line of lines) {
        const metrics = context.measureText(line);
        maxLineWidth = Math.max(maxLineWidth, Math.ceil(metrics.width));
    }

    const textWidth = maxLineWidth;
    const textHeight = lineHeight * lines.length;

    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    // Draw background
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text (line by line)
    context.font = font;
    context.fillStyle = color;
    context.textBaseline = 'top';

    lines.forEach((line, index) => {
        const x = padding;
        const y = padding + index * lineHeight;
        context.fillText(line, x, y);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false
    });

    const sprite = new THREE.Sprite(material);

    const worldHeight = 1.0;                 // World space height
    const aspect = canvas.width / canvas.height;
    sprite.scale.set(worldHeight * aspect, worldHeight, 1);

    return sprite;
}


// ============================================================================
// Component Data Structures
// ============================================================================

/** @type {Map<string, THREE.Vector3>} Map of component IDs to their center positions */
const componentCenters = new Map();

/** @type {Map<string, {mesh: THREE.Mesh|THREE.Group, data: Object}>} Map of component IDs to mesh and data */
const componentMeshes = new Map();

/** @type {Object|null} Currently loaded model data */
let modelData = null;

/** @type {THREE.Mesh|null} Last highlighted mesh */
let lastHighlight = null;

// ============================================================================
// Component Details and Highlighting
// ============================================================================

/**
 * Displays component details in the UI panel.
 * @param {Object} component - Component data object
 * @param {string} [component.label] - Component label
 * @param {string} [component.id] - Component ID
 * @param {string} [component.type] - Component type
 * @param {number} [component.x] - X position
 * @param {number} [component.y] - Y position
 * @param {number} [component.layerZ] - Layer Z coordinate
 * @param {Object} [component.metadata] - Component metadata
 */
function showDetails(component) {
    const el = document.getElementById('details-content');
    const meta = component.metadata || {};

    el.innerHTML = `
        <b>${component.label || component.id}</b><br>
        Typ: ${component.type || '-'}<br>
        Position: x=${component.x ?? 0}, y=${component.y ?? 0}<br>
        Layer-Z: ${component.layerZ ?? '-'}<br>
        <br>
        <b>Metadaten</b><br>
        Owner: ${meta.owner || '-'}<br>
        Version: ${meta.version || '-'}<br>
        Tech: ${meta.tech || '-'}<br>
        Kritikalität: ${meta.criticality || '-'}
      `;
}

/**
 * Clears the details panel.
 */
function clearDetails() {
    const el = document.getElementById('details-content');
    el.innerHTML = 'Keine Auswahl';
}

/**
 * Highlights a mesh by setting its emissive color.
 * @param {THREE.Mesh|THREE.Group} mesh - Mesh to highlight
 */
function highlightMesh(mesh) {
    clearHighlight();
    if (mesh.material && 'emissive' in mesh.material) {
        mesh.material.emissive.set(0x333333);
        lastHighlight = mesh;
    }
}

/**
 * Clears the current highlight by resetting emissive color.
 */
function clearHighlight() {
    if (lastHighlight && lastHighlight.material && 'emissive' in lastHighlight.material) {
        lastHighlight.material.emissive.set(0x000000);
    }
    lastHighlight = null;
}

// ============================================================================
// Scene Management
// ============================================================================

/**
 * Clears the scene of all components and connections, keeping only lights and grid.
 * Resets component data structures.
 */
function clearScene() {
    const toRemove = [];
    scene.children.forEach(obj => {
        if (obj !== hemiLight && obj !== dirLight && obj !== gridHelper && obj !== LABEL.yAxisGroup && obj !== LABEL.gridLabelsGroup) {
            toRemove.push(obj);
        }
    });
    toRemove.forEach(obj => scene.remove(obj));

    componentCenters.clear();
    componentMeshes.clear();
    clearDetails();
    clearHighlight();
}

// ============================================================================
// Component Creation
// ============================================================================

/**
 * Creates 3D meshes for all components in the model.
 * Supports multiple component types: boxes, cylinders (databases), queues, schedulers, actors.
 * @param {Object} model - The model object
 * @param {Object} [model.typeStyles] - Style definitions per component type
 * @param {Array<Object>} [model.layers] - Array of layer objects containing components
 */
function createComponents(model) {
    const typeStyles = model.typeStyles || {};
    const layers = model.layers || [];

    layers.forEach(layer => {
        const z = layer.z || 0;
        (layer.components || []).forEach(c => {
            let radius;
            let bodyRadius;
            let bodyHeight;
            const width = c.width || 1;
            const height = c.height || 1;
            const depth = c.depth || 1;

            const typeStyle = typeStyles[c.type] || {};
            const colorValue = c.color || typeStyle.color || '#3399ff';

            let geometry;
            let mesh;
            if (c.type === 'actor') {
                // Actor figure: Cone (body) + Sphere (head)
                bodyRadius = (Math.min(width, depth) || 1) / 2;  // Base radius
                bodyHeight = height || 1.5;                      // Body height
                const headRadius = bodyRadius * 0.6;                   // Head slightly smaller

                // Cone for the body (Cone: Radius, Height)
                const coneGeom = new THREE.ConeGeometry(bodyRadius, bodyHeight, 16);
                const coneMat = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(colorValue),
                    shininess: 30
                });
                const cone = new THREE.Mesh(coneGeom, coneMat);

                // Sphere for the head
                const sphereGeom = new THREE.SphereGeometry(headRadius, 16, 16);
                const sphereMat = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(colorValue),
                    shininess: 30
                });
                const head = new THREE.Mesh(sphereGeom, sphereMat);

                // Cone center is at origin:
                // Cone tip: +bodyHeight/2
                // Upper sphere surface should align with the tip:
                // sphereCenterY + headRadius = bodyHeight/2  → sphereCenterY = bodyHeight/2 - headRadius
                const sphereCenterY = bodyHeight / 2 - headRadius;
                head.position.y = sphereCenterY;


                // Combine both in a Group
                const group = new THREE.Group();
                group.add(cone);
                group.add(head);

                mesh = group;  // Set "mesh" to the group

            } else {


                switch (c.type) {
                    case 'database': {
                        const radiusTop = Math.max(width, depth) / 2;
                        const radiusBottom = radiusTop;
                        radius = radiusTop;
                        geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 24);
                        break;
                    }
                    case 'queue': {
                        const orientation = c.orientation || 'z';

                        let queueLength;
                        if (orientation === 'x') {
                            queueLength = width;
                            radius = depth / 2;
                        } else if (orientation === 'z') {
                            queueLength = depth;
                            radius = width / 2;
                        } else {
                            queueLength = height;
                            radius = Math.max(width, depth) / 2;
                        }

                        geometry = new THREE.CylinderGeometry(radius, radius, queueLength, 24);
                        break;
                    }
                    case 'scheduler': {
                        // Clock body: flat cylinder
                        radius = Math.max(width, height) / 2;
                        const bodyHeight = depth * 0.5; // Slightly flatter than height
                        geometry = new THREE.CylinderGeometry(radius, radius, bodyHeight, 32);
                        break;
                    }

                    default:
                        geometry = new THREE.BoxGeometry(width, height, depth);
                }

                const material = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(colorValue),
                    shininess: 30
                });

                mesh = new THREE.Mesh(geometry, material);

                if (c.type === 'scheduler') {
                    const schedulerGroup = new THREE.Group();

                    // Base clock body (cylinder)
                    const clockBody = mesh;
                    schedulerGroup.add(clockBody);

                    const radius = Math.max(width, height) / 2;
                    const bodyHeight = depth * 0.5;

                    // Clock face
                    const faceGeom = new THREE.CylinderGeometry(
                        radius * 0.98,
                        radius * 0.98,
                        bodyHeight * 0.1,
                        32
                    );
                    const faceMat = new THREE.MeshPhongMaterial({
                        color: 0xffffff,
                        shininess: 10
                    });

                    // Top side (+Y)
                    const faceTop = new THREE.Mesh(faceGeom, faceMat);
                    faceTop.position.y = bodyHeight / 2 + (bodyHeight * 0.05);
                    schedulerGroup.add(faceTop);

                    // Bottom side (-Y)
                    const faceBottom = new THREE.Mesh(faceGeom, faceMat);
                    faceBottom.position.y = -bodyHeight / 2 - (bodyHeight * 0.05);
                    schedulerGroup.add(faceBottom);


                    // ---------- HANDS: Pivot group + offset box ----------

                    const handThickness = bodyHeight * 0.2;
                    const hourHandLength = radius * 0.6;   // Visible total length
                    const minuteHandLength = radius * 0.9; // Visible total length

                    // Y position slightly above clock face
                    const baseHandY = bodyHeight / 2 + bodyHeight * 0.05 + handThickness * 0.5;

                    // --- Hour hand ---

                    // Group with pivot at circle center
                    const hourHandGroup = new THREE.Group();
                    hourHandGroup.position.set(0, baseHandY, 0); // Center of clock

                    // Geometry only half as long
                    const hourHandGeom = new THREE.BoxGeometry(
                        hourHandLength,
                        handThickness,
                        handThickness
                    );
                    const hourHandMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
                    const hourHandMesh = new THREE.Mesh(hourHandGeom, hourHandMat);

                    // Shift box so its inner end is at the pivot
                    // → Hand extends from x=0 (pivot) to x=hourHandLength/2
                    hourHandMesh.position.set(hourHandLength / 2, 0, 0);

                    hourHandGroup.add(hourHandMesh);
                    schedulerGroup.add(hourHandGroup);

                    // Rotation ONLY on the group
                    // Pivot is at circle center → hand rotates cleanly around center
                    hourHandGroup.rotation.y = Math.PI * 0.7; // e.g., 10 o'clock

                    // --- Hour hand bottom ---

                    const hourHandGeomBottom = hourHandGeom; // Same geometry
                    const hourHandMeshBottom = new THREE.Mesh(hourHandGeomBottom, hourHandMat);
                    hourHandMeshBottom.position.set(hourHandLength / 2, 0, 0);

                    const hourHandGroupBottom = new THREE.Group();
                    hourHandGroupBottom.position.set(0, -baseHandY, 0); // Pivot at circle center (bottom)
                    hourHandGroupBottom.add(hourHandMeshBottom);

                    // Same angle direction as top
                    hourHandGroupBottom.rotation.y = Math.PI - Math.PI * 0.7;

                    schedulerGroup.add(hourHandGroupBottom);

                    // --- Minute hand ---

                    const minuteHandGroup = new THREE.Group();
                    minuteHandGroup.position.set(0, baseHandY + handThickness * 0.3, 0);

                    const minuteHandGeom = new THREE.BoxGeometry(
                        minuteHandLength,
                        handThickness * 0.8,
                        handThickness * 0.8
                    );
                    const minuteHandMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
                    const minuteHandMesh = new THREE.Mesh(minuteHandGeom, minuteHandMat);

                    // Also here: inner end at pivot
                    minuteHandMesh.position.set(minuteHandLength / 2, 0, 0);

                    minuteHandGroup.add(minuteHandMesh);
                    schedulerGroup.add(minuteHandGroup);

                    minuteHandGroup.rotation.y = -Math.PI * 0.2; // e.g., 2 o'clock

                    // --- Minute hand bottom ---

                    const minuteHandGeomBottom = minuteHandGeom;
                    const minuteHandMeshBottom = new THREE.Mesh(minuteHandGeomBottom, minuteHandMat);
                    minuteHandMeshBottom.position.set(minuteHandLength / 2, 0, 0);

                    const minuteHandGroupBottom = new THREE.Group();
                    minuteHandGroupBottom.position.set(0, -baseHandY - handThickness * 0.3, 0);
                    minuteHandGroupBottom.add(minuteHandMeshBottom);

                    minuteHandGroupBottom.rotation.y = Math.PI + Math.PI * 0.2;

                    schedulerGroup.add(minuteHandGroupBottom);


                    // ---------- Scheduler group as complete mesh ----------
                    mesh = schedulerGroup;
                }


                // Queue orientation: end faces in X or Z direction
                if (c.type === 'queue') {
                    const orientation = c.orientation || 'z'; // Default: orient along Z direction

                    if (orientation === 'x') {
                        // Rotate cylinder axis from Y to X:
                        // Axis Y → X: Rotation around Z axis by -90° (or +90°, depending on preferred direction)
                        mesh.rotation.z = -Math.PI / 2;
                    } else if (orientation === 'z') {
                        // Rotate cylinder axis from Y to Z:
                        // Axis Y → Z: Rotation around X axis by +90°
                        mesh.rotation.x = Math.PI / 2;
                    } else {
                        // 'y' or unknown → Standard (end faces up/down)
                        // Do nothing
                    }
                }

                // Scheduler orientation (clock)
                if (c.type === 'scheduler') {
                    const orientation = c.orientation || 'y'; // Default: clock face up

                    if (orientation === 'y') {
                        // Lying flat, clock face up → no rotation needed
                    } else if (orientation === 'z') {
                        // Clock face forward (positive Z)
                        // Tilt the flat clock forward around X axis
                        mesh.rotation.x = Math.PI / 2;
                    } else if (orientation === 'x') {
                        // Clock face right (positive X)
                        // Rotate flat clock around Z axis
                        mesh.rotation.z = Math.PI / 2;
                    }
                }
            }

            // Position
            mesh.position.set(c.x || 0, c.y || 0, z);

            // if (c.type === 'database' || c.type === 'queue') {
            //     mesh.position.y = (c.y || 0) + height / 2;
            // }
            // Datenbank/Queue/Scheduler leicht anheben
            if (c.type === 'database' || c.type === 'queue' || c.type === 'scheduler') {
                mesh.position.y = (c.y || 0) + height / 2;
            }


            // Edges only for meshes with geometry (not for queue, person, or actor)
            if (c.type !== 'queue' && c.type !== 'person' && c.type !== 'actor' && geometry) {
                const edgesGeom = new THREE.EdgesGeometry(geometry);
                const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
                const wireframe = new THREE.LineSegments(edgesGeom, lineMaterial);
                mesh.add(wireframe);
            }


            c.layerZ = z;

            // userData including dimensions
            mesh.userData = {
                id: c.id,
                data: c,
                width,
                height,
                depth
            };

            scene.add(mesh);

            // Label direction depending on type
            let labelDir = new THREE.Vector3(0, 0, 1); // Front
            if (c.type === 'database') {
                labelDir.set(1, 0, 0); // Right side
            } else if (c.type === 'person' || c.type === 'actor') {
                labelDir.set(0, 1, 0); // Top
            }
            else if (c.type === 'scheduler') {
                // Scheduler label also on top
                labelDir.set(0, 1, 0);
            }

            // Attach label to mesh (not to scene)
            // addComponentLabel(mesh, c.label || c.id, labelDir);

            const labelText = c.label || c.id;

            if (labelText && LABEL.globalFont) {
                if (c.type === 'database') {
                    // DB cylinder (axis Y):
                    LABEL.addTextOnCylinderEnd(mesh, labelText, radius, height, 'y');
                } else if (c.type === 'queue') {
                    // Queue as cylinder in Z direction:
                    LABEL.addTextOnCylinderEnd(mesh, labelText, radius, depth, 'y');
                } else if (c.type === 'scheduler') {
                    // Clock body as cylinder, e.g., axis Y, text on top:
                    LABEL.addTextOnCylinderEnd(mesh, labelText, radius, depth, 'y');
                } else if (c.type === 'person' || c.type === 'actor') {
                    // Person has coneBody as main body:
                    LABEL.addTextOnConeSide(mesh, labelText, bodyRadius, bodyHeight);
                } else {
                    // Box & other rectangular:
                    LABEL.addTextOnBoxFront(mesh, labelText, width, height, depth);
                }
            }



            // Calculate center (for connections etc.)
            const center = new THREE.Vector3();
            mesh.updateMatrixWorld();
            mesh.getWorldPosition(center);
            componentCenters.set(c.id, center);
            componentMeshes.set(c.id, { mesh, data: c });

        });
    });
}


// function addComponentLabel(componentMesh, text, offsetDir = new THREE.Vector3(0, 0, 1)) {
//     if (!text) return;

//     const sprite = createTextSprite(text);

//     // BoundingBox in WELTkoordinaten
//     const box = new THREE.Box3().setFromObject(componentMesh);
//     const size = new THREE.Vector3();
//     const worldCenter = new THREE.Vector3();
//     box.getSize(size);
//     box.getCenter(worldCenter);

//     // Richtung in WELTkoordinaten (z.B. "Front" = +Z der Welt)
//     const dirWorld = offsetDir.clone().normalize();
//     const absDir = new THREE.Vector3(
//         Math.abs(dirWorld.x),
//         Math.abs(dirWorld.y),
//         Math.abs(dirWorld.z)
//     );

//     const halfSize = size.clone().multiplyScalar(0.5);

//     // Abstand bis zur Oberfläche entlang dieser Richtung
//     const offsetMagnitude =
//         halfSize.x * absDir.x +
//         halfSize.y * absDir.y +
//         halfSize.z * absDir.z;

//     const surfaceOffset = 0.05; // konstante geringe Distanz vor der Oberfläche
//     const worldOffset = dirWorld.multiplyScalar(offsetMagnitude + surfaceOffset);

//     // Weltposition des Labels (direkt vor der Oberfläche)
//     const worldLabelPos = worldCenter.clone().add(worldOffset);

//     // Weltposition in LOKALE Koordinaten des Mesh transformieren
//     const localLabelPos = componentMesh.worldToLocal(worldLabelPos);

//     sprite.position.copy(localLabelPos);

//     // Sprite an das Mesh hängen, nicht an die Scene
//     componentMesh.add(sprite);
// }

// function getHalfExtentsForMesh(mesh) {
//     // Für rotiere/geformte Objekte (z.B. Queue-Zylinder) die reale Ausdehnung nutzen
//     const box = new THREE.Box3().setFromObject(mesh);
//     const size = box.getSize(new THREE.Vector3());
//     return size.multiplyScalar(0.5);
// }

// ============================================================================
// Connection Path Building
// ============================================================================

/**
 * Builds the 3D path for a connection between two components.
 * Path: Start (surface of 'from') -> optional intermediate points -> End (surface of 'to').
 * @param {Object} conn - Connection object
 * @param {string} [conn.begin] - Surface point on source component (e.g., 'z+', 'x-', 'y+')
 * @param {string} [conn.end] - Surface point on target component
 * @param {Array<Object>} [conn.points] - Optional intermediate points [{x, y, z}, ...]
 * @param {THREE.Mesh|THREE.Group} fromMesh - Source component mesh
 * @param {THREE.Mesh|THREE.Group} toMesh - Target component mesh
 * @returns {{pathPoints: Array<THREE.Vector3>, startSurface: THREE.Vector3, endSurface: THREE.Vector3}} Path data
 */
function buildConnectionPath(conn, fromMesh, toMesh) {
    const fromCenter = new THREE.Vector3();
    fromMesh.getWorldPosition(fromCenter);
    const toCenter = new THREE.Vector3();
    toMesh.getWorldPosition(toCenter);

    // Standard-Halbausdehnungen aus userData
    let fromHalf = new THREE.Vector3(
        (fromMesh.userData.width || 1) / 2,
        (fromMesh.userData.height || 1) / 2,
        (fromMesh.userData.depth || 1) / 2
    );
    let toHalf = new THREE.Vector3(
        (toMesh.userData.width || 1) / 2,
        (toMesh.userData.height || 1) / 2,
        (toMesh.userData.depth || 1) / 2
    );

    const pathPoints = [];

    const begin = conn.begin || 'z-'
    const startSurface = getSurfacePoint(fromCenter, fromMesh.userData, begin);
    pathPoints.push(startSurface);

    // Optional intermediate points
    if (Array.isArray(conn.points)) {
        conn.points.forEach(p => {
            if (
                p &&
                typeof p.x === 'number' &&
                typeof p.y === 'number' &&
                typeof p.z === 'number'
            ) {
                pathPoints.push(new THREE.Vector3(p.x, p.y, p.z));
            }
        });
    }

    const end = conn.end || 'z+'
    const endSurface = getSurfacePoint(toCenter, toMesh.userData, end);
    pathPoints.push(endSurface);
    return { pathPoints, startSurface, endSurface };
}

/**
 * Calculates a surface point on a component based on connection point specification.
 * @param {THREE.Vector3} center - Center position of the component
 * @param {Object} userData - Component userData containing width, height, depth
 * @param {string} conPoint - Connection point specifier ('x+', 'x-', 'y+', 'y-', 'z+', 'z-')
 * @returns {THREE.Vector3} Surface point position
 */
function getSurfacePoint(center, userData, conPoint) {
    let surfacePoint;
    switch (conPoint) {
        case 'z+': surfacePoint = center.clone().add(new THREE.Vector3(
            0,
            0,
            (userData.depth || 1) / 2
        )); break;
        case 'z-': surfacePoint = center.clone().add(new THREE.Vector3(
            0,
            0,
            -(userData.depth || 1) / 2
        )); break;
        case 'x+': surfacePoint = center.clone().add(new THREE.Vector3(
            (userData.width || 1) / 2,
            0,
            0
        )); break;
        case 'x-': surfacePoint = center.clone().add(new THREE.Vector3(
            -(userData.width || 1) / 2,
            0,
            0
        )); break;
        case 'y+': surfacePoint = center.clone().add(new THREE.Vector3(
            0,
            (userData.height || 1) / 2,
            0
        )); break;
        case 'y-': surfacePoint = center.clone().add(new THREE.Vector3(
            0,
            -(userData.height || 1) / 2,
            0
        )); break;
    }
    return surfacePoint;
}


/**
 * Creates visual connections (lines and arrows) between components based on the model.
 * @param {Object} model - The model object containing connectionGroups or connections
 */
function createConnections(model) {

    const flatGroups = Array.isArray(connectionGroups) && connectionGroups.length > 0
        ? connectionGroups
        : [{
            name: 'All Connections',
            order: 0,
            active: true,
            connections: Array.isArray(model.connections) ? model.connections : []
        }];

    const allConnections = [];

    flatGroups.forEach(group => {
        const groupName = group.name || 'Group';

        (group.connections || []).forEach(conn => {
            const fromEntry = componentMeshes.get(conn.from);
            const toEntry = componentMeshes.get(conn.to);
            if (!fromEntry || !toEntry) return;

            const fromMesh = fromEntry.mesh;
            const toMesh = toEntry.mesh;

            const { pathPoints, startSurface, endSurface } = buildConnectionPath(conn, fromMesh, toMesh);
            if (pathPoints.length < 2) return;

            const color = (group.color || 0xffffff);

            const lineGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
            const lineMaterial = new THREE.LineBasicMaterial({ color });
            const line = new THREE.Line(lineGeometry, lineMaterial);

            line.userData = {
                type: 'connection',
                connection: conn,
                groupName,           // Group-Name merken
                pathPoints,
                startSurface,
                endSurface
            };

            scene.add(line);

            const lastIndex = pathPoints.length - 1;
            const endPoint = pathPoints[lastIndex];
            const prevPoint = pathPoints[lastIndex - 1];

            const dir = endPoint.clone().sub(prevPoint).normalize();
            const segLength = prevPoint.distanceTo(endPoint);

            // Arrow length: maximum segment length minus small safety gap
            let tipGap = 0.02; // Distance of arrow tip from surface

            const maxArrowLength = Math.max(segLength - tipGap, 0.05); // mind. 0.05, damit er nicht verschwindet
            const arrowLength = Math.min(maxArrowLength, 1.5);

            const arrowOrigin = endPoint.clone().sub(dir.clone().multiplyScalar(arrowLength));
            const arrow = new THREE.ArrowHelper(
                dir,
                arrowOrigin,
                arrowLength,
                color,
                0.6,
                0.3
            );
            arrow.userData = {
                type: 'connectionArrow',
                connection: conn,
                groupName,           // Group-Name merken
                pathPoints,
                startSurface,
                endSurface
            };

            scene.add(arrow);

            allConnections.push({ line, arrow, conn, groupName });
        });
    });

    console.log('Created connections:', allConnections.length);

    // danach Sequenz für Animation neu aufbauen
    rebuildConnectionSequence();
    // und Sichtbarkeit auf aktuellen Group-Status setzen:
    updateConnectionVisibilityFromGroups();
}

/**
 * Updates visibility of connections based on active/inactive connection groups.
 */
function updateConnectionVisibilityFromGroups() {
    if (!Array.isArray(connectionGroups) || connectionGroups.length === 0) {
        return;
    }

    // Map for quick access: groupName -> active
    const activeMap = new Map();
    connectionGroups.forEach(g => {
        activeMap.set(g.name || 'Group', !!g.active);
    });

    scene.traverse(obj => {
        if (!obj.userData) return;

        const ud = obj.userData;
        if (ud.type === 'connection' || ud.type === 'connectionArrow') {
            const groupName = ud.groupName || 'Group';
            const isActive = activeMap.get(groupName);

            // Falls Gruppe nicht bekannt (z.B. Fallback), default = true
            obj.visible = (isActive === undefined) ? true : isActive;
        }
    });
}

/**
 * Rebuilds the connection sequence for animation playback.
 * Orders connections by group order and connection order within groups.
 */
function rebuildConnectionSequence() {
    connectionSequence = [];
    currentConnectionIndex = 0;

    // 1. aktive Gruppen nach order sortieren
    const activeGroups = connectionGroups
        .filter(g => g.active)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (activeGroups.length === 0) {
        console.log('rebuildConnectionSequence: no active groups');
        return;
    }

    // 2. aus Szene alle Connection-Lines einsammeln
    const allConnectionLines = [];
    scene.traverse(obj => {
        if (obj.userData && obj.userData.type === 'connection') {
            allConnectionLines.push(obj);
        }
    });

    // 3. For each active group and its connections, find the matching line
    activeGroups.forEach(group => {
        // innerhalb der Group nach order sortieren
        const conns = group.connections.slice().sort((a, b) => {
            const oa = a.order != null ? a.order : 0;
            const ob = b.order != null ? b.order : 0;
            return oa - ob;
        });

        conns.forEach(conn => {
            const line = allConnectionLines.find(lineObj => {
                const c = lineObj.userData && lineObj.userData.connection;
                if (!c) return false;
                // Identifikation via from/to/label/order etc.
                return c.from === conn.from &&
                    c.to === conn.to &&
                    (c.order === conn.order || conn.order == null) &&
                    (c.label === conn.label || conn.label == null);
            });

            if (line) {
                connectionSequence.push(line);
            } else {
                console.warn('No line found for connection in group', group.name, conn);
            }
        });
    });

    console.log('rebuildConnectionSequence: sequence length', connectionSequence.length);
}

// ============================================================================
// Data Flow Animation
// ============================================================================

/**
 * Starts a data flow animation along a connection path.
 * Creates an animated sphere that moves along the connection line.
 * @param {THREE.Line|THREE.ArrowHelper} connObject - Connection line or arrow object
 * @param {Object} [options] - Animation options
 * @param {number} [options.duration] - Animation duration in seconds (overrides model/default)
 * @param {boolean} [options.loop=false] - Whether to loop the animation
 * @param {number} [options.direction=1] - Animation direction (1 = forward, -1 = backward)
 */
function startDataFlowOnConnection(connObject, options = {}) {
    const pathPoints = (connObject.userData && connObject.userData.pathPoints) || null;
    const conn = connObject.userData && connObject.userData.connection;

    if (!pathPoints || pathPoints.length < 2) {
        console.warn('No pathPoints for connection, animation not possible');
        return;
    }

    const modelDuration = conn && conn.flowDuration;
    const baseDuration = modelDuration != null ? modelDuration : flowController.defaultDuration;
    const duration = options.duration != null ? options.duration : baseDuration;
    const loop = options.loop ?? false;
    const direction = options.direction || 1;

    const geometry = new THREE.SphereGeometry(0.15, 16, 16);

    let color = 'yellow';
    // if (conn && conn.type === 'db') color = 0xffcc00;
    // if (conn && conn.type === 'http') color = 0x00ffff;
    // if (conn && conn.type === 'async') color = 0xff00ff;

    const material = new THREE.MeshBasicMaterial({ color });
    const flowMesh = new THREE.Mesh(geometry, material);

    flowMesh.position.copy(pathPoints[0]);
    scene.add(flowMesh);

    // optionales Label
    let labelSprite = null;
    const labelText = conn && conn.label;
    if (labelText) {
        labelSprite = createTextSprite(labelText);
        labelSprite.position.set(0, 0.5, 0);
        flowMesh.add(labelSprite);
    }
    
    const pathPointsFlow = Array.from(pathPoints);
    // Reverse order for inbound connections
    if (conn.direction === 'inbound') {
        pathPointsFlow.reverse();
    }

    activeFlows.push({
        object3D: flowMesh,
        labelSprite,
        pathPoints: pathPointsFlow.map(p => p.clone()),
        duration,
        elapsed: direction === 1 ? 0 : duration,
        loop,
        direction
    });
}

// ============================================================================
// Model Loading
// ============================================================================

/**
 * Loads a model from a JavaScript object.
 * Clears the current scene and creates all components and connections.
 * @param {Object} model - Model object with layers, connectionGroups, etc.
 */
function loadModelFromObject(model) {
    clearScene();
    modelData = model;
    addLayerLabels(model);
    createComponents(model);
    // Get connectionGroups from model
    setupConnectionGroupsFromModel(model);
    createConnections(model);
}

/**
 * Sets up connection groups from the model data.
 * Supports both new structure (connectionGroups array) and legacy structure (flat connections array).
 * @param {Object} model - Model object
 * @param {Array<Object>} [model.connectionGroups] - New structure: array of connection groups
 * @param {Array<Object>} [model.connections] - Legacy structure: flat array of connections
 */
function setupConnectionGroupsFromModel(model) {
    // 1. Use new structure if it exists
    if (Array.isArray(model.connectionGroups) && model.connectionGroups.length > 0) {
        connectionGroups = model.connectionGroups.map((g, index) => ({
            name: g.name || `Group ${index + 1}`,
            order: g.order != null ? g.order : index,
            color: g.color || 0xffffff,
            active: g.active !== false, // Default: true
            connections: Array.isArray(g.connections) ? g.connections : []
        }));
    } else {
        // 2. Fallback: old structure -> build a default group
        const flatConnections = Array.isArray(model.connections) ? model.connections : [];
        connectionGroups = [{
            name: 'All Connections',
            order: 0,
            active: true,
            connections: flatConnections
        }];
    }

    // Sort groups by order
    connectionGroups.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Update UI
    buildConnectionGroupsUI();
}

/**
 * Loads a model from a JSON file via fetch.
 * @param {string} fileName - Path to the JSON model file
 * @returns {Promise<void>} Promise that resolves when model is loaded
 */
function loadModelFromFile(fileName) {
    currentModelFile = fileName;

    return fetch(fileName)
        .then(resp => {
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status} beim Laden von ${fileName}`);
            }
            return resp.json();
        })
        .then(model => {
            loadModelFromObject(model);
            updateModelListUI();
        })
        .catch(err => {
            console.error('Error loading model:', err);
            alert('Error loading model: ' + fileName);
        });
}

// ============================================================================
// UI: Model List
// ============================================================================

/**
 * Builds the UI panel for selecting predefined models.
 */
function buildModelListUI() {
    const panel = document.getElementById('modelListPanel');
    if (!panel) {
        console.warn('modelListPanel not found');
        return;
    }

    panel.innerHTML = '';

    const title = document.createElement('h4');
    title.textContent = 'Available Models';
    panel.appendChild(title);

    const ul = document.createElement('ul');

    modelFiles.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = `${entry.name} (${entry.file})`;
        li.dataset.file = entry.file;

        li.addEventListener('click', () => {
            loadModelFromFile(entry.file);
        });

        ul.appendChild(li);
    });

    panel.appendChild(ul);

    updateModelListUI();
}

/**
 * Updates the model list UI to highlight the currently active model.
 */
function updateModelListUI() {
    const panel = document.getElementById('modelListPanel');
    if (!panel) return;

    const lis = panel.querySelectorAll('li');
    lis.forEach(li => {
        if (li.dataset.file === currentModelFile) {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }
    });
}

/**
 * Initializes the toggle button for showing/hiding the model list panel.
 */
function initModelListToggle() {
    const btn = document.getElementById('toggleModelListBtn');
    const panel = document.getElementById('modelListPanel');
    if (!btn || !panel) {
        console.warn('ModelList toggle elements not found');
        return;
    }

    btn.addEventListener('click', () => {
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            if (!panel.dataset.initialized) {
                buildModelListUI();
                panel.dataset.initialized = 'true';
            } else {
                updateModelListUI();
            }
        }
    });
}


/**
 * Initializes the info/impressum dialog overlay.
 * Handles opening, closing, and keyboard (ESC) interactions.
 */
function initImpressumDialog() {
  const btnImpressum = document.getElementById('btn-impressum');
  const overlay = document.getElementById('impressum-overlay');
  const btnClose = document.getElementById('btn-impressum-close');

  if (!btnImpressum || !overlay || !btnClose) {
    return;
  }

  const open = () => {
    overlay.style.display = 'flex';
  };

  const close = () => {
    overlay.style.display = 'none';
  };

  btnImpressum.addEventListener('click', open);
  btnClose.addEventListener('click', close);

  // Click on semi-transparent background closes dialog
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) {
      close();
    }
  });

  // ESC key closes dialog
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && overlay.style.display !== 'none') {
      close();
    }
  });
}



/**
 * Initializes the data flow control buttons (Play, Stop, Prev, Next).
 */
function initFlowControls() {
    const btnPrev = document.getElementById('btn-flow-prev');
    const btnPlay = document.getElementById('btn-flow-play');
    const btnStop = document.getElementById('btn-flow-stop');
    const btnNext = document.getElementById('btn-flow-next');

    if (!btnPrev || !btnPlay || !btnStop || !btnNext) {
        console.warn('Flow control buttons not found');
        return;
    }

    btnPrev.addEventListener('click', () => {
        playPrevStep();
    });

    btnPlay.addEventListener('click', () => {
        // If at end, restart from beginning
        if (currentConnectionIndex >= connectionSequence.length) {
            currentConnectionIndex = 0;
        }
        flowController.isPlaying = true;
        updateFlowControlButtons();
    });

    btnStop.addEventListener('click', () => {
        stopAutoPlay();
    });

    btnNext.addEventListener('click', () => {
        playNextStep();
    });

    updateFlowControlButtons();
}

/**
 * Initializes the view panel controls (grid toggle, etc.).
 */
function initViewPanel() {
    const chkGrid = document.getElementById('chk-view-grid');
    if (!chkGrid) {
        console.warn('chk-view-grid not found');
        return;
    }
    LABEL.gridLabelsGroup.visible = false;
    LABEL.yAxisGroup.visible = false;
    gridHelper.visible = false;
    chkGrid.checked = false

    chkGrid.addEventListener('change', () => {
        const visible = chkGrid.checked;

        if (gridHelper) {
            gridHelper.visible = visible;
        }
        if (LABEL.gridLabelsGroup) {
            LABEL.gridLabelsGroup.visible = visible;
        }
        if (LABEL.yAxisGroup) {
            LABEL.yAxisGroup.visible = visible;
        }
    });
}

/**
 * Updates the enabled/disabled state of flow control buttons based on playback state.
 */
function updateFlowControlButtons() {
    const btnPlay = document.getElementById('btn-flow-play');
    const btnStop = document.getElementById('btn-flow-stop');

    if (!btnPlay || !btnStop) return;

    if (flowController.isPlaying) {
        btnPlay.disabled = true;
        btnStop.disabled = false;
    } else {
        btnPlay.disabled = false;
        btnStop.disabled = true;
    }
}


// ============================================================================
// Camera Controls
// ============================================================================

/**
 * Builds the camera control buttons for switching between preset views.
 */
function buildCameraControls() {
    const container = document.getElementById('cameraControls');
    if (!container) {
        console.warn('cameraControls container not found');
        return;
    }

    container.innerHTML = 'View: ';

    cameraViews.forEach(view => {
        const btn = document.createElement('button');
        btn.textContent = view.label;
        btn.dataset.viewId = view.id;

        btn.addEventListener('click', () => {
            setCameraView(view.id, true);
        });

        container.appendChild(btn);
    });
    updateCameraControlsUI();
}

/**
 * Updates the camera control buttons to highlight the active view.
 */
function updateCameraControlsUI() {
    const container = document.getElementById('cameraControls');
    if (!container) return;

    const buttons = container.querySelectorAll('button');
    buttons.forEach(btn => {
        if (btn.dataset.viewId === currentCameraViewId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * Sets the camera to a predefined view position.
 * @param {string} viewId - ID of the camera view preset ('iso', 'top', 'front')
 * @param {boolean} [animate=true] - Whether to animate the camera movement
 */
function setCameraView(viewId, animate = true) {
    const view = cameraViews.find(v => v.id === viewId);
    if (!view) {
        console.warn('Unknown camera view:', viewId);
        return;
    }

    currentCameraViewId = viewId;
    updateCameraControlsUI();

    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();
    const toPos = new THREE.Vector3(view.position.x, view.position.y, view.position.z);
    const toTarget = new THREE.Vector3(view.target.x, view.target.y, view.target.z);

    if (!animate) {
        camera.position.copy(toPos);
        controls.target.copy(toTarget);
        controls.update();
        return;
    }

    cameraAnimation = {
        t: 0,
        duration: 0.8,
        fromPos,
        fromTarget,
        toPos,
        toTarget
    };
}

// ============================================================================
// User Interaction: Mouse Click
// ============================================================================

/** @type {THREE.Raycaster} Raycaster for mouse picking */
const raycaster = new THREE.Raycaster();

/** @type {THREE.Vector2} Mouse position in normalized device coordinates */
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', onClick, false);

/**
 * Handles mouse click events on the 3D scene.
 * Supports clicking on components (shows details) and connections (starts animation).
 * @param {MouseEvent} event - Mouse click event
 */
function onClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length === 0) {
        clearDetails();
        clearHighlight();
        return;
    }

    const obj = intersects[0].object;
    // 1. Komponenten-Klick wie bisher
    const mesh = findComponentMesh(obj);
    if (mesh && mesh.userData && mesh.userData.data) {
        const comp = mesh.userData.data;
        showDetails(comp);
        highlightMesh(mesh);
        return;
    }


    // 2. Verbindungslinie?
    if (obj.userData && obj.userData.type === 'connection') {
        startDataFlowOnConnection(obj, { loop: false });
        return;
    }

    // 3. Pfeil?
    if (obj.userData && obj.userData.type === 'connectionArrow') {
        startDataFlowOnConnection(obj, { loop: false });
        return;
    }

    // sonst
    clearDetails();
    clearHighlight();
}

/**
 * Finds the component mesh by traversing up the object hierarchy.
 * @param {THREE.Object3D} obj - Object to start search from
 * @returns {THREE.Mesh|THREE.Group|null} Component mesh if found, null otherwise
 */
function findComponentMesh(obj) {
    let current = obj;
    while (current && !current.userData?.data && current.parent) {
        current = current.parent;
    }
    return current && current.userData?.data ? current : null;
}

// ============================================================================
// Animation Loop
// ============================================================================

/** @type {THREE.Clock} Clock for animation timing */
const clock = new THREE.Clock();

/**
 * Updates camera animation if one is in progress.
 * @param {number} delta - Time delta since last frame
 */
function updateCameraAnimation(delta) {
    if (!cameraAnimation) return;

    cameraAnimation.t += delta / cameraAnimation.duration;
    const t = Math.min(cameraAnimation.t, 1);

    const pos = cameraAnimation.fromPos.clone().lerp(cameraAnimation.toPos, t);
    const target = cameraAnimation.fromTarget.clone().lerp(cameraAnimation.toTarget, t);

    camera.position.copy(pos);
    controls.target.copy(target);
    controls.update();

    if (t >= 1) {
        cameraAnimation = null;
    }
}

/**
 * Main animation loop.
 * Updates camera animations, data flows, auto-play, and renders the scene.
 */
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    updateCameraAnimation(delta);
    const hasRunningFlows = updateDataFlows(delta);
    updateAutoPlay(delta, hasRunningFlows);

    controls.update();
    renderer.render(scene, camera);
}

// ============================================================================
// Window Resize Handler
// ============================================================================

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


await LABEL.loadFontAsync();          // Font laden
// --- Start: initial model.json laden ---
initModelListToggle();
initImpressumDialog();
buildCameraControls();
setCameraView(currentCameraViewId, false);

loadModelFromFile(currentModelFile).finally(() => {
    scene.add(LABEL.createYAxis(10, 1)); // Y-Achse dazu
    LABEL.addYAxisLabels(10, 1);
    scene.add(LABEL.addGridLabels());   // Gitter beschriften
    initFlowControls();
    initViewPanel();
    animate();
});


// ============================================================================
// File Input: Load Custom Model
// ============================================================================

const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const json = JSON.parse(e.target.result);
            loadModelFromObject(json);
        } catch (err) {
            console.error('Error parsing JSON file:', err);
            alert('The file is not a valid JSON model file.');
        }
    };
    reader.readAsText(file);
});

/**
 * Updates all active data flow animations.
 * @param {number} delta - Time delta since last frame
 * @returns {boolean} Whether any flows are still running
 */
function updateDataFlows(delta) {
    let anyRunning = false;

    for (let i = activeFlows.length - 1; i >= 0; i--) {
        const flow = activeFlows[i];
        flow.elapsed += delta * flow.direction;

        const tRaw = flow.elapsed / flow.duration;

        // Loop-Handling
        if (!flow.loop && (tRaw > 1 || tRaw < 0)) {
            // Animation fertig -> Objekte entfernen
            scene.remove(flow.object3D);   // labelSprite is attached to object3D
            activeFlows.splice(i, 1);
            continue;
        }

        anyRunning = true;

        let t = tRaw;
        if (flow.loop) {
            t = ((t % 1) + 1) % 1; // t in [0,1)
        } else {
            t = Math.max(0, Math.min(1, t));
        }

        // Position entlang des Pfades interpolieren
        const pos = getPointOnPath(flow.pathPoints, t);
        flow.object3D.position.copy(pos);
    }
    return anyRunning;
}

/**
 * Calculates a point along a path at a given parameter t (0 to 1).
 * Uses distance-based interpolation for smooth movement along multi-segment paths.
 * @param {Array<THREE.Vector3>} points - Array of path points
 * @param {number} t - Parameter from 0 (start) to 1 (end)
 * @returns {THREE.Vector3} Interpolated point on the path
 */
function getPointOnPath(points, t) {
    if (points.length === 1) return points[0].clone();
    if (t <= 0) return points[0].clone();
    if (t >= 1) return points[points.length - 1].clone();

    // Calculate total path length
    let totalLength = 0;
    const segmentLengths = [];

    for (let i = 0; i < points.length - 1; i++) {
        const len = points[i].distanceTo(points[i + 1]);
        segmentLengths.push(len);
        totalLength += len;
    }

    const targetLength = t * totalLength;

    // passenden Abschnitt finden
    let acc = 0;
    for (let i = 0; i < segmentLengths.length; i++) {
        const segLen = segmentLengths[i];
        if (acc + segLen >= targetLength) {
            const localT = (targetLength - acc) / segLen;
            const p0 = points[i];
            const p1 = points[i + 1];
            return new THREE.Vector3().lerpVectors(p0, p1, localT);
        }
        acc += segLen;
    }

    return points[points.length - 1].clone();
}


/**
 * Updates auto-play mode: automatically starts next connection animation when current one finishes.
 * @param {number} delta - Time delta (unused but kept for consistency)
 * @param {boolean} hasRunningFlows - Whether any flow animations are currently running
 */
function updateAutoPlay(delta, hasRunningFlows) {
    if (!flowController.isPlaying) return;

    // If a flow is still running, wait
    if (hasRunningFlows) return;

    // If all connections are done, stop
    if (currentConnectionIndex >= connectionSequence.length) {
        flowController.isPlaying = false;
        updateFlowControlButtons(); // UI aktualisieren
        return;
    }

    const connLine = connectionSequence[currentConnectionIndex];
    startDataFlowOnConnection(connLine, {
        loop: false
    });

    currentConnectionIndex++;
}

/**
 * Stops and removes all active data flow animations.
 */
function stopAllFlows() {
    for (const flow of activeFlows) {
        scene.remove(flow.object3D);
    }
    activeFlows.length = 0;
}

// function playFromStart() {
//     stopAllFlows();
//     currentConnectionIndex = 0;
//     flowController.isPlaying = true;
//     updateFlowControlButtons();
// }

/**
 * Stops auto-play mode and clears all active flows.
 */
function stopAutoPlay() {
    flowController.isPlaying = false;
    stopAllFlows();
    updateFlowControlButtons();
}

/**
 * Plays the next connection in the sequence.
 */
function playNextStep() {
    stopAllFlows();
    flowController.isPlaying = false;

    if (connectionSequence.length === 0) return;

    if (currentConnectionIndex >= connectionSequence.length) {
        currentConnectionIndex = connectionSequence.length - 1;
    }

    const connLine = connectionSequence[currentConnectionIndex];
    startDataFlowOnConnection(connLine, {
        loop: false
    });

    currentConnectionIndex++;
}

/**
 * Plays the previous connection in the sequence.
 */
function playPrevStep() {
    stopAllFlows();
    flowController.isPlaying = false;

    if (connectionSequence.length === 0) return;

    // Go back one, but not less than 0
    currentConnectionIndex = Math.max(currentConnectionIndex - 2, 0);

    const connLine = connectionSequence[currentConnectionIndex];
    startDataFlowOnConnection(connLine, {
        loop: false
    });

    currentConnectionIndex++;
}

/**
 * Builds the UI for connection group checkboxes.
 * Allows users to enable/disable groups of connections.
 */
function buildConnectionGroupsUI() {
    const container = document.getElementById('connection-groups-list');
    if (!container) {
        console.warn('connection-groups-list not found');
        return;
    }

    container.innerHTML = '';

    connectionGroups.forEach((group, index) => {
        const row = document.createElement('div');
        row.className = 'connection-group-row';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = group.active;

        checkbox.addEventListener('change', () => {
            group.active = checkbox.checked;
            // 1. Update visibility of connections
            updateConnectionVisibilityFromGroups();

            // 2. Rebuild animation playlist
            rebuildConnectionSequence();
        });

        const label = document.createElement('span');
        label.textContent = `${group.order}: ${group.name}`;

        row.appendChild(checkbox);
        row.appendChild(label);
        container.appendChild(row);
    });

    rebuildConnectionSequence();


}








