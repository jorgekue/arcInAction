# Checklist for Viewer Changes

Short working checklist for future viewer features and bugfixes.

## 1. Preparation

- Clearly define the goal of the change: feature, bugfix, refactoring, or documentation.
- Narrow down the relevant files, typically `js/viewer.js`, `css/viewer.css`, `aiaViewer.html`, sample models, and documentation.
- Check the current Git state and work from the intended baseline.
- Create a new branch, for example `feature/...` or `bugfix/...`.
- If needed, prepare a demo model or a reproducible test case.

## 2. Implementation

- Change the actual control point or root cause whenever possible, not just the symptom.
- Keep UI text, interaction patterns, and existing viewer conventions consistent.
- If new model data is introduced, check whether `model.json`, other sample models, or generator/mapping documentation also need updates.
- For new fields or metadata, also verify rendering, detail panel behavior, and fallback handling.

## 3. Documentation Alignment

- Check the About/version display if the feature is release-relevant.
- Update the README if behavior, usage, or release history is affected.
- Keep German and English documentation aligned when both are maintained.
- Keep the purpose of each document type separated:
  - `blogArticle.md`: overview, motivation, high-level value, no implementation or modeling details.
  - `architectureInAction.md`: viewer behavior, concepts, and more detailed functional description, but no modeling instructions.
  - `modelingInstructions.md`: only modeling rules, JSON structure, attributes, and examples.
- For viewer metadata or model fields, especially review these files:
  - `doc/german/blogArticle.md`
  - `doc/english/blogArticle.md`
  - `doc/german/modelingInstructions.md`
  - `doc/english/modelingInstructions.md`
  - `doc/german/architectureInAction.md`
  - `doc/english/architectureInAction.md`
  - sample texts if applicable
- Watch formatting carefully, especially JSON examples and `\n` in labels.

## 4. Validation

- Verify the changed behavior directly in the viewer.
- Test relevant interactions, for example the detail panel, navigation, animation, module drill-down, or opening links in a new tab.
- Review a focused diff of the affected files.
- Confirm that DE/EN content remains consistent and that no accidental documentation regressions were introduced.

## 5. Wrap-up

- Briefly record what changed and which files were affected.
- Note open points, risks, or manual follow-up work.
- If a new version is released, create and push a corresponding Git tag after the PR is merged.
- Before a later PR, recheck release text, version numbers, and accompanying documentation.