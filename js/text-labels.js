/**
 * @module text-labels
 * @description Text labeling system for 3D components in the architecture viewer.
 * Provides functions to create and position text labels on various 3D geometries
 * (boxes, cylinders, cones) and for grid/axis labeling.
 */

import * as THREE from '../lib/three.module.js';
import { FontLoader } from '../lib/FontLoader.js';
import { TextGeometry } from '../lib/TextGeometry.js';

/** @type {THREE.Font|null} Global font instance loaded from typeface JSON */
export let globalFont = null;

/** @type {string} Default color for text labels */
let globalLabelColor = 'lightgray';

/** @type {number} Default size for text labels in world units */
const globalTextSize = 0.2;

/** @type {THREE.Group|null} Group containing all grid labels */
export let gridLabelsGroup = null;

/** @type {THREE.Group|undefined} Group containing the Y-axis and its labels */
export let yAxisGroup;

/**
 * Loads the font asynchronously from a typeface JSON file.
 * Must be called before creating any text meshes.
 * @returns {Promise<THREE.Font>} Promise that resolves with the loaded font
 * @throws {Error} If font loading fails
 */
export function loadFontAsync() {
  return new Promise((resolve, reject) => {
    const loader = new FontLoader();
    loader.load(
      './fonts/gentilis_regular.typeface.json',
      font => {
        globalFont = font;
        console.log('Font loaded successfully');
        resolve(font);
      },
      undefined,
      err => {
        console.error('Error loading font:', err);
        reject(err);
      }
    );
  });
}

/**
 * Creates a 3D text mesh that supports multiline text (separated by \n).
 * @param {string} label - The text to display (can contain \n for line breaks)
 * @param {number} size - Text size in world units
 * @param {number} [depth=0.01] - Extrusion depth of the text
 * @param {number|string} [color=0x000000] - Text color (hex number or CSS color string)
 * @param {number} [lineSpacingFactor=1.2] - Multiplier for spacing between lines
 * @returns {THREE.Group|null} Group containing all line meshes, or null if font not loaded or label is empty
 */
export function createMultilineTextMesh(label, size, depth = 0.01, color = 0x000000, lineSpacingFactor = 1.2) {
    if (!globalFont || !label) {
        console.warn('createMultilineTextMesh: no font or empty label', globalFont, label);
        return null;
    }
    if (globalLabelColor) {
        color = globalLabelColor;
    }

    const lines = String(label).split('\n'); // Split by newline character

    const group = new THREE.Group();
    const lineMeshes = [];

    // Create mesh for each non-empty line
    for (const lineText of lines) {
        if (!lineText.trim()) {
            // Empty line: we'll add spacing later, but no mesh
            lineMeshes.push(null);
            continue;
        }

        const geom = new TextGeometry(lineText, {
            font: globalFont,
            size: size,
            depth: depth,
            curveSegments: 6,
            bevelEnabled: false
        });
        geom.computeBoundingBox();
        geom.center();

        const mat = new THREE.MeshBasicMaterial({
            color,
            side: THREE.FrontSide
        });

        const mesh = new THREE.Mesh(geom, mat);
        lineMeshes.push(mesh);
        group.add(mesh);
    }

    // Arrange lines vertically, centered
    const lineHeight = size * lineSpacingFactor;
    const totalHeight = (lines.length - 1) * lineHeight;
    const startY = totalHeight / 2;

    lines.forEach((lineText, index) => {
        const mesh = lineMeshes[index];
        const y = startY - index * lineHeight;
        if (mesh) {
            mesh.position.y = y;
        }
        // Leere Zeilen bekommen nur „Abstand“, kein Mesh
    });

    return group;
}

/**
 * Adds numeric labels to the Y-axis at regular intervals.
 * @param {number} [maxY=10] - Maximum Y value to label (labels from -maxY to +maxY)
 * @param {number} [stepY=1] - Step size between labels
 */
export function addYAxisLabels(maxY = 10, stepY = 1) {
    if (!globalFont || !yAxisGroup) return;

    for (let y = -maxY; y <= maxY; y += stepY) {
        if (y === 0) continue; // Skip origin

        const label = createMultilineTextMesh(String(y), 0.3, 0.01, 'gray');
        label.position.set(0.2, y, 0); // Slightly offset from the axis
        yAxisGroup.add(label);
    }
}

/**
 * Creates labels for the grid along the X and Z axes.
 * @returns {THREE.Group} Group containing all grid labels
 */
export function addGridLabels() {
    gridLabelsGroup = new THREE.Group();
    gridLabelsGroup.name = 'GridLabels';

    // Label X and Z axes
    const size = 50;
    const step = 1;

    for (let i = -size / 2; i <= size / 2; i += step) {
        // X-axis labels
        const labelX = createMultilineTextMesh(String(i), 0.3, 0.01, 'gray');
        labelX.position.set(i, 0.01, 0); // Slightly above the grid
        gridLabelsGroup.add(labelX);

        // Z-axis labels
        const labelZ = createMultilineTextMesh(String(i), 0.3, 0.01, 'gray');
        labelZ.position.set(0, 0.01, i);
        gridLabelsGroup.add(labelZ);
    }

    return gridLabelsGroup;
}

/**
 * Creates a Y-axis line with tick marks for spatial reference.
 * Note: This function references a global 'scene' variable that must exist in the calling context.
 * @param {number} [maxY=10] - Maximum Y value for the axis (axis extends from -maxY to +maxY)
 * @param {number} [stepY=1] - Step size between tick marks
 * @param {string|number} [color='gray'] - Color of the axis and ticks
 * @returns {THREE.Group} Group containing the axis line and tick marks
 */
export function createYAxis(maxY = 10, stepY = 1, color = 'gray') {
    if (yAxisGroup) {
        // Note: scene must be available in the calling context
        // This is a limitation of the current architecture
        if (typeof scene !== 'undefined') {
            scene.remove(yAxisGroup);
        }
    }

    yAxisGroup = new THREE.Group();

    // Main axis: slightly offset in X direction to avoid z-fighting with grid
    const xOffset = 0.001;
    const axisMaterial = new THREE.LineBasicMaterial({ color, linewidth: 2 });

    const axisGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xOffset, -maxY, 0),
        new THREE.Vector3(xOffset, maxY, 0)
    ]);

    const axisLine = new THREE.Line(axisGeom, axisMaterial);
    yAxisGroup.add(axisLine);

    // Tick marks at regular intervals
    const tickLength = 0.2;
    const tickMaterial = new THREE.LineBasicMaterial({ color });

    for (let y = -maxY; y <= maxY; y += stepY) {
        if (y === 0) continue; // Skip origin (where grid sits)

        const tickGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(xOffset - tickLength / 2, y, 0),
            new THREE.Vector3(xOffset + tickLength / 2, y, 0)
        ]);
        const tick = new THREE.Line(tickGeom, tickMaterial);
        yAxisGroup.add(tick);
    }
    return yAxisGroup;
}

/**
 * Adds text labels to the front and back faces of a box geometry.
 * @param {THREE.Mesh|THREE.Group} boxMesh - The box mesh to attach labels to
 * @param {string} text - The text to display (supports multiline with \n)
 * @param {number} width - Width of the box
 * @param {number} height - Height of the box
 * @param {number} depth - Depth of the box
 */
export function addTextOnBoxFront(boxMesh, text, width, height, depth) {
    if (!text) return;

    const textSize = globalTextSize;
    const textDepth = textSize * 0.01;

    const textMesh1 = createMultilineTextMesh(text, textSize, textDepth);
    const textMesh2 = createMultilineTextMesh(text, textSize, textDepth);
    if (!textMesh1 || !textMesh2) return;

    // Local coordinates: center at (0,0,0), front face at z = +depth/2
    const z = depth / 2 + textDepth * 0.6;
    textMesh1.position.set(0, 0, z);
    textMesh2.position.set(0, 0, -z);
    textMesh2.rotation.y = Math.PI; // Rotate back face label 180 degrees

    boxMesh.add(textMesh1);
    boxMesh.add(textMesh2);
}

/**
 * Adds text labels to the end faces of a cylinder geometry.
 * Supports cylinders oriented along X, Y, or Z axis.
 * @param {THREE.Mesh|THREE.Group} cylMesh - The cylinder mesh to attach labels to
 * @param {string} text - The text to display (supports multiline with \n)
 * @param {number} radius - Radius of the cylinder
 * @param {number} height - Height (length) of the cylinder along its axis
 * @param {string} [axis='y'] - Orientation of the cylinder axis ('x', 'y', or 'z')
 */
export function addTextOnCylinderEnd(cylMesh, text, radius, height, axis = 'y') {
    if (!text) return;

    const textSize = globalTextSize;
    const textDepth = 0.01;

    const textMesh1 = createMultilineTextMesh(text, textSize, textDepth);
    if (!textMesh1) return;

    const d = textDepth * 0.6;

    if (axis === 'y') {
        // Cylinder axis along Y (THREE.js default)
        // End faces at top (+Y) and bottom (-Y)
        const textMesh2 = createMultilineTextMesh(text, textSize, textDepth);
        if (!textMesh2) return;
        const y = height / 2 + d;
        textMesh1.position.set(0, y, 0);
        textMesh1.rotation.x = -Math.PI / 2; // Normal pointing +Y
        textMesh2.position.set(0, -y, 0);
        textMesh2.rotation.x = -Math.PI / 2;
        textMesh2.rotation.y = Math.PI; // Rotate bottom label
        cylMesh.add(textMesh2);
    } else if (axis === 'z') {
        // Axis along Z (e.g., queue oriented in Z direction)
        const z = height / 2 + d;
        textMesh1.position.set(0, 0, z);
        // Text lies in XY plane, normal +Z (no rotation needed)
    } else if (axis === 'x') {
        // Axis along X
        const x = height / 2 + d;
        textMesh1.position.set(x, 0, 0);
        textMesh1.rotation.y = -Math.PI / 2; // Normal pointing +X
    }
    cylMesh.add(textMesh1);
}


export function addTextOnConeSide(coneMesh, label, radius, height) {
    if (!label) return;

    // Textgröße relativ zur Kegelhöhe
    const textSize = globalTextSize;
    const textDepth = radius * 0.03 || 0.01; // dünn

    const textGroup = createMultilineTextMesh(label, textSize, textDepth);
    if (!textGroup) return;

    // Wir platzieren den Text ungefähr im „Bauchbereich“ des Kegels.
    // ConeGeometry: center at (0,0,0), height along Y axis,
    // tip at top (y = +height/2), base at bottom (y = -height/2).
    const y = -height * 0.1; // Slightly below center

    // Distance from center in Z direction:
    // Mantle radius at height y is smaller than base radius; we use the base radius generously.
    const z = radius + textDepth * 0.6;

    textGroup.position.set(0, y, z);

    // Text liegt in XY-Ebene, Normale +Z → genau Richtung „vorne“ des Kegels
    coneMesh.add(textGroup);
}


