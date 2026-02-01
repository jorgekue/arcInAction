# Modeling Instructions for the aiaViewer

> This guide describes exclusively the **model format** (JSON) for the aiaViewer.

![Viewer shows model](/doc/img/viewerWithGrid.gif)
Image: aiaViewer shows a fictional example model.

---
# 1. Goal and Basic Idea

With the 3D component viewer, you can model software systems with **layers with components** and **connections**:

- **Layers** structure the architecture (Actors, Presentation, Business, Infrastructure, Data, …).
- **Components** are the actual building blocks (Services, databases, queues, schedulers, persons, UI, …).
- **ConnectionGroups** group related connections (use cases, processes) that can be toggled on or off.
- **Connections** model the business/technical data flow between components within a group.

Modeling is done in a JSON file textually, which the viewer can load and display (e.g., `model.json`).

---
# 2. Display Model (Example Environment)

Recommended environment:

1. Open the project in **Visual Studio Code**.
2. Use a **Live Server** plugin.
3. Open `aiaViewer.html` in the Explorer and start with "**Open with Live Server**".
4. The browser loads `aiaViewer.html`, which internally loads the defined default JSON model (e.g., `model.json` in the same folder).

Make sure that:

- the path to the model in `aiaViewer.html` is correct,
- the browser has access to the model (no CORS issues due to path changes).

---
# 3. Overall Model Structure

The JSON root object consists of:

- `layers`: List of architecture levels
- `connectionGroups`: logically related connections
- `typeStyles`: color definitions per component type

Simplified schema:

```json
{
  "layers": [
    /* Layer with components */
  ],
  "connectionGroups": [
    /* Groups of connections */
  ],
  "typeStyles": {
    /* Colors per component type */
  }
}
```

---
# 4. Layers: Architecture Levels and Components
## 4.1 Layer Structure

A layer represents a horizontal plane in 3D space (z-coordinate):

```json
{
  "name": "Business",
  "z": 2,
  "components": [
    /* Components in this layer */
  ]
}
```
Layer attributes:

- `name (string)`: Display name of the layer (e.g., "Business").
- `z (number)`: Z-coordinate of this plane (all components are placed at this height).
- `components (array)`: List of components in this layer.

## 4.2 Components: Common Structure

Example from the Business layer:
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
Standard attributes of a component:

- `id (string, required)`: Unique ID. Referenced by connections (from, to).
- `label (string)`: Text on the 3D object. Line break with \n, e.g., "User\nService".
- `type (string)`: Controls 3D representation and style:
        Options: `"actor", "frontend", "service", "database", "queue", "scheduler"`.
- `x, y (number)`: Position on the layer in the X/Y plane.
- `width, height, depth (number)`: Dimensions of the 3D object (interpretation depends on type).
- `metadata (object, optional)`: Additional information, e.g.:
  - `owner`: responsible team/area
  - `version`: technical version
  - `tech`: technical basis (e.g., Java, TypeScript/React, Kafka)
  - `criticality`: e.g., "high", "medium", "very high"

Special attributes for some types:

- `orientation (string, optional)`: Orientation of certain shapes (e.g., "z" for scheduler).

---
# 5. Component Types in the Example Model
## 5.1 Actors: type = "actor"

Example:

```json
{
  "id": "U1",
  "label": "Customer",
  "type": "actor",
  "x": 0,
  "y": 0,
  "width": 1,
  "height": 2,
  "depth": 1,
  "metadata": {
    "owner": "Business Area",
    "tech": "N/A"
  }
}
```

- Representation: Person/Actor (figure with cone body) in the "Actors" layer.
- `label` is displayed on the cone mantle.
- `width, height, depth` determine the size of the person.

Typical use: Customers, user roles, external systems.

## 5.2 Frontend: type = "frontend"

Example:

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
    "owner": "Frontend Team",
    "version": "2.1.0",
    "tech": "TypeScript/React",
    "criticality": "medium"
  }
}
```

- Representation: Box
- `label` with line break ("Web\nUI") possible. Displayed on the front faces (front/back).
- `Color` can be adjusted via typeStyles.frontend.color.

## 5.3 Services: type = "service"

Example:

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

- Representation: Box.

## 5.4 Infrastructure: Queue and Scheduler

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
- Representation: Queue symbol (lying cylinder).
- label on each round end face.

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

- Representation: Timer/clock icon (flat body).
- orientation: Orientation (e.g., "z").

## 5.5 Databases: type = "database"

Example:
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

- Representation: DB symbol (standing cylinder).
- label on each round end face (top/bottom).
- Color: typeStyles.database.color (in example: #e15759).

---
# 6. Connections: connectionGroups and connections
## 6.1 connectionGroups

The so-called connectionGroups thematically group several connections (e.g., use cases or also sequences, depending on how one wants to interpret it). They can be individually toggled on or off in the viewer.

```json
{
  "name": "creating orders",
  "order": 2,
  "active": true,
  "connections": [
    /* Connections */
  ]
}
```
Attributes:

- `name (string)`: Name of the group (e.g., "creating orders").
- `order (number)`: Order/sorting of the groups.
- `active (boolean)`: Whether this group should initially be visible/active.
- `color (string, optional)`: Color of connections in this group (e.g., "#4e79a7").
        If not set, a default color is used.
- `connections (array)`: List of connections.

Example with color:
```json
{
  "name": "user registration",
  "order": 1,
  "active": true,
  "color": "#4e79a7",
  "connections": [ /* ... */ ]
}
```
# 6.2 connections: Individual Connections

Example:
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
Standard attributes:

- `from (string, required)`: ID of the source component (e.g., "S2").
- `to (string, required)`: ID of the target component (e.g., "Q1").
- `type (string)`: Type of connection (e.g., "http", "amqp").
- `protocol (string)`: Protocol/technology (e.g., "HTTPS", "REST/HTTPS", "JDBC", "amqp").
- `direction (string, optional)`: Direction of data flow:
  - `"outbound"`: Data from from → to (default).
  - `"inbound"`: Data visually from to → from (path reversed).
- `throughput (string, optional)`: Load description, e.g., "800 req/min", "50 req/s".
- `order (number, optional)`: Order within the group.
- `label (string, optional)`: Label of the connection.
- `flowDuration (number, optional)`: Here, a custom time in seconds can be defined for the animation of a connection, deviating from the default flowDuration.  

Geometry attributes:

- `begin (string, optional)`: Start of connection at the from component:
   - Values: "x-", "x+", "y-", "y+", "z-", "z+"
   - Default: "z-".
- `end (string, optional)`: End of connection at the to component:
   - Values analogous to begin.
   - Default: "z+".
- `points (array, optional)`: Waypoints (pathpoints) in 3D space:
   - Each point: { "x": number, "y": number, "z": number }
- The connection runs:
  - from the begin side of the from component
  - via all points in the specified order
  - to the end side of the to component

Data flow direction and animation:

- Internally, pathPoints are built from from, to, begin, end, and points.
- With `direction "outbound"` (default), animated data moves along the pathPoints from start → target.
- With `direction: "inbound"`, the same pathPoints are used in reverse order, i.e., from target → start of the connection.

6.3 Examples from the Model
Group "user registration"

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
While the connection with `"order": 2` is explicitly routed with Points, this can be omitted for the other two connections because the affected components are arranged in a line and the direct, straight connection is automatically drawn "visually correct" even without additional connection points.

Group "processing payments" with inbound example
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
Notes:

- `direction: "inbound"` in the 2nd connection → animated data runs visually in the opposite direction of the geometric path.
- `end: "z-"` in the 2nd connection ensures, for example, that the connection ends at the back side (z-) of Q1.
- `flowDuration: 5` sets the time for the data flow animation individually here, because the lines are obviously longer here and the animation is then easier to follow.

---
# 7. typeStyles: Colors per Component Type

With typeStyles you define the default color of components of a type:

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
Interpretation in the example model:

- frontend → blue (#4e79a7)
- service → green (#59a14f)
- database → red (#e15759)

Additional types can be added, e.g.:

```json
"queue": { "color": "#af7aa1" },
"scheduler": { "color": "#f28e2b" },
"person": { "color": "#9c755f" }
```
Components with a type without an entry in typeStyles receive a default color (viewer implementation).

---
# 8. Best Practices
## 8.1 IDs and Labels

- Choose IDs (id) uniquely and stably, as connections reference them.
- Keep labels (label) short, force line break with \n if needed, example: `"User\nService"`

## 8.2 Layers and Positioning

Plan layers along the z-axis, e.g.:
- "Actors": z = 8
- "Presentation": z = 5
- "Business": z = 2
- "Infrastructure": z = -3
- "Data": z = -6

Within a layer:
- x for horizontal distribution,
- y for vertical staging.

## 8.3 Connections

- Use connectionGroups to structure use cases or processes.
- Set order in connections when a business sequence is important.
- Use points to consciously route paths (e.g., around other components).

## 8.4 Data Flow Direction

- Use `direction: "outbound"` when data flows from the from system to the to system (default).
- Use `direction: "inbound"` when the data flow should be visualized in reverse direction (e.g., events, feedback).

This ensures that animated data packets (if activated in the viewer) are consistently shown in the desired direction.

---
# 9. Summary

- The model is purely data-driven (JSON).
- Main areas:
  - `layers`: Levels and components
  - `connectionGroups / connections`: directed data paths
  - `typeStyles`: color scheme per component type
- Important connection attributes:
  - `color (at group level)`: line color
  - `begin / end`: docking sides on components (x-/x+/y-/y+/z-/z+)
  - `direction: "outbound"` (default) vs. `"inbound"` (path reversed)
  - `points`: waypoints for fine-tuning the geometry

With this, you can model your system step by step, visualize it in the viewer, and vividly represent use cases including data flows.
