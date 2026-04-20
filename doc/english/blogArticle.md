# architecture in action (aia) - Making Architecture Easier to Understand

How can complex software architectures be communicated in a way that is easy to understand? This article shows how architecture in action (aia) makes architecture work more transparent and effective in real projects through interactive 3D visualization, data flow representation, and AI-supported modeling assistance.

## Motivation

In typical IT projects, not only technical experts but also a broader audience should be informed and involved when defining and communicating a target architecture. Classic 2D diagrams (e.g., UML component and sequence diagrams) are often either too technical or visually not engaging enough.

Against this background, the idea for an alternative way to represent architecture emerged and was validated with the architecture in action (aia) demo program: not just documenting target architectures, but making them easier to experience and discuss.

The underlying approach is intentionally practical: architecture is not viewed as a static picture, but as the interplay of structure and flow. This creates a comprehensible architecture narrative that supports key project questions: what belongs together, how do parts interact, and how does a process evolve over time?

Especially in collaboration between business stakeholders, IT teams, and decision-makers, this perspective helps make discussions more objective. Assumptions become visible earlier, differences between the target picture and the current situation can be articulated more clearly, and architecture conversations remain constructive without drifting into unnecessary micro-level detail.

The core idea is the combination of structural and process perspectives, represented as a 3D model with temporal dynamics. This 4D view (3D plus time) creates additional orientation and helps teams understand relationships in the overall picture more quickly.

At the same time, ideas like aia can be implemented much faster in the GenAI era than they could a few years ago, because prototyping, modeling, and iteration are supported far more efficiently.

From a technology perspective, aia is implemented in JavaScript and uses THREE.js as an established foundation for interactive 3D visualizations in the browser.

![architecture in action](/doc/img/arcInAction.gif)

_Image: architecture in action._

Animation script:
- Initial focus on the `user registration` connection group
- Trigger the data flow of `user registration` via the Play button
- Then focus on the `creating orders` and `processing payments` connection groups
- Trigger the data flow via the Play button
- The top-right panel shows details for each current connection step (`id`, `protocol`, `from`, `to`, `label`)
- Toggle the grid on and off
- Change the model
- Mouse interactions: rotate, pan, zoom
- Change perspectives: top, front, iso

## Interactive View of the Model

The aia viewer provides an interactively controllable 3D view. Using the mouse, users can rotate, pan, and zoom the model. This allows architecture discussions to be conducted step by step without losing sight of the overall picture.

In addition, predefined camera perspectives are available (e.g., isometric, top, front). This makes it easy to adapt the presentation to different communication situations, from high-level overview to focused inspection.

## Declarative Modeling Approach

The viewer follows a declarative modeling approach: architectural knowledge is described in a JSON model and visualized from that model. The model structure is essentially based on components organized in layers, plus connections that represent data links between those components.

Alongside declarative modeling, there is an interactive edit mode for connections. This enables direct refinement of connection routing in the viewer; an optional grid supports precise modeling.

## Connections and Data Flow Animation

Connections represent communication relationships between components and also serve as the basis for data flow animation. Direction, routing, and metadata of a connection are made visible, so both technical and business-oriented discussions can reference a shared visual model.

For larger models, connections are organized into groups. This makes it possible to focus on selected groups and explain complex diagrams step by step instead of showing everything at once.

## Reducing Modeling Complexity with AI Support

As architectures grow, the effort required to maintain consistent aia models manually in JSON also increases. AI tools can help reduce modeling complexity significantly without sacrificing domain quality.

For example, Copilot agents can be set up as specialized modeling assistants. Context files in the repository, such as structure conventions, mapping rules, and modeling guidelines, provide a stable framework in which an agent can generate aia-compliant models.

Routine tasks such as creating layers, component patterns, and consistent IDs can largely be automated. This allows modelers to focus more on domain structure, relationships, and content quality.

If a textual architecture description already exists, for example in PlantUML diagrams, it can be used as an input and intermediate format that an agent transforms into an aia JSON model and then refines further in the viewer.

## Availability on GitHub Pages

For interested users, the fastest way to try the program directly is via GitHub Pages:

https://jorgekue.github.io/arcInAction/aiaViewer.html

## Summary and Conclusion

architecture in action (aia) introduces an alternative way to explain software architectures: architecture is visualized as a 4D model (3D + time), combining structural and process perspectives in one shared view. This makes even complex target architectures easier to communicate in a clear, structured, and audience-appropriate way.

For architecture work, this is especially relevant because it strengthens shared orientation in complex initiatives, makes it easier to explain relationships across team boundaries, and promotes an architecture understanding that considers both structure and change.

This different, more tangible perspective tends to lead to more constructive feedback, including during self-review. Errors, ambiguities, or necessary additions become visible earlier. As a result, standard UML deliverables also benefit because the target architecture description gains an additional quality assurance effect.

In concrete project use, this approach has consistently received positive feedback, particularly because it improves clarity in alignment between business and IT.

In addition, GenAI significantly shortens the path from an initial idea to a usable prototype, allowing architecture approaches like this to reach practical project use much faster.

Combined with AI-supported modeling assistance, this creates a pragmatic path to make architecture work more understandable, more consistent, and better aligned for different stakeholder groups.

## About the Author

Jürgen Kürpig is a Software Architect at adesso insurance solutions and has supported Java-based IT projects for many years in different roles, focusing on architecture, integration, concept development, and project methodology.

Juergen.Kuerpig@adesso-insurance-solutions.de

## References

- **Live Viewer (GitHub Pages)**
  https://jorgekue.github.io/arcInAction/aiaViewer.html

- **Modeling Instructions for aia Models**
  [Modeling Instructions](/doc/english/modelingInstructions.md)

- **Interactive Modeling (Edit Mode)**
  [Interactive Modeling](/doc/english/interactiveModelling.md)

- **Program GitHub Repository**
  [arcInAction](https://github.com/jorgekue/arcInAction)

- **THREE.js**
  <https://threejs.org/>

- **PlantUML: Open-source tool for textual UML descriptions (including sequence diagrams)**
  <https://plantuml.com>
