import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';
import * as LABEL from '../js/text-labels.js';

console.log('Three-Revision:', THREE.REVISION);

const activeFlows = []; // laufende Datenfluss-Animationen

let connectionGroups = [];      // aus dem Modell geparst
let connectionSequence = [];    // geordnete Liste der Verbindungs-Objekte (Lines)
let currentConnectionIndex = 0;
let gridHelper = null;

const flowController = {
    isPlaying: false,             // Auto-Play-Modus (läuft über alle Connections)
    mode: 'auto',                 // 'auto' oder 'step' (optional)
    defaultDuration: 2          // Sekunden pro Verbindung
};

// --- Statische Liste der Modelldateien im Verzeichnis der viewer.html ---
const modelFiles = [
    { name: 'Standardmodell', file: 'model.json' },
    { name: 'Einfaches Modell', file: 'simple-model.json' }
    // weitere Modelle:
    // { name: 'XY', file: 'xy.json' }
];

let currentModelFile = 'model.json';  // Startmodell

// --- Kamera-Presets ---
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
let currentCameraViewId = 'iso';
let cameraAnimation = null;

// --- Szene / Kamera / Renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(10, 10, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;

// --- Licht ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// --- Boden / Grid ---
gridHelper = new THREE.GridHelper(50, 50);
scene.add(gridHelper);
gridHelper.visible = false;

function addLayerLabels(model) {
    const layers = model.layers || [];
    const y = 0.3;          // gleiche Höhe wie Grid-Labels
    const x = -18;          // ein Stück links neben dem Zentrum

    layers.forEach(layer => {
        const z = layer.z || 0;
        const name = layer.name || `Layer ${z}`;

        const label = createTextSprite(name);
        label.position.set(x, y, z);
        scene.add(label);
    });
}


function createTextSprite(text) {
    const font = '14px Arial';                // kleinere Schrift
    const color = '#ffffff';
    const background = 'rgba(0, 0, 0, 0.7)';
    const padding = 6;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    context.font = font;
    const metrics = context.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = 18;

    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = font;
    context.fillStyle = color;
    context.textBaseline = 'middle';
    context.fillText(text, padding, canvas.height / 2);

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

    const worldHeight = 0.7;                 // vorher z.B. 1.0 oder 3.0
    const aspect = canvas.width / canvas.height;
    sprite.scale.set(worldHeight * aspect, worldHeight, 1);

    return sprite;
}

// Datenstrukturen
const componentCenters = new Map();  // id -> THREE.Vector3
const componentMeshes = new Map();  // id -> { mesh, data }

let modelData = null;
let lastHighlight = null;

// --- Hilfsfunktionen Details / Highlight ---
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

function clearDetails() {
    const el = document.getElementById('details-content');
    el.innerHTML = 'Keine Auswahl';
}

function highlightMesh(mesh) {
    clearHighlight();
    if (mesh.material && 'emissive' in mesh.material) {
        mesh.material.emissive.set(0x333333);
        lastHighlight = mesh;
    }
}

function clearHighlight() {
    if (lastHighlight && lastHighlight.material && 'emissive' in lastHighlight.material) {
        lastHighlight.material.emissive.set(0x000000);
    }
    lastHighlight = null;
}

// --- Szene leeren (für neues Modell) ---
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

// --- Komponenten ---
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
            // NEU: "person" / "actor"
            if (c.type === 'person' || c.type === 'actor') {
                // Spielfigur: Kegel (Körper) + Kugel (Kopf)
                bodyRadius = (Math.min(width, depth) || 1) / 2;  // Basisradius
                bodyHeight = height || 1.5;                      // Körperhöhe
                const headRadius = bodyRadius * 0.6;                   // Kopf etwas kleiner

                // Kegel für den Körper (Cone: Radius, Höhe)
                const coneGeom = new THREE.ConeGeometry(bodyRadius, bodyHeight, 16);
                const coneMat = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(colorValue),
                    shininess: 30
                });
                const cone = new THREE.Mesh(coneGeom, coneMat);

                // Kugel für den Kopf
                const sphereGeom = new THREE.SphereGeometry(headRadius, 16, 16);
                const sphereMat = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(colorValue),  // Kopf z.B. weiß
                    shininess: 30
                });
                const head = new THREE.Mesh(sphereGeom, sphereMat);

                // Kegel-Mittelpunkt liegt im Ursprung:
                // Spitze des Kegels: +bodyHeight/2
                // Obere Kugeloberfläche soll genau auf der Spitze liegen:
                // sphereCenterY + headRadius = bodyHeight/2  → sphereCenterY = bodyHeight/2 - headRadius
                const sphereCenterY = bodyHeight / 2 - headRadius;
                head.position.y = sphereCenterY;


                // Beide in einem Group zusammenfassen
                const group = new THREE.Group();
                group.add(cone);
                group.add(head);

                mesh = group;  // wir setzen "mesh" hier auf die Gruppe

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
                        // Uhr-Gehäuse: flacher Zylinder
                        radius = Math.max(width, height) / 2;
                        const bodyHeight = depth * 0.5; // etwas flacher als height
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

                    // Basis-Uhrgehäuse (Zylinder)
                    const clockBody = mesh;
                    schedulerGroup.add(clockBody);

                    const radius = Math.max(width, height) / 2;
                    const bodyHeight = depth * 0.5;

                    // Zifferblatt
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

                    // Obere Seite (+Y)
                    const faceTop = new THREE.Mesh(faceGeom, faceMat);
                    faceTop.position.y = bodyHeight / 2 + (bodyHeight * 0.05);
                    schedulerGroup.add(faceTop);

                    // Untere Seite (-Y)
                    const faceBottom = new THREE.Mesh(faceGeom, faceMat);
                    faceBottom.position.y = -bodyHeight / 2 - (bodyHeight * 0.05);
                    schedulerGroup.add(faceBottom);


                    // ---------- ZEIGER: Pivot-Gruppe + versetzte Box ----------

                    const handThickness = bodyHeight * 0.2;
                    const hourHandLength = radius * 0.6;   // sichtbare Gesamtlänge
                    const minuteHandLength = radius * 0.9; // sichtbare Gesamtlänge

                    // Y-Position leicht über dem Zifferblatt
                    const baseHandY = bodyHeight / 2 + bodyHeight * 0.05 + handThickness * 0.5;

                    // --- Stundenzeiger ---

                    // Gruppe mit Pivot in der Kreismitte
                    const hourHandGroup = new THREE.Group();
                    hourHandGroup.position.set(0, baseHandY, 0); // Mittelpunkt der Uhr

                    // Geometrie nur halb so lang
                    const hourHandGeom = new THREE.BoxGeometry(
                        hourHandLength,
                        handThickness,
                        handThickness
                    );
                    const hourHandMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
                    const hourHandMesh = new THREE.Mesh(hourHandGeom, hourHandMat);

                    // Box so verschieben, dass ihr inneres Ende am Pivot liegt
                    // → Zeiger geht von x=0 (Pivot) bis x=hourHandLength/2
                    hourHandMesh.position.set(hourHandLength / 2, 0, 0);

                    hourHandGroup.add(hourHandMesh);
                    schedulerGroup.add(hourHandGroup);

                    // Rotation NUR an der Gruppe
                    // Pivot liegt in der Kreismitte → Zeiger rotiert sauber um die Mitte
                    hourHandGroup.rotation.y = Math.PI * 0.7; // z.B. 10 Uhr

                    // --- Stundenzeiger unten ---

                    const hourHandGeomBottom = hourHandGeom; // gleiche Geometrie
                    const hourHandMeshBottom = new THREE.Mesh(hourHandGeomBottom, hourHandMat);
                    hourHandMeshBottom.position.set(hourHandLength / 2, 0, 0);

                    const hourHandGroupBottom = new THREE.Group();
                    hourHandGroupBottom.position.set(0, -baseHandY, 0); // Pivot in Kreismitte (unten)
                    hourHandGroupBottom.add(hourHandMeshBottom);

                    // gleiche Winkelrichtung wie oben
                    hourHandGroupBottom.rotation.y = Math.PI - Math.PI * 0.7;

                    schedulerGroup.add(hourHandGroupBottom);

                    // --- Minutenzeiger ---

                    const minuteHandGroup = new THREE.Group();
                    minuteHandGroup.position.set(0, baseHandY + handThickness * 0.3, 0);

                    const minuteHandGeom = new THREE.BoxGeometry(
                        minuteHandLength,
                        handThickness * 0.8,
                        handThickness * 0.8
                    );
                    const minuteHandMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
                    const minuteHandMesh = new THREE.Mesh(minuteHandGeom, minuteHandMat);

                    // auch hier: inneres Ende am Pivot
                    minuteHandMesh.position.set(minuteHandLength / 2, 0, 0);

                    minuteHandGroup.add(minuteHandMesh);
                    schedulerGroup.add(minuteHandGroup);

                    minuteHandGroup.rotation.y = -Math.PI * 0.2; // z.B. 2 Uhr

                    // --- Minutenzeiger unten ---

                    const minuteHandGeomBottom = minuteHandGeom;
                    const minuteHandMeshBottom = new THREE.Mesh(minuteHandGeomBottom, minuteHandMat);
                    minuteHandMeshBottom.position.set(minuteHandLength / 2, 0, 0);

                    const minuteHandGroupBottom = new THREE.Group();
                    minuteHandGroupBottom.position.set(0, -baseHandY - handThickness * 0.3, 0);
                    minuteHandGroupBottom.add(minuteHandMeshBottom);

                    minuteHandGroupBottom.rotation.y = Math.PI + Math.PI * 0.2;

                    schedulerGroup.add(minuteHandGroupBottom);


                    // ---------- Scheduler-Gruppe als gesamtes Mesh ----------
                    mesh = schedulerGroup;
                }


                // Queue-Ausrichtung: Stirnseiten in X- oder Z-Richtung
                if (c.type === 'queue') {
                    const orientation = c.orientation || 'z'; // Default: in Z-Richtung ausrichten

                    if (orientation === 'x') {
                        // Zylinderachse von Y nach X drehen:
                        // Achse Y → X: Rotation um Z-Achse um -90° (oder +90°, je nach Vorzugsrichtung)
                        mesh.rotation.z = -Math.PI / 2;
                    } else if (orientation === 'z') {
                        // Zylinderachse von Y nach Z drehen:
                        // Achse Y → Z: Rotation um X-Achse um +90°
                        mesh.rotation.x = Math.PI / 2;
                    } else {
                        // 'y' oder unbekannt → Standard (Stirnseiten nach oben/unten)
                        // nichts tun
                    }
                }

                // Scheduler-Ausrichtung (Uhr)
                if (c.type === 'scheduler') {
                    const orientation = c.orientation || 'y'; // Default: Zifferblatt nach oben

                    if (orientation === 'y') {
                        // liegend, Zifferblatt nach oben → keine Rotation nötig
                    } else if (orientation === 'z') {
                        // Zifferblatt nach vorne (positive Z)
                        // wir kippen die liegende Uhr um die X-Achse nach vorne
                        mesh.rotation.x = Math.PI / 2;
                    } else if (orientation === 'x') {
                        // Zifferblatt nach rechts (positive X)
                        // liegende Uhr um Z-Achse drehen
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


            // Edges nur für Meshes mit Geometry (nicht für Queue, nicht für person/actor)
            if (c.type !== 'queue' && c.type !== 'person' && c.type !== 'actor' && geometry) {
                const edgesGeom = new THREE.EdgesGeometry(geometry);
                const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
                const wireframe = new THREE.LineSegments(edgesGeom, lineMaterial);
                mesh.add(wireframe);
            }


            c.layerZ = z;

            // userData inkl. Maße
            mesh.userData = {
                id: c.id,
                data: c,
                width,
                height,
                depth
            };

            scene.add(mesh);

            // Label-Richtung je nach Typ
            let labelDir = new THREE.Vector3(0, 0, 1); // Front
            if (c.type === 'database') {
                labelDir.set(1, 0, 0); // rechte Seite
            } else if (c.type === 'person' || c.type === 'actor') {
                labelDir.set(0, 1, 0); // oben
            }
            else if (c.type === 'scheduler') {
                // Scheduler-Label auch nach oben
                labelDir.set(0, 1, 0);
            }

            // Label an das Mesh anhängen (nicht an scene)
            // addComponentLabel(mesh, c.label || c.id, labelDir);

            const labelText = c.label || c.id;

            if (labelText && LABEL.globalFont) {
                if (c.type === 'database') {
                    // DB-Zylinder (Achse Y):
                    LABEL.addTextOnCylinderEnd(mesh, labelText, radius, height, 'y');
                } else if (c.type === 'queue') {
                    // Queue als Zylinder in Z-Richtung:
                    LABEL.addTextOnCylinderEnd(mesh, labelText, radius, depth, 'y');
                } else if (c.type === 'scheduler') {
                    // Uhrkörper als Zylinder, z.B. Achse Y, Text oben:
                    LABEL.addTextOnCylinderEnd(mesh, labelText, radius, depth, 'y');
                } else if (c.type === 'person' || c.type === 'actor') {
                    // Person hat coneBody als Hauptkörper:
                    LABEL.addTextOnConeSide(mesh, labelText, bodyRadius, bodyHeight);
                } else {
                    // Box & andere rechteckige:
                    LABEL.addTextOnBoxFront(mesh, labelText, width, height, depth);
                }
            }



            // Center berechnen (für Verbindungen etc.)
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

// Pfad + Oberflächen-Endpunkt für eine Connection bestimmen
// - Pfad: Start (Oberfläche from) -> optionale conn.points -> Oberfläche to (mit kleinem Abstand davor)
function buildConnectionPath(conn, fromMesh, toMesh) {
    const fromCenter = new THREE.Vector3();
    fromMesh.getWorldPosition(fromCenter);
    console.log('fromCenter ', fromCenter)
    const toCenter = new THREE.Vector3();
    toMesh.getWorldPosition(toCenter);
    console.log('fromMesh.userData ', fromMesh.userData)

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
    console.log('startSurface ', startSurface)

    // optionale Zwischenpunkte
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


function createConnections(model) {
    // bestehende Connections ggf. vorher aus der Szene entfernen, wenn nötig

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

            // Pfeil-Länge: maximal Segmentlänge minus kleiner Sicherheitsabstand
            let tipGap = 0.02; // Abstand der Pfeilspitze von der Oberfläche

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

    console.log('createConnections: total visual connections', allConnections.length);

    // danach Sequenz für Animation neu aufbauen
    rebuildConnectionSequence();
    // und Sichtbarkeit auf aktuellen Group-Status setzen:
    updateConnectionVisibilityFromGroups();
}

function updateConnectionVisibilityFromGroups() {
    if (!Array.isArray(connectionGroups) || connectionGroups.length === 0) {
        return;
    }

    // Map für schnellen Zugriff: groupName -> active
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

function rebuildConnectionSequence() {
    connectionSequence = [];
    currentConnectionIndex = 0;

    // 1. aktive Gruppen nach order sortieren
    const activeGroups = connectionGroups
        .filter(g => g.active)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (activeGroups.length === 0) {
        console.log('rebuildConnectionSequence: keine aktiven Gruppen');
        return;
    }

    // 2. aus Szene alle Connection-Lines einsammeln
    const allConnectionLines = [];
    scene.traverse(obj => {
        if (obj.userData && obj.userData.type === 'connection') {
            allConnectionLines.push(obj);
        }
    });

    // 3. Für jede aktive Group und deren Connections die passende Line finden
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
                console.warn('Keine Line für Connection in Group', group.name, conn);
            }
        });
    });

    console.log('rebuildConnectionSequence: Sequenzlänge', connectionSequence.length);
}

// --- Datenfluss-Animation starten ---
function startDataFlowOnConnection(connObject, options = {}) {
    const pathPoints = (connObject.userData && connObject.userData.pathPoints) || null;
    const conn = connObject.userData && connObject.userData.connection;

    if (!pathPoints || pathPoints.length < 2) {
        console.warn('Keine pathPoints für Connection, Animation nicht möglich');
        return;
    }

    const modelDuration = conn && conn.flowDuration;
    console.log('Connection flowDuration:', modelDuration);
    const baseDuration = modelDuration != null ? modelDuration : flowController.defaultDuration;
    const duration = options.duration != null ? options.duration : baseDuration;
    console.log('Using flow duration:', duration);
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
    // Für inbound die Reihenfolge umkehren:
    if (conn.direction === 'inbound') {
        pathPoints.reverse();
    }

    activeFlows.push({
        object3D: flowMesh,
        labelSprite,
        pathPoints: pathPoints.map(p => p.clone()),
        duration,
        elapsed: direction === 1 ? 0 : duration,
        loop,
        direction
    });
}

// --- Modell aus Objekt laden ---
function loadModelFromObject(model) {
    clearScene();
    modelData = model;
    addLayerLabels(model);
    createComponents(model);
    // connectionGroups aus Modell übernehmen
    setupConnectionGroupsFromModel(model);
    createConnections(model);
}

function setupConnectionGroupsFromModel(model) {
    // 1. wenn neue Struktur existiert, nutzen
    if (Array.isArray(model.connectionGroups) && model.connectionGroups.length > 0) {
        connectionGroups = model.connectionGroups.map((g, index) => ({
            name: g.name || `Group ${index + 1}`,
            order: g.order != null ? g.order : index,
            color: g.color || 0xffffff,
            active: g.active !== false, // Default: true
            connections: Array.isArray(g.connections) ? g.connections : []
        }));
    } else {
        // 2. Fallback: alte Struktur -> eine Default-Gruppe bauen
        const flatConnections = Array.isArray(model.connections) ? model.connections : [];
        connectionGroups = [{
            name: 'All Connections',
            order: 0,
            active: true,
            connections: flatConnections
        }];
    }

    // Groups nach order sortieren
    connectionGroups.sort((a, b) => (a.order || 0) - (b.order || 0));

    // UI aktualisieren
    buildConnectionGroupsUI();
}

// --- Modell aus Datei laden ---
function loadModelFromFile(fileName) {
    console.log('Lade Modell aus Datei:', fileName);
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
            console.error('Fehler beim Laden des Modells:', err);
            alert('Fehler beim Laden des Modells: ' + fileName);
        });
}

// --- Modell-Liste (Panel) ---
function buildModelListUI() {
    const panel = document.getElementById('modelListPanel');
    if (!panel) {
        console.warn('modelListPanel nicht gefunden');
        return;
    }

    panel.innerHTML = '';

    const title = document.createElement('h4');
    title.textContent = 'Verfügbare Modelle';
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

function initModelListToggle() {
    const btn = document.getElementById('toggleModelListBtn');
    const panel = document.getElementById('modelListPanel');
    if (!btn || !panel) {
        console.warn('ModelList-Toggle-Elemente nicht gefunden');
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

  // Klick auf den halbtransparenten Hintergrund schließt den Dialog
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) {
      close();
    }
  });

  // ESC-Taste schließt den Dialog
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && overlay.style.display !== 'none') {
      close();
    }
  });
}



function initFlowControls() {
    const btnPrev = document.getElementById('btn-flow-prev');
    const btnPlay = document.getElementById('btn-flow-play');
    const btnStop = document.getElementById('btn-flow-stop');
    const btnNext = document.getElementById('btn-flow-next');

    if (!btnPrev || !btnPlay || !btnStop || !btnNext) {
        console.warn('Flow-Control-Buttons nicht gefunden');
        return;
    }

    btnPrev.addEventListener('click', () => {
        playPrevStep();
    });

    btnPlay.addEventListener('click', () => {
        // wenn am Ende → von vorne
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
        console.log('Grid visibility changed:', visible);

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


// --- Kamera-UI ---
function buildCameraControls() {
    const container = document.getElementById('cameraControls');
    if (!container) {
        console.warn('cameraControls-Container nicht gefunden');
        return;
    }

    container.innerHTML = 'Ansicht: ';

    cameraViews.forEach(view => {
        const btn = document.createElement('button');
        btn.textContent = view.label;
        btn.dataset.viewId = view.id;

        btn.addEventListener('click', () => {
            setCameraView(view.id, true);
        });

        container.appendChild(btn);
    });
    const btn = document.createElement('button');
        btn.textContent = 'hallo';
        container.appendChild(btn);
console.log('hallo', btn);
    updateCameraControlsUI();
}

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

function setCameraView(viewId, animate = true) {
    const view = cameraViews.find(v => v.id === viewId);
    if (!view) {
        console.warn('Unbekannte Kameraansicht:', viewId);
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

// --- Interaktion: Klick ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', onClick, false);

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

function findComponentMesh(obj) {
    let current = obj;
    while (current && !current.userData?.data && current.parent) {
        current = current.parent;
    }
    return current && current.userData?.data ? current : null;
}

// --- Animation ---
const clock = new THREE.Clock();

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

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    updateCameraAnimation(delta);
    const hasRunningFlows = updateDataFlows(delta);
    updateAutoPlay(delta, hasRunningFlows); // NEU

    controls.update();
    renderer.render(scene, camera);
}


// --- Resize ---
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


// --- File-Input (Modell laden) ---
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
            console.error('Fehler beim Parsen der JSON-Datei:', err);
            alert('Die Datei ist keine gültige JSON-Modelldatei.');
        }
    };
    reader.readAsText(file);
});

function updateDataFlows(delta) {
    let anyRunning = false;

    for (let i = activeFlows.length - 1; i >= 0; i--) {
        const flow = activeFlows[i];
        flow.elapsed += delta * flow.direction;

        const tRaw = flow.elapsed / flow.duration;

        // Loop-Handling
        if (!flow.loop && (tRaw > 1 || tRaw < 0)) {
            // Animation fertig -> Objekte entfernen
            scene.remove(flow.object3D);   // labelSprite hängt an object3D
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

function getPointOnPath(points, t) {
    if (points.length === 1) return points[0].clone();
    if (t <= 0) return points[0].clone();
    if (t >= 1) return points[points.length - 1].clone();

    // Gesamt-Länge des Pfades berechnen
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


function updateAutoPlay(delta, hasRunningFlows) {
    if (!flowController.isPlaying) return;

    // Wenn noch eine Kugel unterwegs ist, nichts tun
    if (hasRunningFlows) return;

    // Wenn alle Verbindungen durch sind, stoppen
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

function stopAutoPlay() {
    flowController.isPlaying = false;
    stopAllFlows();
    updateFlowControlButtons();
}

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

function playPrevStep() {
    stopAllFlows();
    flowController.isPlaying = false;

    if (connectionSequence.length === 0) return;

    // einen zurück, aber nicht kleiner als 0
    currentConnectionIndex = Math.max(currentConnectionIndex - 2, 0);

    const connLine = connectionSequence[currentConnectionIndex];
    startDataFlowOnConnection(connLine, {
        loop: false
    });

    currentConnectionIndex++;
}

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
            console.log('Group toggled', group.name, 'active:', group.active);
            // 1. Sichtbarkeit der Verbindungen aktualisieren
            updateConnectionVisibilityFromGroups();

            // 2. Playlist für Animation neu aufbauen
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








