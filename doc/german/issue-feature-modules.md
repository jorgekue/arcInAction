# Feature Request: Modul-Unterstuetzung fuer wiederverwendbare Sequenzen/Modelle

## Summary
Add support for reusable modules so that parts of models/sequences can be defined once and referenced from multiple parent models.

## Problem
Today, repeated sequence/model parts must be duplicated across models.
This creates maintenance overhead and inconsistencies.

## Goal
Enable parent models to reference child models as modules with parameter passing, drill-down navigation, and return to parent context.

## Priority
P2 (medium)

## Scope
- Model layer:
  - Add module references in parent model settings/structure.
  - Support generic module parameters and parent-side parameter configuration.
  - Register call context to support return navigation.
- Viewer/UI:
  - Render modules as dedicated component type (visual marker on top of service-like shape).
  - Allow entering a module (drill-down) and returning to previous parent context.
  - Keep navigation state stable during module transitions.

## Acceptance Criteria
1. A parent model can reference one or more child models as modules.
2. A module is rendered as its own component type and visibly marked as module.
3. User can drill down into a module from parent model and navigate back to the exact parent context.
4. Module call context is registered and used for return navigation.
5. Modules support generic parameters; parent model can configure and pass parameter values.
6. Module parameter values are available in module context during rendering/flow execution.

## Non-Goals (for first increment)
- Recursive module cycles and deep cycle handling.
- Cross-repository module loading.
- Full model editor for module authoring.

## Proposed Data Model (v1 draft)
```json
{
  "settings": {
    "moduleSupport": true
  },
  "modules": [
    {
      "id": "M_ORDER_VALIDATION",
      "name": "Order Validation",
      "file": "models/modules/order-validation.json",
      "parameters": {
        "tenant": "default",
        "channel": "web"
      }
    }
  ],
  "layers": [
    {
      "name": "Business",
      "z": 0,
      "components": [
        {
          "id": "MOD_1",
          "label": "Order Validation",
          "type": "module",
          "moduleRef": "M_ORDER_VALIDATION",
          "x": 0,
          "y": -1,
          "width": 2,
          "height": 1,
          "depth": 1
        }
      ]
    }
  ]
}
```

## Proposed Implementation Plan (Agentic)
### Increment 1: model + rendering baseline
- Add `type: module` support in viewer rendering pipeline.
- Add optional `modules` root section and basic `moduleRef` validation.
- Visual marker for module components (e.g., badge/text marker).

### Increment 2: drill-down navigation
- Add module navigation stack: `push(parentContext)` on enter, `pop()` on return.
- Load child model file and switch active scene context.
- Preserve selected group/step position where possible.

### Increment 3: parameter passing
- Parse module parameter definitions and parent-provided values.
- Inject resolved parameter map into module runtime context.
- Expose resolved parameters for label/rendering and connection metadata usage.

### Increment 4: quality + docs
- Add regression tests for module load, navigation stack, and parameter mapping.
- Add docs in German/English (`doc/german`, `doc/english`).
- Add at least one sample module model and one parent model.

## Risks
- Runtime complexity in state synchronization during navigation.
- Parameter collision/naming conflicts.
- Performance when loading larger module trees.

## Open Questions
1. Should module files be cached in-memory by path+params?
2. Which parameter value types are supported in v1 (string only vs typed)?
3. Should connection groups be merged across parent/module or isolated by context?
4. How should breadcrumb UI look in v1 (minimal text vs clickable path)?

## Definition of Done
- All acceptance criteria met.
- No regressions in existing non-module models.
- Documentation and sample models merged.
