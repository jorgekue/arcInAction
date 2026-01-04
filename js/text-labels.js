import * as THREE from '../lib/three.module.js';
import { FontLoader } from '../lib/FontLoader.js';
import { TextGeometry } from '../lib/TextGeometry.js';


export let globalFont = null;
let globalLabelColor = 'lightgray';
const globalTextSize = 0.2;
export let gridLabelsGroup = null; // Gruppe für alle Grid-Beschriftungen
export let yAxisGroup;    // neue Gruppe für die Y-Achse

export function loadFontAsync() {
  return new Promise((resolve, reject) => {
    const loader = new FontLoader();
    loader.load(
      './fonts/helvetiker_regular.typeface.json',
      font => {
        globalFont = font;
        console.log('Font geladen');
        resolve(font);
      },
      undefined,
      err => {
        console.error('Fehler beim Laden der Font:', err);
        reject(err);
      }
    );
  });
}

export function createMultilineTextMesh(label, size, depth = 0.01, color = 0x000000, lineSpacingFactor = 1.2) {
    if (!globalFont || !label) {
        console.warn('createMultilineTextMesh: no font or empty label', globalFont, label);
        return null;
    }
    if (globalLabelColor) {
        color = globalLabelColor;
    }

    const lines = String(label).split('\n'); // \n als Zeilenumbruch

    const group = new THREE.Group();
    const lineMeshes = [];

    // Zuerst alle Zeilen-Meshes erzeugen
    for (const lineText of lines) {
        if (!lineText.trim()) {
            // Leere Zeile: wir setzen später nur Abstand
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

    // Vertikale Anordnung der Zeilen
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

export function addYAxisLabels(maxY = 10, stepY = 1) {
    if (!globalFont || !yAxisGroup) return;

    for (let y = -maxY; y <= maxY; y += stepY) {
        if (y === 0) continue;

        const label = createMultilineTextMesh(String(y), 0.3, 0.01, 'gray');
        label.position.set(0.2, y, 0); // leicht neben die Achse
        yAxisGroup.add(label);
    }
}

export function addGridLabels() {
    // if (gridLabelsGroup) {
    //     scene.remove(gridLabelsGroup);
    // }

    gridLabelsGroup = new THREE.Group();
    gridLabelsGroup.name = 'GridLabels';

    // Beispiel: X- und Z-Beschriftung
    const size = 50;
    const step = 1;

    for (let i = -size / 2; i <= size / 2; i += step) {
        // X-Achse
        const labelX = createMultilineTextMesh(String(i), 0.3, 0.01, 'gray');
        labelX.position.set(i, 0.01, 0); // leicht neben die Achse
        gridLabelsGroup.add(labelX);

        // Z-Achse
        const labelZ = createMultilineTextMesh(String(i), 0.3, 0.01, 'gray');
        labelZ.position.set(0, 0.01, i);
        gridLabelsGroup.add(labelZ);
    }

    return gridLabelsGroup;
}

export function createYAxis(maxY = 10, stepY = 1, color = 'gray') {
    if (yAxisGroup) {
        scene.remove(yAxisGroup);
    }

    yAxisGroup = new THREE.Group();

    // 1) Hauptachse: deutlich über dem Grid versetzen (z.B. in X)
    const xOffset = 0.001; // minimal reicht meist, zur Sicherheit nimm z.B. 0.2
    const axisMaterial = new THREE.LineBasicMaterial({ color, linewidth: 2 });

    const axisGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xOffset, -maxY, 0),
        new THREE.Vector3(xOffset, maxY, 0)
    ]);

    const axisLine = new THREE.Line(axisGeom, axisMaterial);
    yAxisGroup.add(axisLine);

    // 2) Markierungen / Ticks
    const tickLength = 0.2;
    const tickMaterial = new THREE.LineBasicMaterial({ color });

    for (let y = -maxY; y <= maxY; y += stepY) {
        if (y === 0) continue; // Ursprung auslassen (da sitzt das Grid)

        const tickGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(xOffset - tickLength / 2, y, 0),
            new THREE.Vector3(xOffset + tickLength / 2, y, 0)
        ]);
        const tick = new THREE.Line(tickGeom, tickMaterial);
        yAxisGroup.add(tick);
    }
    return yAxisGroup;
}

export function addTextOnBoxFront(boxMesh, text, width, height, depth) {
    if (!text) return;

    const textSize = globalTextSize;
    const textDepth = textSize * 0.01;

    const textMesh1 = createMultilineTextMesh(text, textSize, textDepth);
    const textMesh2 = createMultilineTextMesh(text, textSize, textDepth);
    if (!textMesh1 || !textMesh2) return;

    // Lokale Koordinaten: Mittelpunkt (0,0,0), Frontfläche z = +depth/2
    const z = depth / 2 + textDepth * 0.6;
    textMesh1.position.set(0, 0, z);
    textMesh2.position.set(0, 0, -z);
    textMesh2.rotation.y = Math.PI;

    boxMesh.add(textMesh1);
    boxMesh.add(textMesh2);
}

export function addTextOnCylinderEnd(cylMesh, text, radius, height, axis = 'y') {
    if (!text) return;

    const textSize = globalTextSize;
    const textDepth = 0.01;

    const textMesh1 = createMultilineTextMesh(text, textSize, textDepth);
    if (!textMesh1) return;

    const d = textDepth * 0.6;

    if (axis === 'y') {
        const textMesh2 = createMultilineTextMesh(text, textSize, textDepth);
        if (!textMesh2) return;
        // Zylinder-Achse in Y (Standard in Three.js)
        // Stirnfläche oben (+Y)
        const y = height / 2 + d;
        textMesh1.position.set(0, y, 0);
        textMesh1.rotation.x = -Math.PI / 2; // Normale +Y
        textMesh2.position.set(0, -y, 0);
        textMesh2.rotation.x = -Math.PI / 2;
        textMesh2.rotation.y = Math.PI;
        cylMesh.add(textMesh2);
    } else if (axis === 'z') {
        // Achse in Z (z.B. Queue in Z-Richtung)
        const z = height / 2 + d;
        textMesh1.position.set(0, 0, z);
        // Text liegt in XY-Ebene, Normale +Z -> passt
    } else if (axis === 'x') {
        // Achse in X
        const x = height / 2 + d;
        textMesh1.position.set(x, 0, 0);
        textMesh1.rotation.y = -Math.PI / 2; // Normale +X
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
    // ConeGeometry: Mittelpunkt bei (0,0,0), Höhe entlang Y,
    // Spitze oben (y = +height/2), Basis unten (y = -height/2).
    const y = -height * 0.1; // leicht unterhalb der Mitte

    // Abstand vom Zentrum in Z-Richtung:
    // Mantelradius in Höhe y ist kleiner als Basisradius; wir nehmen großzügig den Basisradius.
    const z = radius + textDepth * 0.6;

    textGroup.position.set(0, y, z);

    // Text liegt in XY-Ebene, Normale +Z → genau Richtung „vorne“ des Kegels
    coneMesh.add(textGroup);
}


