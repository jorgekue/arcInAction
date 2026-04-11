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

/** @type {string} Path to external properties file containing additional model definitions */
const externalModelPropertiesFile = 'model-files.properties';

/** @type {Array<Object>} Connection groups parsed from the model */
let connectionGroups = [];

/** @type {Array<THREE.Line>} Ordered list of connection line objects for animation sequence */
let connectionSequence = [];

/** @type {number} Current index in the connection sequence for animation playback */
let currentConnectionIndex = 0;

/** @type {number} Index of the currently selected/last played connection */
let currentSelectedConnectionIndex = -1;

/** @type {number} Default color for connections when no group color is defined */
const defaultConnectionColor = 0xbfbfbf;

/** @type {THREE.GridHelper|null} Grid helper for spatial reference */
let gridHelper = null;

/** @type {Object} Controller for data flow animation playback */
const flowController = {
    /** @type {boolean} Whether auto-play mode is active */
    isPlaying: false,
    /** @type {string} Animation mode: 'auto' or 'step' */
    mode: 'auto',
    /** @type {number} Default duration in seconds per connection animation */
    defaultDuration: 3
};

/** @type {{flowDurationMin: number, flowSpeed: number}} Global flow timing settings from model.settings */
const modelFlowTimingSettings = {
    flowDurationMin: 3,
    flowSpeed: 2.5
};

/** @type {{animateComponents: boolean, selectConnectionsAndComponents: boolean, showComponentPosition: boolean}} Global visual settings from model.settings */
const modelVisualSettings = {
    animateComponents: false,
    selectConnectionsAndComponents: false,
    showComponentPosition: false
};

/** @type {{showDeveloperControls: boolean, undoRedoDepth: number}} Developer settings from model.settings */
const modelDeveloperSettings = {
    showDeveloperControls: false,
    undoRedoDepth: 50
};

/** @type {{maxDepth: number, undoStack: Array<{before: string, after: string}>, redoStack: Array<{before: string, after: string}>, isApplying: boolean}} Undo/Redo edit history */
const developerEditHistory = {
    maxDepth: 50,
    undoStack: [],
    redoStack: [],
    isApplying: false
};

/**
 * Predefined model files available in the viewer.
 * @type {Array<{name: string, file: string}>}
 */
const defaultModelFiles = [
    { name: 'Standard model', file: 'model.json' },
    { name: 'Simple model', file: 'simple-model.json' }
];

/** @type {Array<{name: string, file: string}>} Full list of available models (default + external) */
const modelFiles = [...defaultModelFiles];

/** @type {string} Currently loaded model file name */
let currentModelFile = 'model.json';


/**
 * Parses a .properties text content into key/value pairs.
 * Supports comments (#, !) and separators '=' or ':'.
 * @param {string} text - Raw properties text
 * @returns {Object<string, string>} Parsed key/value map
 */
function parseProperties(text) {
    const properties = {};
    const lines = text.split(/\r?\n/);

    lines.forEach(rawLine => {
        const line = rawLine.trim();
        if (!line || line.startsWith('#') || line.startsWith('!')) {
            return;
        }

        const separatorMatch = line.match(/[:=]/);
        if (!separatorMatch || separatorMatch.index == null) {
            return;
        }

        const separatorIndex = separatorMatch.index;
        const key = line.substring(0, separatorIndex).trim();
        const value = line.substring(separatorIndex + 1).trim();

        if (key) {
            properties[key] = value;
        }
    });

    return properties;
}

/**
 * Parses external model definitions from properties.
 * Expected format:
 * model.1.name=My Model
 * model.1.file=model/my-model.json
 * @param {string} propertiesText - Raw properties file content
 * @returns {Array<{name: string, file: string}>} Parsed model entries
 */
function parseModelFilesFromProperties(propertiesText) {
    const properties = parseProperties(propertiesText);
    const indexedModels = new Map();

    Object.entries(properties).forEach(([key, value]) => {
        const match = key.match(/^model\.(\d+)\.(name|file)$/i);
        if (!match) {
            return;
        }

        const index = Number(match[1]);
        const field = match[2].toLowerCase();

        if (!indexedModels.has(index)) {
            indexedModels.set(index, { name: '', file: '' });
        }

        indexedModels.get(index)[field] = value;
    });

    return [...indexedModels.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, entry]) => ({
            name: (entry.name || '').trim(),
            file: (entry.file || '').trim()
        }))
        .filter(entry => entry.name && entry.file);
}

/**
 * Loads additional model definitions from external properties file.
 * Keeps default models from viewer.js and appends external unique entries.
 * @returns {Promise<void>} Promise that resolves after loading/merging external models
 */
async function loadAdditionalModelFilesFromProperties() {
    try {
        const response = await fetch(externalModelPropertiesFile);
        if (!response.ok) {
            return;
        }

        const propertiesText = await response.text();
        const externalModels = parseModelFilesFromProperties(propertiesText);
        if (!externalModels.length) {
            return;
        }

        const existingFiles = new Set(modelFiles.map(entry => entry.file));
        externalModels.forEach(entry => {
            if (!existingFiles.has(entry.file)) {
                modelFiles.push(entry);
                existingFiles.add(entry.file);
            }
        });

        const panel = document.getElementById('modelListPanel');
        if (panel && panel.dataset.initialized) {
            buildModelListUI();
        }
    } catch (err) {
        // Optional configuration file: ignore fetch/network errors silently.
        return;
    }
}

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
        label: 'Top',
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

/** @type {Map<string, number>} Active flow reference count per component ID */
const activeComponentFlowCounts = new Map();

/** @type {Object|null} Currently loaded model data */
let modelData = null;

/** @type {THREE.Mesh|null} Last highlighted mesh */
let lastHighlight = null;

/** @type {THREE.Mesh|null} Ring marker for current source component */
let currentFromComponentMarker = null;

/** @type {THREE.Mesh|null} Ring marker for current target component */
let currentToComponentMarker = null;

/** @type {{enabled: boolean, selectedLine: THREE.Line|null, selectedColor: number, pointColor: number, activePointColor: number, hoverPointColor: number, selectedPointIndex: number, pointHandles: Array<THREE.Mesh>, hoverInsertMarker: THREE.Mesh|null, isDraggingPoint: boolean, dragPointerId: number|null, dragPlane: THREE.Plane|null, dragStartIntersection: THREE.Vector3|null, dragStartPoint: THREE.Vector3|null, dragBeforeSnapshot: string|null, dragBeforeSelection: {identity: string, pointIndex: number}|null}} Developer mode runtime state */
const developerModeState = {
    enabled: false,
    selectedLine: null,
    selectedColor: 0x00e5ff,
    pointColor: 0xffffff,
    activePointColor: 0xff4d4f,
    hoverPointColor: 0x00ff99,
    selectedPointIndex: -1,
    pointHandles: [],
    hoverInsertMarker: null,
    isDraggingPoint: false,
    dragPointerId: null,
    dragPlane: null,
    dragStartIntersection: null,
    dragStartPoint: null,
    dragBeforeSnapshot: null,
    dragBeforeSelection: null
};

/** @type {THREE.Raycaster} Raycaster used in developer mode for line picking */
const developerRaycaster = new THREE.Raycaster();
developerRaycaster.params.Line = { threshold: 0.4 };

/** @type {THREE.Vector2} Normalized device coordinates of pointer */
const developerPointerNdc = new THREE.Vector2();

/**
 * Rounds a numeric coordinate for stable JSON output.
 * @param {number} value
 * @returns {number}
 */
function roundCoordinate(value) {
    return Math.round(value * 1000) / 1000;
}

/**
 * Snaps a numeric value to fixed increments.
 * @param {number} value
 * @param {number} step
 * @returns {number}
 */
function snapToStep(value, step) {
    return Math.round(value / step) * step;
}

/**
 * Takes a full JSON snapshot of current model state.
 * @returns {string|null}
 */
function createModelSnapshot() {
    if (!modelData) {
        return null;
    }

    try {
        return JSON.stringify(modelData);
    } catch (err) {
        console.warn('Could not create model snapshot for history.', err);
        return null;
    }
}

/**
 * Resets undo/redo history for current editing session.
 */
function resetDeveloperHistory() {
    developerEditHistory.undoStack = [];
    developerEditHistory.redoStack = [];
    updateDeveloperModeUI();
}

/**
 * Records an edit operation in undo history.
 * @param {string|null} beforeSnapshot
 * @param {string|null} afterSnapshot
 * @param {{identity: string, pointIndex: number}|null} [beforeSelection]
 * @param {{identity: string, pointIndex: number}|null} [afterSelection]
 */
function recordDeveloperHistory(beforeSnapshot, afterSnapshot, beforeSelection = null, afterSelection = null) {
    if (developerEditHistory.isApplying) {
        return;
    }

    if (!beforeSnapshot || !afterSnapshot || beforeSnapshot === afterSnapshot) {
        return;
    }

    developerEditHistory.undoStack.push({
        before: beforeSnapshot,
        after: afterSnapshot,
        beforeSelection,
        afterSelection
    });

    if (developerEditHistory.undoStack.length > developerEditHistory.maxDepth) {
        developerEditHistory.undoStack.splice(0, developerEditHistory.undoStack.length - developerEditHistory.maxDepth);
    }

    developerEditHistory.redoStack = [];
    updateDeveloperModeUI();
}

/**
 * Captures current active state of connection groups.
 * @returns {{byOrderName: Map<string, boolean>, byName: Map<string, boolean>}}
 */
function captureConnectionGroupSelectionState() {
    const byOrderName = new Map();
    const byName = new Map();

    connectionGroups.forEach((group, index) => {
        const orderValue = group.order != null ? group.order : index;
        const nameValue = group.name || `Group ${index + 1}`;
        const activeValue = group.active !== false;

        byOrderName.set(`${orderValue}|${nameValue}`, activeValue);
        if (!byName.has(nameValue)) {
            byName.set(nameValue, activeValue);
        }
    });

    return { byOrderName, byName };
}

/**
 * Restores active state of connection groups from a snapshot.
 * @param {{byOrderName: Map<string, boolean>, byName: Map<string, boolean>}|null} snapshot
 */
function restoreConnectionGroupSelectionState(snapshot) {
    if (!snapshot || !Array.isArray(connectionGroups) || connectionGroups.length === 0) {
        return;
    }

    connectionGroups.forEach((group, index) => {
        const orderValue = group.order != null ? group.order : index;
        const nameValue = group.name || `Group ${index + 1}`;
        const key = `${orderValue}|${nameValue}`;

        if (snapshot.byOrderName.has(key)) {
            group.active = snapshot.byOrderName.get(key);
            return;
        }

        if (snapshot.byName.has(nameValue)) {
            group.active = snapshot.byName.get(nameValue);
        }
    });

    updateConnectionVisibilityFromGroups();
    buildConnectionGroupsUI();
}

/**
 * Builds a stable identity key for a connection.
 * @param {string} groupName
 * @param {Object} conn
 * @returns {string}
 */
function buildDeveloperConnectionIdentity(groupName, conn) {
    const safeGroup = groupName || '';
    const safeConn = conn || {};
    const order = safeConn.order != null ? safeConn.order : '';

    return [
        safeGroup,
        order,
        safeConn.from || '',
        safeConn.to || '',
        safeConn.label || '',
        safeConn.begin || '',
        safeConn.end || ''
    ].join('|');
}

/**
 * Captures currently selected developer connection and point index.
 * @returns {{identity: string, pointIndex: number}|null}
 */
function captureDeveloperSelectionState() {
    const selectedLine = developerModeState.selectedLine;
    const conn = selectedLine?.userData?.connection;
    if (!selectedLine || !conn) {
        return null;
    }

    return {
        identity: buildDeveloperConnectionIdentity(selectedLine.userData?.groupName || 'Group', conn),
        pointIndex: developerModeState.selectedPointIndex
    };
}

/**
 * Finds a connection line by identity key in the current scene.
 * @param {string} identity
 * @returns {THREE.Line|null}
 */
function findDeveloperConnectionLineByIdentity(identity) {
    if (!identity) {
        return null;
    }

    let result = null;
    scene.traverse(obj => {
        if (result || !obj?.userData) {
            return;
        }

        if (obj.userData.type !== 'connection') {
            return;
        }

        const conn = obj.userData.connection;
        const groupName = obj.userData.groupName || 'Group';
        const currentIdentity = buildDeveloperConnectionIdentity(groupName, conn);
        if (currentIdentity === identity) {
            result = obj;
        }
    });

    return result;
}

/**
 * Restores previously captured developer selection state.
 * @param {{identity: string, pointIndex: number}|null} snapshot
 */
function restoreDeveloperSelectionState(snapshot) {
    if (!snapshot || !developerModeState.enabled) {
        return;
    }

    const selectedLine = findDeveloperConnectionLineByIdentity(snapshot.identity);
    if (!selectedLine) {
        return;
    }

    setDeveloperSelection(selectedLine);
    setDeveloperActivePoint(snapshot.pointIndex);
}

/**
 * Applies a full model snapshot and rebuilds scene.
 * @param {string} snapshot
 * @param {{identity: string, pointIndex: number}|null} [selectionSnapshot]
 */
function applyDeveloperSnapshot(snapshot, selectionSnapshot = null) {
    const groupSelectionSnapshot = captureConnectionGroupSelectionState();
    const fallbackSelectionSnapshot = captureDeveloperSelectionState();

    let parsedModel;
    try {
        parsedModel = JSON.parse(snapshot);
    } catch (err) {
        console.warn('Could not parse history snapshot.', err);
        return;
    }

    developerEditHistory.isApplying = true;
    try {
        loadModelFromObject(parsedModel);
        restoreConnectionGroupSelectionState(groupSelectionSnapshot);
        restoreDeveloperSelectionState(selectionSnapshot || fallbackSelectionSnapshot);
    } finally {
        developerEditHistory.isApplying = false;
    }
}

/**
 * Undo last dev edit operation.
 */
function undoDeveloperEdit() {
    const entry = developerEditHistory.undoStack.pop();
    if (!entry) {
        updateDeveloperModeUI();
        return;
    }

    developerEditHistory.redoStack.push(entry);
    const selectionForUndo = entry.beforeSelection || entry.afterSelection || null;
    applyDeveloperSnapshot(entry.before, selectionForUndo);
    updateDeveloperModeUI();
}

/**
 * Redo last reverted dev edit operation.
 */
function redoDeveloperEdit() {
    const entry = developerEditHistory.redoStack.pop();
    if (!entry) {
        updateDeveloperModeUI();
        return;
    }

    developerEditHistory.undoStack.push(entry);
    const selectionForRedo = entry.afterSelection || entry.beforeSelection || null;
    applyDeveloperSnapshot(entry.after, selectionForRedo);
    updateDeveloperModeUI();
}

/**
 * Clears insert-hover marker.
 */
function clearDeveloperInsertMarker() {
    const marker = developerModeState.hoverInsertMarker;
    if (!marker) {
        return;
    }

    scene.remove(marker);
    marker.geometry?.dispose?.();
    marker.material?.dispose?.();
    developerModeState.hoverInsertMarker = null;
}

/**
 * Shows or moves insert-hover marker.
 * @param {THREE.Vector3} worldPosition
 */
function showDeveloperInsertMarker(worldPosition) {
    if (!worldPosition) {
        clearDeveloperInsertMarker();
        return;
    }

    if (!developerModeState.hoverInsertMarker) {
        const geometry = new THREE.SphereGeometry(0.12, 12, 12);
        const material = new THREE.MeshBasicMaterial({
            color: developerModeState.hoverPointColor,
            transparent: true,
            opacity: 0.9,
            depthTest: true,
            depthWrite: false
        });
        developerModeState.hoverInsertMarker = new THREE.Mesh(geometry, material);
        scene.add(developerModeState.hoverInsertMarker);
    }

    developerModeState.hoverInsertMarker.position.copy(worldPosition);
}

/**
 * Clears and disposes all developer point handles.
 */
function clearDeveloperPointHandles() {
    developerModeState.pointHandles.forEach(handle => {
        scene.remove(handle);
        handle.geometry?.dispose?.();
        handle.material?.dispose?.();
    });
    developerModeState.pointHandles = [];
}

/**
 * Updates active/inactive style of all current point handles.
 */
function updateDeveloperPointHandleStyles() {
    developerModeState.pointHandles.forEach(handle => {
        const pointIndex = handle?.userData?.pointIndex;
        const isActive = pointIndex === developerModeState.selectedPointIndex;
        if (handle?.material?.color) {
            handle.material.color.setHex(isActive ? developerModeState.activePointColor : developerModeState.pointColor);
        }
        if (handle?.material) {
            handle.material.opacity = isActive ? 1 : 0.85;
            handle.material.needsUpdate = true;
        }
        const scale = isActive ? 1.25 : 1;
        handle.scale.set(scale, scale, scale);
    });
}

/**
 * Creates visible drag handles for selected connection points.
 */
function rebuildDeveloperPointHandles() {
    clearDeveloperPointHandles();

    const selectedLine = developerModeState.selectedLine;
    const conn = selectedLine?.userData?.connection;
    if (!conn || !Array.isArray(conn.points) || conn.points.length === 0) {
        developerModeState.selectedPointIndex = -1;
        return;
    }

    const pointGeometry = new THREE.SphereGeometry(0.16, 16, 16);

    conn.points.forEach((point, index) => {
        if (
            typeof point?.x !== 'number' ||
            typeof point?.y !== 'number' ||
            typeof point?.z !== 'number'
        ) {
            return;
        }

        const material = new THREE.MeshBasicMaterial({
            color: developerModeState.pointColor,
            transparent: true,
            opacity: 0.85,
            depthTest: true,
            depthWrite: false
        });

        const handle = new THREE.Mesh(pointGeometry.clone(), material);
        handle.position.set(point.x, point.y, point.z);
        handle.userData = {
            type: 'devPointHandle',
            pointIndex: index,
            line: selectedLine
        };

        scene.add(handle);
        developerModeState.pointHandles.push(handle);
    });

    if (developerModeState.selectedPointIndex >= conn.points.length) {
        developerModeState.selectedPointIndex = conn.points.length - 1;
    }

    updateDeveloperPointHandleStyles();
}

/**
 * Sets currently active point index for selected connection.
 * @param {number} pointIndex
 */
function setDeveloperActivePoint(pointIndex) {
    const conn = developerModeState.selectedLine?.userData?.connection;
    if (!conn || !Array.isArray(conn.points)) {
        developerModeState.selectedPointIndex = -1;
        updateDeveloperPointHandleStyles();
        updateDeveloperModeUI();
        return;
    }

    const maxIndex = conn.points.length - 1;
    if (maxIndex < 0) {
        developerModeState.selectedPointIndex = -1;
    } else {
        developerModeState.selectedPointIndex = Math.max(0, Math.min(pointIndex, maxIndex));
    }

    updateDeveloperPointHandleStyles();
    updateDeveloperModeUI();
}

/**
 * Starts point dragging for the currently selected point handle.
 * @param {PointerEvent} event
 * @param {THREE.Mesh} handle
 */
function startDeveloperPointDrag(event, handle) {
    const pointIndex = handle?.userData?.pointIndex;
    if (!Number.isInteger(pointIndex) || pointIndex < 0) {
        return;
    }

    setDeveloperActivePoint(pointIndex);
    clearDeveloperInsertMarker();

    developerModeState.dragBeforeSnapshot = createModelSnapshot();
    developerModeState.dragBeforeSelection = captureDeveloperSelectionState();

    developerModeState.isDraggingPoint = true;
    developerModeState.dragPointerId = event.pointerId;

    setDeveloperPointerFromEvent(event);
    developerRaycaster.setFromCamera(developerPointerNdc, camera);

    const dragNormal = new THREE.Vector3();
    camera.getWorldDirection(dragNormal);

    const dragStartPoint = handle.position.clone();
    const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(dragNormal, dragStartPoint);
    const dragStartIntersection = new THREE.Vector3();
    const hasIntersection = developerRaycaster.ray.intersectPlane(dragPlane, dragStartIntersection);
    if (!hasIntersection) {
        developerModeState.isDraggingPoint = false;
        developerModeState.dragPointerId = null;
        return;
    }

    developerModeState.dragPlane = dragPlane;
    developerModeState.dragStartIntersection = dragStartIntersection.clone();
    developerModeState.dragStartPoint = dragStartPoint;

    controls.enabled = false;
    renderer.domElement.setPointerCapture(event.pointerId);
}

/**
 * Stops active point dragging.
 * @param {PointerEvent} [event]
 */
function stopDeveloperPointDrag(event) {
    if (!developerModeState.isDraggingPoint) {
        return;
    }

    const pointerId = developerModeState.dragPointerId;
    developerModeState.isDraggingPoint = false;
    developerModeState.dragPointerId = null;
    developerModeState.dragPlane = null;
    developerModeState.dragStartIntersection = null;
    developerModeState.dragStartPoint = null;

    const beforeSnapshot = developerModeState.dragBeforeSnapshot;
    const beforeSelection = developerModeState.dragBeforeSelection;
    developerModeState.dragBeforeSnapshot = null;
    developerModeState.dragBeforeSelection = null;
    if (beforeSnapshot) {
        const afterSnapshot = createModelSnapshot();
        const afterSelection = captureDeveloperSelectionState();
        recordDeveloperHistory(beforeSnapshot, afterSnapshot, beforeSelection, afterSelection);
    }

    controls.enabled = true;

    if (pointerId != null && renderer.domElement.hasPointerCapture(pointerId)) {
        renderer.domElement.releasePointerCapture(pointerId);
    }

    if (event) {
        event.preventDefault();
    }
}

/**
 * Updates developer mode status text and control enabled state.
 */
function updateDeveloperModeUI() {
    const exportBtn = document.getElementById('btn-dev-export');

    if (exportBtn) {
        exportBtn.disabled = !developerModeState.enabled || !modelData;
    }
}

/**
 * Applies or restores highlight style for a connection line.
 * @param {THREE.Line} line
 * @param {boolean} selected
 */
function setDeveloperLineStyle(line, selected) {
    if (!line?.material?.color) {
        return;
    }

    if (selected) {
        line.material.color.setHex(developerModeState.selectedColor);
    } else {
        const originalColor = line.userData?.originalColor || defaultConnectionColor;
        line.material.color.setHex(originalColor);
    }
}

/**
 * Clears current developer selection.
 */
function clearDeveloperSelection() {
    stopDeveloperPointDrag();
    clearDeveloperInsertMarker();
    if (developerModeState.selectedLine) {
        setDeveloperLineStyle(developerModeState.selectedLine, false);
    }
    developerModeState.selectedLine = null;
    developerModeState.selectedPointIndex = -1;
    clearDeveloperPointHandles();
    updateDeveloperModeUI();
}

/**
 * Sets selected connection line for developer editing.
 * @param {THREE.Line|null} line
 */
function setDeveloperSelection(line) {
    if (!developerModeState.enabled) {
        return;
    }

    if (developerModeState.selectedLine === line) {
        updateDeveloperModeUI();
        return;
    }

    if (developerModeState.selectedLine) {
        setDeveloperLineStyle(developerModeState.selectedLine, false);
    }

    developerModeState.selectedLine = line || null;
    developerModeState.selectedPointIndex = -1;

    if (developerModeState.selectedLine) {
        setDeveloperLineStyle(developerModeState.selectedLine, true);
    }

    rebuildDeveloperPointHandles();

    updateDeveloperModeUI();
}

/**
 * Enables or disables developer mode.
 * @param {boolean} enabled
 */
function setDeveloperModeEnabled(enabled) {
    developerModeState.enabled = !!enabled;

    const chkDevMode = document.getElementById('chk-dev-mode');
    if (chkDevMode) {
        chkDevMode.checked = developerModeState.enabled;
    }

    if (!developerModeState.enabled) {
        clearDeveloperSelection();
    } else {
        rebuildDeveloperPointHandles();
    }

    updateDeveloperModeUI();
}

/**
 * Collects currently visible connection lines from scene.
 * @returns {Array<THREE.Line>}
 */
function getVisibleConnectionLines() {
    const lines = [];
    scene.traverse(obj => {
        if (!obj?.userData) return;
        if (obj.userData.type !== 'connection') return;
        if (!obj.visible) return;
        lines.push(obj);
    });
    return lines;
}

/**
 * Computes normalized pointer coordinates for raycasting.
 * @param {PointerEvent} event
 */
function setDeveloperPointerFromEvent(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    developerPointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    developerPointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

/**
 * Computes the closest point on a segment for a world-space point.
 * @param {THREE.Vector3} segmentStart
 * @param {THREE.Vector3} segmentEnd
 * @param {THREE.Vector3} point
 * @returns {{point: THREE.Vector3, distanceSq: number}}
 */
function getClosestPointOnSegment(segmentStart, segmentEnd, point) {
    const segmentVector = segmentEnd.clone().sub(segmentStart);
    const segmentLengthSq = segmentVector.lengthSq();
    if (segmentLengthSq <= 0) {
        return {
            point: segmentStart.clone(),
            distanceSq: segmentStart.distanceToSquared(point)
        };
    }

    const toPoint = point.clone().sub(segmentStart);
    const projection = toPoint.dot(segmentVector) / segmentLengthSq;
    const t = Math.max(0, Math.min(1, projection));
    const closest = segmentStart.clone().add(segmentVector.multiplyScalar(t));

    return {
        point: closest,
        distanceSq: closest.distanceToSquared(point)
    };
}

/**
 * Finds insertion point/index on the currently selected line based on pointer hit.
 * @param {THREE.Line} line
 * @returns {{point: THREE.Vector3, insertIndex: number}|null}
 */
function getInsertPointOnSelectedLine(line) {
    if (!line) {
        return null;
    }

    const intersections = developerRaycaster.intersectObject(line, false);
    if (!Array.isArray(intersections) || intersections.length === 0) {
        return null;
    }

    const hitPoint = intersections[0].point;
    const pathPoints = line.userData?.pathPoints;
    const conn = line.userData?.connection;
    if (!Array.isArray(pathPoints) || pathPoints.length < 2 || !conn) {
        return null;
    }

    const existingPointCount = Array.isArray(conn.points) ? conn.points.length : 0;
    let bestSegmentIndex = 0;
    let bestPoint = pathPoints[0].clone();
    let bestDistanceSq = Number.POSITIVE_INFINITY;

    for (let segmentIndex = 0; segmentIndex < pathPoints.length - 1; segmentIndex++) {
        const segmentStart = pathPoints[segmentIndex];
        const segmentEnd = pathPoints[segmentIndex + 1];
        const candidate = getClosestPointOnSegment(segmentStart, segmentEnd, hitPoint);

        if (candidate.distanceSq < bestDistanceSq) {
            bestDistanceSq = candidate.distanceSq;
            bestSegmentIndex = segmentIndex;
            bestPoint = candidate.point;
        }
    }

    const insertIndex = Math.max(0, Math.min(bestSegmentIndex, existingPointCount));
    return { point: bestPoint, insertIndex };
}

/**
 * Finds the arrow object for a specific connection line.
 * @param {THREE.Line} line
 * @returns {THREE.ArrowHelper|null}
 */
function findConnectionArrowForLine(line) {
    const conn = line?.userData?.connection;
    const groupName = line?.userData?.groupName;
    if (!conn) {
        return null;
    }

    let result = null;
    scene.traverse(obj => {
        if (result || !obj?.userData) return;
        if (obj.userData.type !== 'connectionArrow') return;
        if (obj.userData.connection !== conn) return;
        if ((obj.userData.groupName || 'Group') !== (groupName || 'Group')) return;
        result = obj;
    });

    return result;
}

/**
 * Rebuilds line and arrow geometry for a changed connection.
 * @param {THREE.Line} line
 */
function refreshDeveloperConnectionGeometry(line) {
    if (!line?.userData?.connection) {
        return;
    }

    const conn = line.userData.connection;
    const fromEntry = componentMeshes.get(conn.from);
    const toEntry = componentMeshes.get(conn.to);
    if (!fromEntry || !toEntry) {
        return;
    }

    const { pathPoints, startSurface, endSurface } = buildConnectionPath(conn, fromEntry.mesh, toEntry.mesh);
    if (!Array.isArray(pathPoints) || pathPoints.length < 2) {
        return;
    }

    if (line.geometry) {
        line.geometry.dispose();
    }
    line.geometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    line.userData.pathPoints = pathPoints;
    line.userData.startSurface = startSurface;
    line.userData.endSurface = endSurface;

    const arrow = findConnectionArrowForLine(line);
    if (!arrow) {
        return;
    }

    const lastIndex = pathPoints.length - 1;
    const endPoint = pathPoints[lastIndex];
    const prevPoint = pathPoints[lastIndex - 1];

    const direction = endPoint.clone().sub(prevPoint).normalize();
    const segmentLength = prevPoint.distanceTo(endPoint);
    const tipGap = 0.02;
    const maxArrowLength = Math.max(segmentLength - tipGap, 0.05);
    const arrowLength = Math.min(maxArrowLength, 1.5);
    const arrowOrigin = endPoint.clone().sub(direction.clone().multiplyScalar(arrowLength));

    arrow.position.copy(arrowOrigin);
    arrow.setDirection(direction);
    arrow.setLength(arrowLength, 0.6, 0.3);
    arrow.userData.pathPoints = pathPoints;
    arrow.userData.startSurface = startSurface;
    arrow.userData.endSurface = endSurface;

    if (line === developerModeState.selectedLine) {
        rebuildDeveloperPointHandles();
    }
}

/**
 * Appends a point to selected connection directly on its current rendered line.
 * @param {PointerEvent} event
 */
function appendDeveloperPointFromPointer(event) {
    const selectedLine = developerModeState.selectedLine;
    if (!selectedLine) {
        return;
    }

    const beforeSnapshot = createModelSnapshot();
    const beforeSelection = captureDeveloperSelectionState();

    const insertData = getInsertPointOnSelectedLine(selectedLine);
    if (!insertData) {
        return;
    }

    const conn = selectedLine.userData.connection;
    if (!Array.isArray(conn.points)) {
        conn.points = [];
    }

    conn.points.splice(insertData.insertIndex, 0, {
        x: roundCoordinate(insertData.point.x),
        y: roundCoordinate(insertData.point.y),
        z: roundCoordinate(insertData.point.z)
    });

    refreshDeveloperConnectionGeometry(selectedLine);
    setDeveloperActivePoint(insertData.insertIndex);
    const afterSnapshot = createModelSnapshot();
    const afterSelection = captureDeveloperSelectionState();
    recordDeveloperHistory(beforeSnapshot, afterSnapshot, beforeSelection, afterSelection);
    updateDeveloperModeUI();
}

/**
 * Moves active selected point based on pointer ray projection.
 * Coordinates are snapped to 0.5 increments.
 * @returns {boolean} True when point position changed
 */
function moveDeveloperActivePointFromPointer() {
    const selectedLine = developerModeState.selectedLine;
    const conn = selectedLine?.userData?.connection;
    const pointIndex = developerModeState.selectedPointIndex;
    if (!selectedLine || !conn || !Array.isArray(conn.points) || pointIndex < 0 || pointIndex >= conn.points.length) {
        return false;
    }

    const dragPlane = developerModeState.dragPlane;
    const dragStartIntersection = developerModeState.dragStartIntersection;
    const dragStartPoint = developerModeState.dragStartPoint;
    if (!dragPlane || !dragStartIntersection || !dragStartPoint) {
        return false;
    }

    const worldPoint = new THREE.Vector3();
    const hasIntersection = developerRaycaster.ray.intersectPlane(dragPlane, worldPoint);
    if (!hasIntersection) {
        return false;
    }

    const delta = worldPoint.sub(dragStartIntersection);
    const targetPoint = dragStartPoint.clone().add(delta);

    const snappedX = roundCoordinate(snapToStep(targetPoint.x, 0.5));
    const snappedY = roundCoordinate(snapToStep(targetPoint.y, 0.5));
    const snappedZ = roundCoordinate(snapToStep(targetPoint.z, 0.5));

    const currentPoint = conn.points[pointIndex];
    if (currentPoint.x === snappedX && currentPoint.y === snappedY && currentPoint.z === snappedZ) {
        return false;
    }

    currentPoint.x = snappedX;
    currentPoint.y = snappedY;
    currentPoint.z = snappedZ;

    refreshDeveloperConnectionGeometry(selectedLine);
    return true;
}

/**
 * Deletes currently active point from selected connection.
 */
function deleteDeveloperActivePoint() {
    const selectedLine = developerModeState.selectedLine;
    const conn = selectedLine?.userData?.connection;
    const pointIndex = developerModeState.selectedPointIndex;

    if (!selectedLine || !conn || !Array.isArray(conn.points) || pointIndex < 0 || pointIndex >= conn.points.length) {
        return;
    }

    const beforeSnapshot = createModelSnapshot();
    const beforeSelection = captureDeveloperSelectionState();

    conn.points.splice(pointIndex, 1);

    refreshDeveloperConnectionGeometry(selectedLine);

    const nextIndex = conn.points.length > 0 ? Math.min(pointIndex, conn.points.length - 1) : -1;
    setDeveloperActivePoint(nextIndex);

    const afterSnapshot = createModelSnapshot();
    const afterSelection = captureDeveloperSelectionState();
    recordDeveloperHistory(beforeSnapshot, afterSnapshot, beforeSelection, afterSelection);
    updateDeveloperModeUI();
}

/**
 * Exports current model (including edited points) as a JSON download.
 */
function exportDeveloperModelJson() {
    if (!modelData) {
        return;
    }

    const json = JSON.stringify(modelData, null, 4);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    const sourceFile = currentModelFile ? currentModelFile.split('/').pop() : 'model.json';
    const fileName = (sourceFile || 'model.json').replace(/\.json$/i, '-devmode.json');

    anchor.href = url;
    anchor.download = fileName;
    anchor.click();

    URL.revokeObjectURL(url);
}

/**
 * Handles pointer interaction in developer mode.
 * Click = select line, Shift+Click = add point on the selected line.
 * @param {PointerEvent} event
 */
function onDeveloperPointerDown(event) {
    if (!developerModeState.enabled) {
        return;
    }

    if (event.button !== 0) {
        return;
    }

    setDeveloperPointerFromEvent(event);
    developerRaycaster.setFromCamera(developerPointerNdc, camera);

    const handleIntersections = developerRaycaster.intersectObjects(developerModeState.pointHandles, false);
    if (handleIntersections.length > 0) {
        startDeveloperPointDrag(event, handleIntersections[0].object);
        event.preventDefault();
        return;
    }

    if (event.shiftKey) {
        appendDeveloperPointFromPointer(event);
        const hoverAfterInsert = getInsertPointOnSelectedLine(developerModeState.selectedLine);
        if (hoverAfterInsert) {
            showDeveloperInsertMarker(hoverAfterInsert.point);
        } else {
            clearDeveloperInsertMarker();
        }
        event.preventDefault();
        return;
    }

    const lines = getVisibleConnectionLines();
    if (!lines.length) {
        clearDeveloperSelection();
        return;
    }

    const intersections = developerRaycaster.intersectObjects(lines, false);
    if (intersections.length > 0) {
        setDeveloperSelection(intersections[0].object);
    } else {
        clearDeveloperSelection();
    }

    clearDeveloperInsertMarker();
}

/**
 * Updates hover marker for potential insert location on selected line.
 * Marker is shown only while Shift is pressed.
 * @param {PointerEvent} event
 */
function updateDeveloperInsertHover(event) {
    if (!developerModeState.enabled || developerModeState.isDraggingPoint) {
        clearDeveloperInsertMarker();
        return;
    }

    if (!event.shiftKey || !developerModeState.selectedLine) {
        clearDeveloperInsertMarker();
        return;
    }

    const insertData = getInsertPointOnSelectedLine(developerModeState.selectedLine);
    if (!insertData) {
        clearDeveloperInsertMarker();
        return;
    }

    showDeveloperInsertMarker(insertData.point);
}

/**
 * Handles point dragging while pointer moves.
 * @param {PointerEvent} event
 */
function onDeveloperPointerMove(event) {
    if (!developerModeState.enabled) {
        clearDeveloperInsertMarker();
        return;
    }

    setDeveloperPointerFromEvent(event);
    developerRaycaster.setFromCamera(developerPointerNdc, camera);

    if (!developerModeState.isDraggingPoint) {
        updateDeveloperInsertHover(event);
        return;
    }

    if (developerModeState.dragPointerId != null && event.pointerId !== developerModeState.dragPointerId) {
        return;
    }

    const moved = moveDeveloperActivePointFromPointer();
    if (moved) {
        updateDeveloperModeUI();
    }

    event.preventDefault();
}

/**
 * Finalizes point dragging on pointer release/cancel.
 * @param {PointerEvent} event
 */
function onDeveloperPointerUp(event) {
    if (!developerModeState.enabled || !developerModeState.isDraggingPoint) {
        return;
    }

    if (developerModeState.dragPointerId != null && event.pointerId !== developerModeState.dragPointerId) {
        return;
    }

    stopDeveloperPointDrag(event);
    updateDeveloperModeUI();
}

/**
 * Handles keyboard shortcuts for dev undo/redo.
 * @param {KeyboardEvent} event
 */
function onDeveloperKeyDown(event) {
    const target = event.target;
    const targetTag = target && target.tagName ? String(target.tagName).toLowerCase() : '';
    const isTypingTarget =
        targetTag === 'input' ||
        targetTag === 'textarea' ||
        targetTag === 'select' ||
        !!target?.isContentEditable;

    if (isTypingTarget) {
        return;
    }

    if (!developerModeState.enabled) {
        return;
    }

    const key = String(event.key || '').toLowerCase();

    if (key === 'escape') {
        event.preventDefault();
        clearDeveloperSelection();
        return;
    }

    if (key === 'delete' || key === 'backspace') {
        event.preventDefault();
        deleteDeveloperActivePoint();
        return;
    }

    const shortcutPressed = event.ctrlKey || event.metaKey;
    if (!shortcutPressed) {
        return;
    }

    if (key === 'z' && event.shiftKey) {
        event.preventDefault();
        redoDeveloperEdit();
        return;
    }

    if (key === 'z') {
        event.preventDefault();
        undoDeveloperEdit();
        return;
    }

    if (key === 'y') {
        event.preventDefault();
        redoDeveloperEdit();
    }
}

// ============================================================================
// Interface Details and Highlighting
// ============================================================================

/**
 * Displays interface metadata for the selected connection.
 * @param {Object|null} connection - Connection data object
 */
function showInterfaceDetails(connection) {
    const el = document.getElementById('details-content');
    if (!el) return;

    if (!connection) {
        el.innerHTML = 'No Interface details available';
        return;
    }

    const id = formatInterfaceValue(connection.id || '-');
    const protocol = formatInterfaceValue(connection.protocol || '-');
    const from = formatInterfaceValue(connection.from || '-');
    const to = formatInterfaceValue(connection.to || '-');
    const desc = formatInterfaceValue(connection.label || '-');

    el.innerHTML = `
        <table class="interface-table">
            <tr>
                <td class="interface-key">Id</td>
                <td>${id}</td>
            </tr>
            <tr>
                <td class="interface-key">Prot</td>
                <td>${protocol}</td>
            </tr>
            <tr>
                <td class="interface-key">From</td>
                <td>${from}</td>
            </tr>
            <tr>
                <td class="interface-key">To</td>
                <td>${to}</td>
            </tr>
            <tr>
                <td class="interface-key">Desc</td>
                <td>${desc}</td>
            </tr>
        </table>
      `;
}

/**
 * Resolves a component ID to its display label.
 * Falls back to the raw value when no component is found.
 * @param {string|undefined|null} componentId - Component ID
 * @returns {string} Component label or fallback value
 */
function resolveComponentDisplayName(componentId) {
    if (!componentId) {
        return '-';
    }

    const entry = componentMeshes.get(componentId);
    const label = entry?.data?.label;

    if (typeof label === 'string' && label.trim()) {
        return label;
    }

    return String(componentId);
}

/**
 * Formats interface values for safe HTML rendering and multiline display.
 * Supports both escaped "\\n" and actual CR/LF characters.
 * @param {string|number} value - Raw interface value
 * @returns {string} HTML-safe text with <br> line breaks
 */
function formatInterfaceValue(value) {
        return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\\n|\r\n|\r|\n/g, '<br>');
}

/**
 * Clears the interface panel.
 */
function clearInterfaceDetails() {
    const el = document.getElementById('details-content');
    if (!el) return;
    el.innerHTML = 'No Interface details available';
}

/**
 * Removes current target component marker from scene.
 */
function clearCurrentComponentMarker() {
    const disposeMarker = (marker) => {
        if (!marker) {
            return;
        }
        scene.remove(marker);
        marker.geometry?.dispose?.();
        marker.material?.dispose?.();
    };

    disposeMarker(currentFromComponentMarker);
    disposeMarker(currentToComponentMarker);
    currentFromComponentMarker = null;
    currentToComponentMarker = null;
}

/**
 * Updates flow panel text and ring marker for current target component.
 * @param {Object|null} connection - Currently selected connection
 */
function updateCurrentComponentIndicator(connection) {
    const indicator = document.getElementById('flow-current-component');
    const fromId = connection?.from;
    const targetId = connection?.to;

    if (!targetId) {
        if (indicator) {
            indicator.textContent = 'Current component: -';
        }
        clearCurrentComponentMarker();
        return;
    }

    if (!modelVisualSettings.showComponentPosition) {
        clearCurrentComponentMarker();
        return;
    }

    const componentName = resolveComponentDisplayName(targetId);
    if (indicator) {
        indicator.innerHTML = `Current component: ${formatInterfaceValue(componentName)}`;
    }

    clearCurrentComponentMarker();

    const createRingMarker = (componentId, color, radiusScale, ringWidth) => {
        if (!componentId) {
            return null;
        }

        const entry = componentMeshes.get(componentId);
        if (!entry?.mesh) {
            return null;
        }

        const bbox = new THREE.Box3().setFromObject(entry.mesh);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());
        const componentType = entry.data?.type;
        const isActorLike = componentType === 'actor' || componentType === 'person';

        const footprint = Math.max(size.x, size.z);
        let outerRadius = Math.max(0.25, footprint * radiusScale);
        if (isActorLike) {
            outerRadius = Math.max(outerRadius, footprint * 0.75 + 0.06);
        }
        const innerRadius = Math.max(0.16, outerRadius - ringWidth);

        const markerGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 48);
        const markerMaterial = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false
        });

        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(center.x, bbox.min.y + 0.03, center.z);
        scene.add(marker);
        return marker;
    };

    currentFromComponentMarker = createRingMarker(fromId, 0x00bfff, 0.48, 0.06);
    currentToComponentMarker = createRingMarker(targetId, 0xffd400, 0.62, 0.08);
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
    stopDeveloperPointDrag();
    clearDeveloperPointHandles();
    clearDeveloperInsertMarker();
    developerModeState.selectedPointIndex = -1;
    developerModeState.dragBeforeSnapshot = null;
    developerModeState.dragBeforeSelection = null;

    const toRemove = [];
    scene.children.forEach(obj => {
        if (obj !== hemiLight && obj !== dirLight && obj !== gridHelper && obj !== LABEL.yAxisGroup && obj !== LABEL.gridLabelsGroup) {
            toRemove.push(obj);
        }
    });
    toRemove.forEach(obj => scene.remove(obj));

    componentCenters.clear();
    componentMeshes.clear();
    activeComponentFlowCounts.clear();
    clearCurrentComponentMarker();
    updateCurrentComponentIndicator(null);
    clearInterfaceDetails();
    clearHighlight();
}

/**
 * Returns configured active color for a component type from model typeStyles.
 * Expected JSON: typeStyles.<type>.activeColor
 * @param {Object} componentData - Component data object
 * @returns {string|number|null} Active color or null
 */
function getConfiguredActiveColor(componentData) {
    const componentType = componentData && componentData.type;
    if (!componentType) return null;

    const style = modelData?.typeStyles?.[componentType];
    if (!style || style.activeColor == null) {
        return null;
    }
    return style.activeColor;
}

/**
 * Applies or restores active visual style for a component.
 * @param {string} componentId - Component ID
 * @param {boolean} isActive - Whether active style should be applied
 */
function applyComponentActiveStyle(componentId, isActive) {
    const entry = componentMeshes.get(componentId);
    if (!entry || !entry.mesh) return;

    const configuredActiveColor = getConfiguredActiveColor(entry.data);

    entry.mesh.traverse(obj => {
        if (!obj?.isMesh || !obj.material) return;

        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach(material => {
            if (!material?.color) return;

            material.userData = material.userData || {};
            if (material.userData.originalColorHex == null) {
                material.userData.originalColorHex = material.color.getHex();
            }

            if (isActive) {
                if (configuredActiveColor != null) {
                    material.color.set(configuredActiveColor);
                } else {
                    const base = new THREE.Color(material.userData.originalColorHex);
                    const hsl = { h: 0, s: 0, l: 0 };
                    base.getHSL(hsl);

                    if (hsl.s > 0.02) {
                        const stronger = new THREE.Color().setHSL(
                            hsl.h,
                            Math.min(1, hsl.s + 0.35),
                            Math.max(0.12, hsl.l * 0.72)
                        );
                        material.color.copy(stronger);
                    } else {
                        const darker = base.clone().multiplyScalar(0.65);
                        material.color.copy(darker);
                    }
                }
            } else {
                material.color.setHex(material.userData.originalColorHex);
            }
        });
    });
}

/**
 * Activates/deactivates component style based on active flow reference counting.
 * @param {string} componentId - Component ID
 * @param {boolean} activate - Whether to activate or deactivate
 */
function updateComponentFlowActivation(componentId, activate) {
    if (!componentId) return;

    const currentCount = activeComponentFlowCounts.get(componentId) || 0;
    if (activate) {
        const nextCount = currentCount + 1;
        activeComponentFlowCounts.set(componentId, nextCount);
        if (currentCount === 0) {
            applyComponentActiveStyle(componentId, true);
        }
        return;
    }

    const nextCount = Math.max(currentCount - 1, 0);
    if (nextCount === 0) {
        activeComponentFlowCounts.delete(componentId);
        applyComponentActiveStyle(componentId, false);
    } else {
        activeComponentFlowCounts.set(componentId, nextCount);
    }
}

/**
 * Activates source and target components for a connection.
 * @param {Object|null} connection - Connection object
 * @returns {Array<string>} Activated component IDs
 */
function activateComponentsForConnection(connection) {
    if (!modelVisualSettings.animateComponents) {
        return [];
    }

    const ids = [];
    if (connection?.from) ids.push(connection.from);
    if (connection?.to && connection.to !== connection.from) ids.push(connection.to);

    ids.forEach(id => updateComponentFlowActivation(id, true));
    return ids;
}

/**
 * Deactivates a list of component IDs previously activated for a flow.
 * @param {Array<string>} componentIds - Component IDs
 */
function deactivateComponentsForFlow(componentIds) {
    if (!Array.isArray(componentIds)) return;
    componentIds.forEach(id => updateComponentFlowActivation(id, false));
}

// ============================================================================
// Component Creation
// ============================================================================

/**
 * Normalizes component label text so line breaks render reliably.
 * Supports actual CR/LF and escaped variants like "\\n".
 * @param {string} text - Raw label text
 * @returns {string} Normalized label text
 */
function normalizeComponentLabelText(text) {
    return String(text)
        .replace(/\\\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\r\n|\r/g, '\n');
}

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

            const labelText = normalizeComponentLabelText(c.label || c.id);

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

            const color = (group.color || defaultConnectionColor);

            const lineGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
            const lineMaterial = new THREE.LineBasicMaterial({ color });
            const line = new THREE.Line(lineGeometry, lineMaterial);

            line.userData = {
                type: 'connection',
                connection: conn,
                groupName,           // Group-Name merken
                pathPoints,
                startSurface,
                endSurface,
                originalColor: color
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
                endSurface,
                originalColor: color
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

    updateComponentVisibilityFromGroups();

    updateCurrentConnectionMarker();
}

/**
 * Updates visibility of components based on active connection groups.
 * Controlled via model.settings.selectConnectionsAndComponents.
 */
function updateComponentVisibilityFromGroups() {
    if (componentMeshes.size === 0) {
        return;
    }

    if (!modelVisualSettings.selectConnectionsAndComponents) {
        componentMeshes.forEach(({ mesh }) => {
            if (mesh) {
                mesh.visible = true;
            }
        });
        return;
    }

    const visibleComponentIds = new Set();

    connectionGroups
        .filter(group => group && group.active)
        .forEach(group => {
            (group.connections || []).forEach(conn => {
                if (conn?.from) visibleComponentIds.add(conn.from);
                if (conn?.to) visibleComponentIds.add(conn.to);
            });
        });

    componentMeshes.forEach((entry, componentId) => {
        if (!entry?.mesh) return;
        entry.mesh.visible = visibleComponentIds.has(componentId);
    });
}

/**
 * Determines whether two connection payloads represent the same logical connection.
 * @param {Object|null|undefined} a - First connection object
 * @param {Object|null|undefined} b - Second connection object
 * @returns {boolean} True when both represent same connection
 */
function isSameConnection(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;

    return a.from === b.from &&
        a.to === b.to &&
        (a.order === b.order || a.order == null || b.order == null) &&
        (a.label === b.label || a.label == null || b.label == null);
}

/**
 * Restores base style for connection visuals.
 * @param {THREE.Object3D} obj - Connection line or arrow
 */
function setConnectionSelectionStyle(obj) {
    if (!obj?.userData) return;

    const originalColor = obj.userData.originalColor ?? defaultConnectionColor;

    if (obj.userData.type === 'connection') {
        if (obj.material?.color) {
            obj.material.color.set(originalColor);
        }
        if (obj.material) {
            obj.material.transparent = false;
            obj.material.opacity = 1;
            obj.material.needsUpdate = true;
        }
        return;
    }

    if (obj.userData.type === 'connectionArrow') {
        if (obj.line?.material?.color) {
            obj.line.material.color.set(originalColor);
        }
        if (obj.cone?.material?.color) {
            obj.cone.material.color.set(originalColor);
        }
        if (obj.line?.material) {
            obj.line.material.transparent = false;
            obj.line.material.opacity = 1;
            obj.line.material.needsUpdate = true;
        }
        if (obj.cone?.material) {
            obj.cone.material.transparent = false;
            obj.cone.material.opacity = 1;
            obj.cone.material.needsUpdate = true;
        }
    }
}

/**
 * Updates marker for currently selected connection.
 */
function updateCurrentConnectionMarker() {
    scene.traverse(obj => {
        if (!obj?.userData) return;
        if (obj.userData.type !== 'connection' && obj.userData.type !== 'connectionArrow') return;

        setConnectionSelectionStyle(obj);
    });

    const selectedLine =
        currentSelectedConnectionIndex >= 0 &&
        currentSelectedConnectionIndex < connectionSequence.length
            ? connectionSequence[currentSelectedConnectionIndex]
            : null;

    const hasPredecessor =
        currentSelectedConnectionIndex > 0 ||
        (currentSelectedConnectionIndex === 0 && currentConnectionIndex > 0);
    const selectedLineConnection = selectedLine?.userData?.connection || null;
    const selectedConnection = hasPredecessor
        ? selectedLineConnection
        : null;
    const markerConnection = selectedConnection ||
        (connectionSequence.length > 0
            ? (connectionSequence[0]?.userData?.connection || null)
            : null);

    showInterfaceDetails(selectedConnection);
    updateCurrentComponentIndicator(markerConnection);
    updateFlowPositionControl();
}

/**
 * Rebuilds the connection sequence for animation playback.
 * Orders connections by group order and connection order within groups.
 */
function rebuildConnectionSequence() {
    connectionSequence = [];
    currentConnectionIndex = 0;
    currentSelectedConnectionIndex = -1;

    // 1. aktive Gruppen nach order sortieren
    const activeGroups = connectionGroups
        .filter(g => g.active)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (activeGroups.length === 0) {
        console.log('rebuildConnectionSequence: no active groups');
        updateCurrentConnectionMarker();
        updateFlowControlButtons();
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

    if (connectionSequence.length > 0) {
        currentSelectedConnectionIndex = 0;
        currentConnectionIndex = 0;
    }

    console.log('rebuildConnectionSequence: sequence length', connectionSequence.length);
    updateCurrentConnectionMarker();
    updateFlowControlButtons();
}

// ============================================================================
// Data Flow Animation
// ============================================================================

/**
 * Applies global flow timing settings from model.settings.
 * Supported settings:
 * - flowDurationMin: minimum duration in seconds
 * - flowSpeed: speed in grid units per second
 * - animateComponents: enables/disables active component highlighting
 * - selectConnectionsAndComponents: hides components not used by active connection groups
 * @param {Object} model - Model object
 */
function applyFlowTimingSettingsFromModel(model) {
    modelFlowTimingSettings.flowDurationMin = 3;
    modelFlowTimingSettings.flowSpeed = 2.5;
    modelVisualSettings.animateComponents = false;
    modelVisualSettings.selectConnectionsAndComponents = false;
    modelVisualSettings.showComponentPosition = false;
    modelDeveloperSettings.showDeveloperControls = false;
    modelDeveloperSettings.undoRedoDepth = 50;
    developerEditHistory.maxDepth = 50;

    const settings = model && typeof model.settings === 'object' ? model.settings : null;
    if (!settings) {
        return;
    }

    const parsedSettingsDurationMin = Number(settings.flowDurationMin);
    const parsedSettingsSpeed = Number(settings.flowSpeed);

    if (Number.isFinite(parsedSettingsDurationMin) && parsedSettingsDurationMin > 0) {
        modelFlowTimingSettings.flowDurationMin = parsedSettingsDurationMin;
    }
    if (Number.isFinite(parsedSettingsSpeed) && parsedSettingsSpeed > 0) {
        modelFlowTimingSettings.flowSpeed = parsedSettingsSpeed;
    }

    if (typeof settings.animateComponents === 'boolean') {
        modelVisualSettings.animateComponents = settings.animateComponents;
    }

    if (typeof settings.selectConnectionsAndComponents === 'boolean') {
        modelVisualSettings.selectConnectionsAndComponents = settings.selectConnectionsAndComponents;
    }

    if (typeof settings.showComponentPosition === 'boolean') {
        modelVisualSettings.showComponentPosition = settings.showComponentPosition;
    }

    if (typeof settings.developerMode === 'boolean') {
        modelDeveloperSettings.showDeveloperControls = settings.developerMode;
    }

    const parsedUndoDepth = Number(
        settings.undoRedoDepth ?? settings.developerUndoDepth ?? settings.developerHistoryDepth
    );

    if (Number.isFinite(parsedUndoDepth) && parsedUndoDepth > 0) {
        const sanitizedDepth = Math.max(1, Math.floor(parsedUndoDepth));
        modelDeveloperSettings.undoRedoDepth = sanitizedDepth;
        developerEditHistory.maxDepth = sanitizedDepth;
        if (developerEditHistory.undoStack.length > sanitizedDepth) {
            developerEditHistory.undoStack.splice(0, developerEditHistory.undoStack.length - sanitizedDepth);
        }
        if (developerEditHistory.redoStack.length > sanitizedDepth) {
            developerEditHistory.redoStack.splice(0, developerEditHistory.redoStack.length - sanitizedDepth);
        }
    }
}

/**
 * Calculates total length of a polyline path.
 * @param {Array<THREE.Vector3>} points - Path points
 * @returns {number} Total path length
 */
function getPathLength(points) {
    if (!Array.isArray(points) || points.length < 2) return 0;

    let totalLength = 0;
    for (let i = 0; i < points.length - 1; i++) {
        totalLength += points[i].distanceTo(points[i + 1]);
    }
    return totalLength;
}

/**
 * Starts a data flow animation along a connection path.
 * Creates an animated sphere that moves along the connection line.
 * @param {THREE.Line|THREE.ArrowHelper} connObject - Connection line or arrow object
 * @param {Object} [options] - Animation options
 * @param {number} [options.duration] - Animation duration in seconds (overrides model/default)
 * @param {boolean} [options.loop=false] - Whether to loop the animation
 * @param {number} [options.direction=1] - Animation direction (1 = forward, -1 = backward)
 *
 * Connection timing options:
 * - options.duration (highest priority)
 * - connection.flowDuration (overrides global speed/min)
 * - model.settings.flowSpeed + model.settings.flowDurationMin
 * - viewer default (3s)
 */
function startDataFlowOnConnection(connObject, options = {}) {
    const pathPoints = (connObject.userData && connObject.userData.pathPoints) || null;
    const conn = connObject.userData && connObject.userData.connection;

    if (!pathPoints || pathPoints.length < 2) {
        console.warn('No pathPoints for connection, animation not possible');
        return;
    }

    const parsedOptionDuration = Number(options.duration);
    const parsedConnectionDuration = Number(conn && conn.flowDuration);

    let duration = flowController.defaultDuration;

    if (Number.isFinite(parsedOptionDuration) && parsedOptionDuration > 0) {
        duration = parsedOptionDuration;
    } else if (Number.isFinite(parsedConnectionDuration) && parsedConnectionDuration > 0) {
        duration = parsedConnectionDuration;
    } else {
        const pathLength = getPathLength(pathPoints);
        if (pathLength > 0) {
            const speedDuration = pathLength / modelFlowTimingSettings.flowSpeed;
            duration = Math.max(speedDuration, modelFlowTimingSettings.flowDurationMin, 0.05);
        }
    }

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

    const activeComponentIds = activateComponentsForConnection(conn);

    activeFlows.push({
        object3D: flowMesh,
        labelSprite,
        pathPoints: pathPointsFlow.map(p => p.clone()),
        duration,
        elapsed: direction === 1 ? 0 : duration,
        loop,
        direction,
        activeComponentIds
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
    clearDeveloperSelection();
    updateDeveloperModeUI();

    if (!developerEditHistory.isApplying) {
        resetDeveloperHistory();
    }

    applyFlowTimingSettingsFromModel(model);
    syncViewPanelStateFromSettings();
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
            color: g.color || defaultConnectionColor,
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
                throw new Error(`HTTP ${resp.status} while loading ${fileName}`);
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
 * Initializes the data flow control buttons.
 */
function initFlowControls() {
    const btnStart = document.getElementById('btn-flow-start');
    const btnPrev = document.getElementById('btn-flow-prev');
    const btnPlay = document.getElementById('btn-flow-play');
    const btnReplay = document.getElementById('btn-flow-replay');
    const btnStop = document.getElementById('btn-flow-stop');
    const btnNext = document.getElementById('btn-flow-next');
    const btnEnd = document.getElementById('btn-flow-end');
    const positionSlider = document.getElementById('flow-position-slider');

    if (!btnStart || !btnPrev || !btnPlay || !btnReplay || !btnStop || !btnNext || !btnEnd) {
        console.warn('Flow control buttons not found');
        return;
    }

    btnStart.addEventListener('click', () => {
        playFromStartStep();
    });

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

    btnReplay.addEventListener('click', () => {
        replayCurrentStep();
    });

    btnStop.addEventListener('click', () => {
        stopAutoPlay();
    });

    btnNext.addEventListener('click', () => {
        playNextStep();
    });

    btnEnd.addEventListener('click', () => {
        playFromEndStep();
    });

    if (positionSlider) {
        positionSlider.addEventListener('input', () => {
            const targetIndex = Number(positionSlider.value);
            if (!Number.isFinite(targetIndex)) {
                return;
            }
            setCurrentConnectionPosition(targetIndex);
        });
    }

    updateFlowControlButtons();
}

/**
 * Updates slider state for current connection position.
 */
function updateFlowPositionControl() {
    const positionSlider = document.getElementById('flow-position-slider');
    const positionValue = document.getElementById('flow-position-value');
    if (!positionSlider || !positionValue) {
        return;
    }

    const total = connectionSequence.length;
    if (total <= 0) {
        positionSlider.min = '0';
        positionSlider.max = '0';
        positionSlider.value = '0';
        positionSlider.disabled = true;
        positionValue.textContent = '0 / 0';
        return;
    }

    const selectedIndex = currentSelectedConnectionIndex >= 0
        ? Math.min(currentSelectedConnectionIndex, total - 1)
        : 0;

    positionSlider.min = '0';
    positionSlider.max = String(total - 1);
    positionSlider.value = String(selectedIndex);
    positionSlider.disabled = flowController.isPlaying;
    positionValue.textContent = `${selectedIndex + 1} / ${total}`;
}

/**
 * Initializes the view panel controls (grid toggle, etc.).
 */
function initViewPanel() {
    const chkGrid = document.getElementById('chk-view-grid');
    const chkComponentPosition = document.getElementById('chk-view-component-position');
    const chkAnimateComponents = document.getElementById('chk-view-animate-components');
    const devControls = document.getElementById('dev-controls');
    const chkDevMode = document.getElementById('chk-dev-mode');
    const btnDevExport = document.getElementById('btn-dev-export');

    if (!chkGrid || !chkComponentPosition || !chkAnimateComponents || !devControls || !chkDevMode || !btnDevExport) {
        console.warn('view panel controls not found');
        return;
    }

    LABEL.gridLabelsGroup.visible = false;
    LABEL.yAxisGroup.visible = false;
    gridHelper.visible = false;
    chkGrid.checked = false;
    chkComponentPosition.checked = !!modelVisualSettings.showComponentPosition;
    chkAnimateComponents.checked = !!modelVisualSettings.animateComponents;
    chkDevMode.checked = false;
    setDeveloperModeEnabled(false);
    devControls.style.display = modelDeveloperSettings.showDeveloperControls ? 'inline-flex' : 'none';

    if (!modelDeveloperSettings.showDeveloperControls) {
        chkDevMode.checked = false;
        setDeveloperModeEnabled(false);
    }

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

    chkComponentPosition.addEventListener('change', () => {
        modelVisualSettings.showComponentPosition = chkComponentPosition.checked;
        updateCurrentConnectionMarker();
    });

    chkAnimateComponents.addEventListener('change', () => {
        modelVisualSettings.animateComponents = chkAnimateComponents.checked;
    });

    chkDevMode.addEventListener('change', () => {
        setDeveloperModeEnabled(chkDevMode.checked);
    });

    btnDevExport.addEventListener('click', () => {
        exportDeveloperModelJson();
    });

    updateDeveloperModeUI();
}

/**
 * Synchronizes view panel controls with current model/settings state.
 */
function syncViewPanelStateFromSettings() {
    const chkComponentPosition = document.getElementById('chk-view-component-position');
    const chkAnimateComponents = document.getElementById('chk-view-animate-components');
    const devControls = document.getElementById('dev-controls');
    const chkDevMode = document.getElementById('chk-dev-mode');

    if (chkComponentPosition) {
        chkComponentPosition.checked = !!modelVisualSettings.showComponentPosition;
    }

    if (chkAnimateComponents) {
        chkAnimateComponents.checked = !!modelVisualSettings.animateComponents;
    }

    if (devControls) {
        devControls.style.display = modelDeveloperSettings.showDeveloperControls ? 'inline-flex' : 'none';
    }

    if (chkDevMode) {
        chkDevMode.checked = developerModeState.enabled;
    }

    if (!modelDeveloperSettings.showDeveloperControls) {
        if (chkDevMode) {
            chkDevMode.checked = false;
        }
        setDeveloperModeEnabled(false);
    }

    updateDeveloperModeUI();
}

/**
 * Updates the enabled/disabled state of flow control buttons based on playback state.
 */
function updateFlowControlButtons() {
    const btnStart = document.getElementById('btn-flow-start');
    const btnPrev = document.getElementById('btn-flow-prev');
    const btnPlay = document.getElementById('btn-flow-play');
    const btnReplay = document.getElementById('btn-flow-replay');
    const btnStop = document.getElementById('btn-flow-stop');
    const btnNext = document.getElementById('btn-flow-next');
    const btnEnd = document.getElementById('btn-flow-end');

    if (!btnStart || !btnPrev || !btnPlay || !btnReplay || !btnStop || !btnNext || !btnEnd) return;

    const hasConnections = connectionSequence.length > 0;

    if (flowController.isPlaying) {
        btnPlay.disabled = true;
        btnStop.disabled = false;
        btnStart.disabled = true;
        btnPrev.disabled = true;
        btnReplay.disabled = true;
        btnNext.disabled = true;
        btnEnd.disabled = true;
    } else {
        btnPlay.disabled = !hasConnections;
        btnStop.disabled = true;
        btnStart.disabled = !hasConnections;
        btnPrev.disabled = !hasConnections;
        btnReplay.disabled = !hasConnections || currentSelectedConnectionIndex < 0;
        btnNext.disabled = !hasConnections;
        btnEnd.disabled = !hasConnections;
    }

    updateFlowPositionControl();
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

renderer.domElement.addEventListener('pointerdown', onDeveloperPointerDown);
renderer.domElement.addEventListener('pointermove', onDeveloperPointerMove);
renderer.domElement.addEventListener('pointerup', onDeveloperPointerUp);
renderer.domElement.addEventListener('pointercancel', onDeveloperPointerUp);
window.addEventListener('keydown', onDeveloperKeyDown);

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
await loadAdditionalModelFilesFromProperties();
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
            deactivateComponentsForFlow(flow.activeComponentIds);
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
    currentSelectedConnectionIndex = currentConnectionIndex;
    updateCurrentConnectionMarker();
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
        deactivateComponentsForFlow(flow.activeComponentIds);
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
 * Plays a specific connection by index from the active sequence.
 * @param {number} index - Index in connectionSequence
 */
function playConnectionAtIndex(index) {
    stopAllFlows();
    flowController.isPlaying = false;

    if (connectionSequence.length === 0) {
        currentSelectedConnectionIndex = -1;
        currentConnectionIndex = 0;
        updateCurrentConnectionMarker();
        updateFlowControlButtons();
        return;
    }

    const targetIndex = Math.max(0, Math.min(index, connectionSequence.length - 1));
    const connLine = connectionSequence[targetIndex];

    startDataFlowOnConnection(connLine, {
        loop: false
    });

    currentSelectedConnectionIndex = targetIndex;
    currentConnectionIndex = targetIndex + 1;
    updateCurrentConnectionMarker();
    updateFlowControlButtons();
}

/**
 * Sets the current connection position without starting playback.
 * @param {number} index - Index in connectionSequence
 */
function setCurrentConnectionPosition(index) {
    stopAllFlows();
    flowController.isPlaying = false;

    if (connectionSequence.length === 0) {
        currentSelectedConnectionIndex = -1;
        currentConnectionIndex = 0;
        updateCurrentConnectionMarker();
        updateFlowControlButtons();
        return;
    }

    const targetIndex = Math.max(0, Math.min(index, connectionSequence.length - 1));
    currentSelectedConnectionIndex = targetIndex;
    currentConnectionIndex = targetIndex;
    updateCurrentConnectionMarker();
    updateFlowControlButtons();
}

/**
 * Sets playback position to first active connection.
 */
function playFromStartStep() {
    setCurrentConnectionPosition(0);
}

/**
 * Replays the currently selected connection.
 */
function replayCurrentStep() {
    const targetIndex = currentSelectedConnectionIndex >= 0 ? currentSelectedConnectionIndex : 0;
    playConnectionAtIndex(targetIndex);
}

/**
 * Sets playback position to last active connection.
 */
function playFromEndStep() {
    setCurrentConnectionPosition(connectionSequence.length - 1);
}

/**
 * Plays the next connection in the sequence.
 */
function playNextStep() {
    let targetIndex = currentConnectionIndex;
    if (targetIndex >= connectionSequence.length) {
        targetIndex = connectionSequence.length - 1;
    }
    playConnectionAtIndex(targetIndex);
}

/**
 * Plays the previous connection in the sequence.
 */
function playPrevStep() {
    const targetIndex = Math.max(currentConnectionIndex - 2, 0);
    playConnectionAtIndex(targetIndex);
}

/**
 * Determines whether a connection group should be treated as "fachlich" (business).
 * If no explicit classification exists, groups are treated as business by default.
 * @param {Object} group - Connection group
 * @returns {boolean} True when group is considered business
 */
function isBusinessConnectionGroup(group) {
    if (!group || typeof group !== 'object') return false;

    if (typeof group.fachlich === 'boolean') {
        return group.fachlich;
    }

    if (typeof group.business === 'boolean') {
        return group.business;
    }

    const category = typeof group.category === 'string' ? group.category.toLowerCase() : '';
    if (category === 'technical' || category === 'technisch') {
        return false;
    }

    return true;
}

/**
 * Synchronizes the master checkbox state for business groups.
 * @param {HTMLInputElement} checkbox - Master checkbox element
 * @param {Array<Object>} businessGroups - List of groups considered business
 */
function updateBusinessGroupsMasterCheckboxState(checkbox, businessGroups) {
    if (!checkbox) return;

    if (!businessGroups.length) {
        checkbox.checked = false;
        checkbox.indeterminate = false;
        checkbox.disabled = true;
        return;
    }

    checkbox.disabled = false;
    const activeCount = businessGroups.filter(group => group.active !== false).length;

    checkbox.checked = activeCount === businessGroups.length;
    checkbox.indeterminate = activeCount > 0 && activeCount < businessGroups.length;
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

    const fixedControls = document.createElement('div');
    fixedControls.className = 'connection-groups-fixed-controls';

    const groupsScrollList = document.createElement('div');
    groupsScrollList.className = 'connection-groups-scroll-list';

    const businessGroups = connectionGroups.filter(isBusinessConnectionGroup);

    const masterRow = document.createElement('div');
    masterRow.className = 'connection-group-row connection-group-row-master';

    const masterCheckbox = document.createElement('input');
    masterCheckbox.type = 'checkbox';

    masterCheckbox.addEventListener('change', () => {
        businessGroups.forEach(group => {
            group.active = masterCheckbox.checked;
        });

        updateConnectionVisibilityFromGroups();
        rebuildConnectionSequence();
        buildConnectionGroupsUI();
    });

    const masterLabel = document.createElement('span');
    masterLabel.textContent = 'all groups';

    masterRow.appendChild(masterCheckbox);
    masterRow.appendChild(masterLabel);
    fixedControls.appendChild(masterRow);

    const modeRowConnectionsOnly = document.createElement('label');
    modeRowConnectionsOnly.className = 'connection-group-row connection-group-row-mode';

    const modeOnlyConnectionsRadio = document.createElement('input');
    modeOnlyConnectionsRadio.type = 'radio';
    modeOnlyConnectionsRadio.name = 'connection-visibility-mode';
    modeOnlyConnectionsRadio.checked = !modelVisualSettings.selectConnectionsAndComponents;

    const modeOnlyConnectionsLabel = document.createElement('span');
    modeOnlyConnectionsLabel.textContent = 'only connections';

    modeOnlyConnectionsRadio.addEventListener('change', () => {
        if (!modeOnlyConnectionsRadio.checked) return;
        modelVisualSettings.selectConnectionsAndComponents = false;
        updateConnectionVisibilityFromGroups();
    });

    modeRowConnectionsOnly.appendChild(modeOnlyConnectionsRadio);
    modeRowConnectionsOnly.appendChild(modeOnlyConnectionsLabel);
    fixedControls.appendChild(modeRowConnectionsOnly);

    const modeRowConnectionsAndComponents = document.createElement('label');
    modeRowConnectionsAndComponents.className = 'connection-group-row connection-group-row-mode';

    const modeConnectionsAndComponentsRadio = document.createElement('input');
    modeConnectionsAndComponentsRadio.type = 'radio';
    modeConnectionsAndComponentsRadio.name = 'connection-visibility-mode';
    modeConnectionsAndComponentsRadio.checked = !!modelVisualSettings.selectConnectionsAndComponents;

    const modeConnectionsAndComponentsLabel = document.createElement('span');
    modeConnectionsAndComponentsLabel.textContent = 'connections & components';

    modeConnectionsAndComponentsRadio.addEventListener('change', () => {
        if (!modeConnectionsAndComponentsRadio.checked) return;
        modelVisualSettings.selectConnectionsAndComponents = true;
        updateConnectionVisibilityFromGroups();
    });

    modeRowConnectionsAndComponents.appendChild(modeConnectionsAndComponentsRadio);
    modeRowConnectionsAndComponents.appendChild(modeConnectionsAndComponentsLabel);
    fixedControls.appendChild(modeRowConnectionsAndComponents);

    container.appendChild(fixedControls);
    container.appendChild(groupsScrollList);

    connectionGroups.forEach(group => {
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

            // 3. Update top-level toggle state
            updateBusinessGroupsMasterCheckboxState(masterCheckbox, businessGroups);
        });

        const label = document.createElement('span');
        label.textContent = `${group.order}: ${group.name}`;

        row.appendChild(checkbox);
        row.appendChild(label);
        groupsScrollList.appendChild(row);
    });

    updateBusinessGroupsMasterCheckboxState(masterCheckbox, businessGroups);

    rebuildConnectionSequence();


}








