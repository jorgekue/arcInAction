# architecture in action (aia) – 4D Views on Software Architectures

> This document describes the demo program **architecture in action (aia)** and its modeling principle.  
> Details on the JSON data model can be found in the **Modeling Instructions**, see references.

# Contents
- [Motivation](#motivation)
- [Interactive View of the Model](#interactive-view-of-the-model)
- [Declarative Model Approach](#declarative-model-approach)
- [Loading Models](#loading-models)
- [Definition of Connections and Data Flow Animation](#definition-of-connections-and-data-flow-animation)
- [Reducing Modeling Complexity with AI Support](#reducing-modeling-complexity-with-ai-support)
- [Summary and Conclusion](#summary-and-conclusion)
- [About the Author](#about-the-author)
- [References](#references)
---

# Motivation

In typical IT projects, not only technicians but also a **broader audience** should be informed and engaged in defining and communicating a target architecture. Classical 2D diagrams (e.g., UML component and sequence diagrams) are often either too technical or visually unappealing.

From project work, the idea for the demo program **architecture in action (aia)** emerged with the motto of being able to explain target architectures more easily.

The core elements of **architecture in action (aia)** are:

- Combination of **component diagram** and **sequence diagram**
- **3D component model** with connections
- **animated data flows** along these connections

Compared to the usual 2D UML diagrams, **4D representations** (3D plus time, i.e., the coordinates `x, y, z, t`) should generate more interest and provide additional "tension moments".

## Technology Foundation: THREE.js

The program is implemented in **JavaScript** and based on the 3D library **[THREE.js](https://threejs.org/)**:

- **THREE.js** is an established, open-source JavaScript library for 3D rendering in the browser.
- It encapsulates the complexity of **WebGL** and provides, among other things:
  - Scene and camera management,
  - Geometries, materials, and light sources,
  - Animations and interactions.
- By using THREE.js, **aia** can easily be deployed as a **web application** on a suitable server.

The following animation shows some features:

![architecture in action](/doc/img/arcInAction.gif)

_Image: architecture in action._

Animation script:
- Initially focusing on the ConnectionGroup `user registration`
- Data flow of `user registration` triggered via Play button.
- Now focusing on the ConnectionGroups `creating orders` and `processing payments`
- Data flow triggered via Play button.
- Clicking on DB component displays metadata in the top right.
- Grid toggled on and off.
- Model is changed.
- Mouse interactions: rotate, pan, zoom
- Changing perspectives: Top, Front, Iso

---

# Interactive View of the Model

The **aia viewer** provides an interactively controllable 3D view. Using the mouse, the model can be:

- **rotated** (orbit movement),
- **panned** (pan),
- **zoomed** (zoom in/out).

A brief overview of mouse interactions is displayed in the upper left corner of the viewer and makes it easier for new users to get started.

![mouse interactions](/doc/img/mouseInteractions.gif)

_Image: Mouse interactions._

Additionally, buttons for predefined camera perspectives are available in the upper center:

- **Isometric**: "classic" architecture view in 3D,
- **Top**: view from above,
- **Front**: frontal view of the model.

This allows the view of the architecture to be quickly adapted to the target audience and conversation situation – for example, an overview for business stakeholders or a technical detailed view for developers.

![Predefined Perspectives](/doc/img/perspectives.gif)

_Image: Predefined perspectives._

---

# Declarative Model Approach

The viewer follows a **declarative model approach**:

- The **aia viewer** reads an **aia model** and displays it interactively in the browser.
- The **aia model** is defined in **JSON notation**.

Instead of "clicking together" the architecture in a tool, it is described in a structured JSON file. This serves as:

- **Single Source of Truth** for the representation,
- potential **export/import point** to other tools.

This concept of the declarative approach may be familiar to some from creating sequence diagrams with the plantuml tool, see reference below.

## Layers and Components (Overview)

The most important concepts are:

- **Layers**:  
  Architecture levels along the **z-axis** (e.g., "Actors", "Presentation", "Business", "Infrastructure", "Data").
- **Components**:  
  Building blocks within a layer (e.g., services, databases, queues, schedulers, UIs, actors).

Each component has, among other things:

- Position and size (`x`, `y`, `width`, `height`, `depth`)
- a **Label** for display (line breaks via `\n`, e.g., `"User\nService"`)
- a **Type** that determines the form of visualization (e.g., `service`, `database`, `queue`, `actor`, `scheduler`)
- **Metadata** with additional information (e.g., `owner`, `version`, `tech`, `criticality`)

The metadata is displayed **in the upper right** of the viewer when clicking on a component, allowing access to further information without overloading the image.

> **Details on JSON structure (attributes, types, examples)**  
> see **Modeling Instructions for aia Models** in the references.

## Types (Brief Overview)

The following types are currently supported:

- `service` → as box
- `database` → as standing cylinder
- `queue` → as lying cylinder
- `actor` → as figure
- `scheduler` → as clock

An optional color scheme per type is defined via `typeStyles` (e.g., services in green, databases in red, frontend in blue).

## Grid Support

To assist with modeling, a **grid** can be displayed (checkbox in upper center):

- The grid facilitates **alignment** and **measuring** of components.
- For modeling workshops or live refactoring, the grid can be quickly toggled on or off.

![Grid for Modeling](/doc/img/gridButton.gif)

_Image: Grid for modeling._

## Perspective: Interactive Modeling Mode

Currently, aia models are maintained purely **declaratively** in JSON. In a possible expansion stage, an **interactive modeling mode** is conceivable:

- Components and connections are placed directly in the viewer.
- Changes are automatically written back to the JSON model.

This would enable a significantly lower entry barrier, especially for non-technical users and moderators in workshops.

---

# Loading Models

For use in a project context, the aia viewer can be provided with a **preselection of models**:

- These models are provided together with the viewer.
- They can then be selected **in the lower left** of the viewer via a selection (e.g., dropdown, list).

![Preselected Models](/doc/img/predefinedModels.gif)

_Image: Preselected models._

Additionally, users can dynamically load their own models:

- Via the **"Load Model"** button (lower right), a local JSON model can be selected.
- This allows different architecture variants or project states to be easily viewed in the browser – without modifying the viewer itself.

![Load Individual Models](/doc/img/loadModel.gif)

_Image: Load individual models._

---

# Definition of Connections and Data Flow Animation

A core feature of **aia** is the representation of **connections**, including the ability to play **animated data flows**.

## ConnectionGroups

Connections are organized in **ConnectionGroups**:

- Each group bundles thematically related connections – such as a **use case** like "Register user", "Create order" or "Process payment".
- The groups can be individually toggled on or off via a menu **in the middle right** of the viewer and thus support a successive and structured walkthrough of the target architecture.

The Connection Groups area is split into:

- a **fixed header** with the `all groups` master switch,
- two visibility mode radios:
  - `only connections`
  - `connections & components`
- and a **scrollable list** of individual groups.

With `connections & components`, the viewer also hides components that are not referenced by currently active groups. This can significantly improve focus when discussing one process at a time.

Per ConnectionGroup, among other things, are defined:

- a **Name** (e.g., "creating orders"),
- an **order** for the sequence of a cross-group data flow animation,
- the information whether the group should initially be **active** when loading the model (`active`),
- optionally a **color** that is used for all connections in this group.

Initial visibility mode can optionally be configured in model root `settings` via `selectConnectionsAndComponents` (default: `false`).

![Connections Groups](/doc/img/connectionGroups.gif)

_Image: Connections Groups._

## Connections: Direction and Path

Each connection describes a connection between two components. Important aspects:

- **Communication direction**:
  - Fields `from` and `to` define **sender** and **receiver** – and thus also the arrow direction in the diagram.
- **Data flow direction for animation**:
  - The field `direction` controls in which direction the **data flow animation** runs along the path:
    - `outbound` (default): animated data flows from `from` to `to`.
    - `inbound`: animated data flows visually in reverse direction (from `to` to `from`).
- **Path geometry**:
  - Optionally, a direct connection can additionally be routed via a list of 3D points (*Pathpoints*) to, for example, make an arc around other components or emphasize certain levels in the architecture.
- **Technical details and load information**:
  - `type` and `protocol` describe the type and technology of the connection (e.g., **REST/HTTPS**, **amqp**, **JDBC**).
  - `throughput` can be used to specify load sizes (e.g., "800 req/min").
  - An optional `label` serves to label the data flow animation.

> A detailed description of all connection attributes (incl. `begin`, `end`, `points`) can be found in the **Modeling Instructions for aia Models**, see references below.

## Data Flow Animation as Living Sequence Diagram

The defined connections simultaneously serve as the basis for **data flow animations** – in the sense of a living sequence diagram:

- The **active ConnectionGroups** are considered.
- Within each ConnectionGroup, the order of individual connections is determined by their `order` attribute.
- The animation can thus step by step show:
  - which actor addresses which frontend,
  - which services are involved,
  - which databases, queues, or schedulers come into play.

This allows you to:

- successively view or explain the process aspects of a target architecture,
- focus the view on individual use cases or sub-processes as needed,
- and expand the representation back to the overall architecture at any time.

## Controlling the Data Flow Animation

The animation is controlled via the control panel **in the lower center**:

- **Play**  
  Starts the automatic sequence of defined data flows according to the connection order in the active ConnectionGroups.
- **Stop**  
  Ends the automatic animation.
- **Next**  
  Advances to the next step / next connection.
- **Prev.**  
  Goes back to the previous connection.

![Animation Controls](/doc/img/animationControls.gif)

_Image: Animation controls._

---
# Reducing Modeling Complexity with AI Support

As architecture grows, the effort to manually maintain consistent aia models in JSON increases. AI tools can help significantly reduce the **modeling complexity** without sacrificing business quality.

## GitHub Agents as Modeling Assistants

In VS Code, GitHub agents (e.g., in "Build with Agent Mode") can be set up as specialized **modeling assistants**. The idea:

- **Context files** are maintained in the repository, e.g.:
  - a style guide for the JSON structure (`layers`, `components`, `connectionGroups`, `typeStyles`),
  - a mapping description of how PlantUML elements are mapped to aia components,
  - a modeling description or this article.
- An agent ("aia Model Agent") uses these files as **fixed rules and examples** to:
  - from textual descriptions or
  - from PlantUML sequence diagrams  
  automatically generate **aia-compliant JSON models**.

Routine tasks such as creating layers, standard types (`frontend`, `service`, `database`), ID schemas (e.g., `UI1`, `S1`, `DB1`) and metadata (e.g., "Java/JEE") are handled by the agent. The modeler focuses more on business structure and relationships.

## PlantUML as Source and Intermediate Format

Many teams already use **PlantUML sequence diagrams** to describe processes between actors, UI, services, and databases. These diagrams are suitable as a **starting point and intermediate stage** for `aia` models:

1. Business processes are formulated or refined in PlantUML.
2. A GitHub agent transforms the sequence diagram into an aia JSON model by:
   - assigning participants (actor, participant, database) to appropriate layers and types,
   - generating IDs and labels according to modeling conventions,
   - converting messages in the sequence diagram into `connectionGroups` and `connections`.
3. The resulting model is loaded in the `aia` viewer and manually supplemented as needed (layout, additional flows, metadata).

Thus, PlantUML serves as a **compact, textual description**, while the agent handles the translation into the detailed JSON. Changes are primarily made in the sequence diagram and are converted again into a current `aia` model as needed.

---

# Summary and Conclusion

**architecture in action (aia)** shows an alternative approach to explaining software architectures: Architecture is visualized as a **4D model** (3D + time), combines elements from **component and sequence diagrams** in one image, and uses a **declarative JSON model** as the basis. This allows even complex target architectures to be conveyed clearly, structured, and tailored to the target audience – often more clearly than with classical 2D representations.

Through various **camera perspectives**, the targeted toggling of **ConnectionGroups** and **data flow animations**, the displayed complexity can be finely dosed and adapted to different stakeholders – from development to management.

**AI-supported agents** act as **modeling assistance**: They automate formal and syntactic steps, ensure conventions and consistency, and lower the entry barrier to create or maintain `aia` models. In combination with **PlantUML** as a textual format, a GitHub agent as transformer, and the `aia` viewer as visualization, a continuous path emerges from textual interaction description to 4D model – with significantly reduced manual effort and better manageable modeling complexity.

---

# About the Author

Jürgen Kürpig is a Software Architect at adesso insurance solutions and has been supporting Java-based IT projects for many years in various roles in the areas of architecture, integration, concept development, and project methodology.

Juergen.Kuerpig@adesso-insurance-solutions.de

---

# References

- **Modeling Instructions for aia Models**  
  [Modeling Instructions](/doc/english/modelingInstructions.md)

- **GitHub Repository of the Program**  
  [arcInAction](https://github.com/jorgekue/arcInAction)

- **THREE.js**  
  <https://threejs.org/>

- **PlantUML: Open-Source Tool for Textual Description of UML Diagrams (including Sequence Diagrams)**  
  <https://plantuml.com>

