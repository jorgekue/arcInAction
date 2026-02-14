# Modellierungsanleitung für den aiaViewer

> Diese Anleitung beschreibt ausschließlich das **Modellformat** (JSON) für den aiaViewer.

![Viewer zeigt Modell an](/doc/img/viewerWithGrid.gif)
Bild: aiaViewer zeigt fiktives Beispiel-Modell an.

---
# 1. Ziel und Grundidee

Mit dem 3D‑Komponenten‑Viewer kannst du Softwaresysteme mit **Layer mit Komponenten** und **Verbindungen** modellieren:

- **Layers** strukturieren die Architektur (Actors, Presentation, Business, Infrastructure, Data, …).
- **Components** sind die eigentlichen Bausteine (Services, Datenbanken, Queues, Scheduler, Personen, UI, …).
- **ConnectionGroups** gruppieren zusammengehörige Verbindungen (Use Cases, Abläufe), die z- oder abgeschaltet werden können.
- **Connections** modellieren den fachlichen/technischen Datenfluss zwischen Komponenten innerhalb einer Gruppe.

Die Modellierung erfolgt in einer JSON‑Datei textuell, die der Viewer laden und anzeigen kann (z.B. `model.json`).

---
# 2. Modell anzeigen (Beispiel‑Umgebung)

Empfohlene Umgebung:

1. Projekt im **Visual Studio Code** öffnen.
2. Ein **Live Server** Plugin nutzen.
3. Im Explorer `aiaViewer.html` öffnen und mit „**Open with Live Server**“ starten.
4. Der Browser lädt `aiaViewer.html`, welche intern das definierte Standard-JSON‑Modell lädt (z.B. `model.json` im selben Ordner).

Stell sicher, dass:

- der Pfad zum Modell in `aiaViewer.html` korrekt ist,
- Browser Zugriff auf das Modell hat (keine CORS‑Probleme durch Pfadwechsel).

### Entwicklernotiz (Hidden Feature)

- Die Standard-Modelle bleiben fest in `js/viewer.js` referenziert (`model.json`, `simple-model.json`).
- Zusätzliche vordefinierte Modelle können optional über `model-files.properties` im Projekt-Root gepflegt werden.

---
# 3. Gesamtstruktur des Modells

Das JSON‑Root‑Objekt besteht aus:

- `layers`: Liste von Architektur‑Ebenen
- `connectionGroups`: logisch zusammengehörige Verbindungen
- `typeStyles`: Farbdefinitionen pro Komponententyp

Vereinfachtes Schema:

```json
{
  "layers": [
    /* Layer mit Komponenten */
  ],
  "connectionGroups": [
    /* Gruppen von Verbindungen */
  ],
  "typeStyles": {
    /* Farben pro Komponententyp */
  }
}
```

---
# 4. Layers: Architektur‑Ebenen und Komponenten
## 4.1 Layer‑Struktur

Ein Layer repräsentiert eine horizontale Ebene im 3D‑Raum (z‑Koordinate):

```json
{
  "name": "Business",
  "z": 2,
  "components": [
    /* Komponenten in diesem Layer */
  ]
}
```
Attribute des Layers:

- `name (string)`: Anzeigename des Layers (z.B. "Business").
- `z (number)`: Z‑Koordinate dieser Ebene (alle Komponenten werden auf dieser Höhe platziert).
- `components (array)`: Liste der Komponenten in diesem Layer.

## 4.2 Komponenten: gemeinsame Struktur

Beispiel aus dem Business‑Layer:
```json
{
  "id": "S1",
  "label": "User\nService",
  "type": "service",
  "x": -2,
  "y": 0,
  "width": 2,
  "height": 1,
  "depth": 1,
  "metadata": {
    "owner": "Team A",
    "version": "1.3.5",
    "tech": "Java/JEE",
    "criticality": "high"
  }
}
```
Standard‑Attribute einer Komponente:

- `id (string, Pflicht)`: Eindeutige ID. Wird von Verbindungen (from, to) referenziert.
- `label (string)`: Text auf dem 3D‑Objekt. Zeilenumbruch mit \n, z.B. "User\nService".
- `type (string)`: Steuert 3D‑Darstellung und Style:
        Zur Auswahl: `"actor", "frontend", "service", "database", "queue", "scheduler"`.
- `x, y (number)`: Position auf dem Layer in der X/Y‑Ebene.
- `width, height, depth (number)`: Abmessungen des 3D‑Objekts (Interpretation abhängig von type).
- `metadata (object, optional)`: Zusatzinformationen, z.B.:
  - `owner`: verantwortliches Team/Bereich
  - `version`: technische Version
  - `tech`: technische Basis (z.B. Java, TypeScript/React, Kafka)
  - `criticality`: z.B. "high", "medium", "very high"

Spezielle Attribute für manche Typen:

- `orientation (string, optional)`: Ausrichtung bestimmter Formen (z.B. "z" bei scheduler).

---
# 5. Komponententypen im Beispielmodell
## 5.1 Actors: type = "actor"

Beispiel:

```json
{
  "id": "U1",
  "label": "Kunde",
  "type": "actor",
  "x": 0,
  "y": 0,
  "width": 1,
  "height": 2,
  "depth": 1,
  "metadata": {
    "owner": "Fachbereich",
    "tech": "N/A"
  }
}
```

- Darstellung: Person/Actor (Figur mit Kegel‑Körper) im Layer "Actors".
- `label` wird auf dem Kegelmantel angezeigt.
- `width, height, depth` bestimmen die Größe der Person.

Typische Verwendung: Kunden, Nutzerrollen, externe Systeme.

## 5.2 Frontend: type = "frontend"

Beispiel:

```json
{
  "id": "UI1",
  "label": "Web\nUI",
  "type": "frontend",
  "x": 0,
  "y": 0,
  "width": 3,
  "height": 2,
  "depth": 1,
  "metadata": {
    "owner": "Team Frontend",
    "version": "2.1.0",
    "tech": "TypeScript/React",
    "criticality": "medium"
  }
}
```

- Darstellung: Box
- `label` mit Umbruch ("Web\nUI") möglich. Wird auf den Stirnseiten (vorne/hiinten) dargestellt.
- `Farbe` kann über typeStyles.frontend.color angepasst werden.

## 5.3 Services: type = "service"

Beispiel:

```json
{
  "id": "S1",
  "label": "User\nService",
  "type": "service",
  "x": -2,
  "y": 0,
  "width": 2,
  "height": 1,
  "depth": 1,
  "metadata": {
    "owner": "Team A",
    "version": "1.3.5",
    "tech": "Java/JEE",
    "criticality": "high"
  }
}
```

- Darstellung: Box.

## 5.4 Infrastruktur: Queue und Scheduler

Queue: type = "queue"

```json
{
  "id": "Q1",
  "label": "Order\nQueue",
  "type": "queue",
  "x": 4,
  "y": -3,
  "width": 2,
  "height": 2,
  "depth": 2,
  "metadata": {
    "owner": "Integration Team",
    "version": "N/A",
    "tech": "Kafka",
    "criticality": "medium"
  }
}
```
- Darstellung: Queue‑Symbol (liegender Zylinder).
- label auf jeder runder Stirnseite.

Scheduler: type = "scheduler"
```json
{
  "id": "SCHED1",
  "type": "scheduler",
  "label": "Scheduler",
  "x": 8,
  "y": -3,
  "width": 2,
  "height": 2,
  "depth": 0.5,
  "orientation": "z"
}
```

- Darstellung: Timer/Uhr‑Icon (flacher Körper).
- orientation: Ausrichtung (z.B. "z").

## 5.5 Datenbanken: type = "database"

Beispiel:
```json
{
  "id": "DB2",
  "label": "Order\nDB",
  "type": "database",
  "x": 2,
  "y": -1,
  "width": 2.5,
  "height": 2,
  "depth": 2,
  "metadata": {
    "owner": "DBA Team",
    "version": "13.0",
    "tech": "PostgreSQL",
    "criticality": "high"
  }
}
```

- Darstellung: DB‑Symbol (stehender Zylinder).
- label auf jeder runder Stirnseite (oben/unten).
- Farbe: typeStyles.database.color (im Beispiel: #e15759).

---
# 6. Verbindungen: connectionGroups und connections
## 6.1 connectionGroups

Die sogenannten connectionGroups fassen mehrere Verbindungen thematisch zusammen (z.B. Use Cases oder auch Sequenzen, je nachdem, wie man es interpretieren möchte). Sie können im Viewer einzel zu- oder abgeschaltet werden.

```json
{
  "name": "creating orders",
  "order": 2,
  "active": true,
  "connections": [
    /* Verbindungen */
  ]
}
```
Attribute:

- `name (string)`: Name der Gruppe (z.B. "creating orders").
- `order (number)`: Reihenfolge/Sortierung der Gruppen.
- `active (boolean)`: Ob diese Gruppe initial sichtbar/aktiv ist.
- `color (string, optional)`: Farbe der Verbindungen in dieser Gruppe (z.B. "#4e79a7").
        Wenn nicht gesetzt, wird eine Standardfarbe verwendet.
- `connections (array)`: Liste der Verbindungen.

Beispiel mit color:
```json
{
  "name": "user registration",
  "order": 1,
  "active": true,
  "color": "#4e79a7",
  "connections": [ /* ... */ ]
}
```
# 6.2 connections: einzelne Verbindungen

Beispiel:
```json
{
  "from": "S2",
  "to": "Q1",
  "type": "http",
  "protocol": "REST/HTTPS",
  "direction": "outbound",
  "throughput": "200 req/min",
  "order": 4,
  "label": "order message",
  "flowDuration": 5,
  "points": [
    { "x": 2, "y": 0, "z": -1 },
    { "x": 2, "y": -2, "z": -1 },
    { "x": 4, "y": -2, "z": -1 }
  ]
}
```
Standard‑Attribute:

- `from (string, Pflicht)`: ID der Quell‑Komponente (z.B. "S2").
- `to (string, Pflicht)`: ID der Ziel‑Komponente (z.B. "Q1").
- `type (string)`: Art der Verbindung (z.B. "http", "amqp").
- `protocol (string)`: Protokoll/Technologie (z.B. "HTTPS", "REST/HTTPS", "JDBC", "amqp").
- `direction (string, optional)`: Richtung des Datenflusses:
  - `"outbound"`: Daten von from → to (Default).
  - `"inbound"`: Daten visuell von to → from (Pfad rückwärts).
- `throughput (string, optional)`: Lastbeschreibung, z.B. "800 req/min", "50 req/s".
- `order (number, optional)`: Reihenfolge innerhalb der Gruppe.
- `label (string, optional)`: Beschriftung der Verbindung.
- `flowDuration (number, optional)`: Eigene Animationsdauer in Sekunden für diese konkrete Verbindung. Dieser Wert überstimmt die globalen Animationseinstellungen.

Globale Datenfluss‑Einstellungen (optional, im JSON‑Root unter `settings`):

```json
{
  "settings": {
    "flowDurationMin": 3,
    "flowSpeed": 2.5
  }
}
```

- `settings.flowDurationMin` (number): Mindestdauer der Animation in Sekunden. Verhindert, dass sehr kurze Verbindungen zu schnell animieren.
- `settings.flowSpeed` (number): Animationsgeschwindigkeit in Grid‑Einheiten pro Sekunde.

Priorität der Zeitsteuerung (höchste zu niedrigste):

1. `connection.flowDuration`
2. Berechnete Dauer über `settings.flowSpeed`, begrenzt durch `settings.flowDurationMin`
3. Viewer‑Defaults (`flowDurationMin = 3`, `flowSpeed = 2.5`)

Geometrie‑Attribute:

- `begin (string, optional)`: Beginn der Verbindung an der from‑Komponente:
   - Werte: "x-", "x+", "y-", "y+", "z-", "z+"
   - Default: "z-".
- `end (string, optional)`: Ende der Verbindung an der to‑Komponente:
   - Werte analog zu begin.
   - Default: "z+".
- `points (array, optional)`: Wegpunkte (Pathpoints) im 3D‑Raum:
   - Jeder Punkt: { "x": number, "y": number, "z": number }
- Die Verbindung verläuft:
  - von der begin‑Seite der from‑Komponente
  - über alle points in angegebener Reihenfolge
  - zur end‑Seite der to‑Komponente

Datenfluss‑Richtung und Animation:

- Intern werden aus from, to, begin, end und points die pathPoints aufgebaut.
- Bei `direction "outbound"` (default) wandern animierte Daten entlang der pathPoints von Start → Ziel.
- Bei `direction: "inbound"` werden dieselben pathPoints in umgekehrter Reihenfolge genutzt, also von Ziel → Start der Verbindung.

6.3 Beispiele aus dem Modell
Gruppe „user registration“

```json
{
  "name": "user registration",
  "order": 1,
  "active": true,
  "color": "#4e79a7",
  "connections": [
    {
      "from": "U1",
      "to": "UI1",
      "type": "http",
      "protocol": "HTTPS",
      "direction": "outbound",
      "throughput": "800 req/min",
      "order": 1,
      "label": "user data"
    },
    {
      "from": "UI1",
      "to": "S1",
      "type": "http",
      "protocol": "REST/HTTPS",
      "direction": "outbound",
      "throughput": "800 req/min",
      "order": 2,
      "label": "user data",
      "points": [
        { "x": 0, "y": 0, "z": 4 },
        { "x": -2, "y": 0, "z": 4 }
      ]
    },
    {
      "from": "S1",
      "to": "DB1",
      "type": "http",
      "protocol": "JDBC",
      "direction": "outbound",
      "throughput": "200 req/min",
      "order": 3,
      "label": "user data"
    }
  ]
}
```
Während die Verbindung mit der `"order": 2` explizit mit Points geführt wird, kann für die anderen beiden Verbindungen darauf verzichtet werden, weil die betroffenen Komponenten in einer Linie angeordnet sind und die direkte, geradlinige Verbindung automatisch auch ohne weitere Verbindungspunkte "optisch richtig" gezogen wird.

Gruppe „processing payments“ mit inbound‑Beispiel
```json
{
  "name": "processing payments",
  "order": 3,
  "active": true,
  "connections": [
    {
      "from": "SCHED1",
      "to": "S3",
      "type": "http",
      "protocol": "REST/HTTPS",
      "direction": "outbound",
      "throughput": "150 req/s",
      "order": 1,
      "label": "check queue",
      "begin": "y+",
      "end": "x+",
      "flowDuration": 5,
      "points": [
        { "x": 8, "y": 0, "z": -3 },
        { "x": 8, "y": 0, "z": 2 },
        { "x": 8, "y": 0, "z": 2 }
      ]
    },
    {
      "from": "S3",
      "to": "Q1",
      "type": "amqp",
      "protocol": "amqp",
      "direction": "inbound",
      "throughput": "50 req/s",
      "order": 2,
      "label": "order messages",
      "end": "z-",
      "flowDuration": 5,
      "points": [
        { "x": 6, "y": 0, "z": -5 },
        { "x": 6, "y": -2, "z": -5 },
        { "x": 4, "y": -2, "z": -5 }
      ]
    }
  ]
}
```
Anmerkungen:

- `direction: "inbound"` bei der 2-ten Verbindung → animierte Daten laufen visuell in die entgegengesetzte Richtung des geometrischen Pfads.
- `end: "z-"` bei der 2-ten Verbindung sorgt z.B. dafür, dass die Verbindung an der Rückseite (z-) von Q1 endet.
- `flowDuration: 5` setzt hier die Zeit für die Datenflußanimation individuell, weil die Linien hier offensichtlich länger sind und die Animation dann besser zu verfolgen ist.

---
# 7. typeStyles: Farben pro Komponententyp

Mit typeStyles definierst du die Standardfarbe von Komponenten eines Typs:

```json
"typeStyles": {
  "frontend": {
    "color": "#4e79a7"
  },
  "service": {
    "color": "#59a14f"
  },
  "database": {
    "color": "#e15759"
  }
}
```
Interpretation im Beispielmodell:

- frontend → blau (#4e79a7)
- service → grün (#59a14f)
- database → rot (#e15759)

Weitere Typen können ergänzt werden, z.B.:

```json
"queue": { "color": "#af7aa1" },
"scheduler": { "color": "#f28e2b" },
"person": { "color": "#9c755f" }
```
Komponenten mit einem type ohne Eintrag in typeStyles erhalten eine Default‑Farbe (Viewer‑Implementierung).

---
# 8. Best Practices
## 8.1 IDs und Labels

- IDs (id) eindeutig und stabil wählen, da connections darauf verweisen.
- Labels (label) kurz halten, bei Bedarf mit \n Unbruch erzwingen, Beispiel: `"User\nService"`

## 8.2 Layer und Positionierung

Layers entlang der z‑Achse planen, z.B.:
- "Actors": z = 8
- "Presentation": z = 5
- "Business": z = 2
- "Infrastructure": z = -3
- "Data": z = -6

Innerhalb eines Layers:
- x für horizontale Verteilung,
- y für vertikale Staffelung.

## 8.3 Verbindungen

- connectionGroups nutzen, um Use Cases oder Prozesse zu strukturieren.
- order in Verbindungen setzen, wenn eine fachliche Reihenfolge wichtig ist.
- points verwenden, um Pfade bewusst zu führen (z.B. um andere Komponenten herum).

## 8.4 Datenfluss‑Richtung

- `direction: "outbound"` verwenden, wenn Daten vom from‑System zum to‑System fließen (Standard).
- `direction: "inbound"` verwenden, wenn der Datenfluss in umgekehrter Richtung visualisiert werden soll (z.B. Events, Rückmeldungen).

So werden animierte Datenpakete (falls im Viewer aktiviert) konsistent in die gewünschte Richtung gezeigt.

---
# 9. Zusammenfassung

- Das Modell ist rein datengetrieben (JSON).
- Hauptbereiche:
  - `layers`: Ebenen und Komponenten
  - `connectionGroups / connections`: gerichtete Datenpfade
  - `typeStyles`: Farbschema pro Komponententyp
- Wichtige Verbindungsattribute:
  - `color (auf Gruppenebene)`: Linienfarbe
  - `begin / end`: Andockseiten an Komponenten (x-/x+/y-/y+/z-/z+)
  - `direction: "outbound"` (Standard) vs. * "inbound"` (Pfad rückwärts)
  - `points`: Wegpunkte zur Feinsteuerung der Geometrie

Damit kannst du dein System schrittweise modellieren, im Viewer visualisieren und Use Cases inklusive Datenflüssen plastisch darstellen.