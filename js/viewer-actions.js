import {
    activeComponentFlowCounts,
    applyComponentActiveStyle,
    buildConnectionGroupsUI,
    cameraViews,
    componentCenters,
    componentMeshes,
    connectionGroups,
    focusCameraOnComponent,
    pauseAutoPlay,
    playFromStartStep,
    rebuildConnectionSequence,
    resumeAutoPlay,
    setCameraView,
    stopAutoPlay,
    updateConnectionVisibilityFromGroups
} from './viewer.js';

const highlightedComponents = new Map();
const validActionTypes = new Set([
    'highlightComponents',
    'clearHighlights',
    'activateAreas',
    'deactivateAreas',
    'setView',
    'focusCamera',
    'playScenario',
    'pauseScenario',
    'stopScenario'
]);

/** Checks whether a value is a plain action object. */
function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Checks whether a value is a non-empty string. */
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

/** Converts a connection-group name into its scenario identifier. */
function toScenarioId(name) {
    return String(name ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ß/g, 'ss')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** Records and logs a dispatcher warning. */
function addWarning(warnings, message) {
    warnings.push(message);
    console.warn(message);
}

/** Filters component IDs against the currently loaded model. */
function validateComponentIds(componentIds, actionType, warnings) {
    if (!Array.isArray(componentIds)) {
        addWarning(warnings, `${actionType}: componentIds must be an array`);
        return [];
    }

    const validIds = [];
    for (const componentId of componentIds) {
        if (!isNonEmptyString(componentId)) {
            addWarning(warnings, `${actionType}: componentIds must contain non-empty strings`);
            continue;
        }
        if (!componentMeshes.has(componentId)) {
            addWarning(warnings, `${actionType}: unknown componentId '${componentId}'`);
            continue;
        }
        validIds.push(componentId);
    }

    return [...new Set(validIds)];
}

/** Applies a chat highlight without overriding active flow highlighting. */
function setComponentHighlight(componentId, isHighlighted) {
    const currentEntry = componentMeshes.get(componentId);
    if (!currentEntry) return;

    if (isHighlighted) {
        applyComponentActiveStyle(componentId, true);
        highlightedComponents.set(componentId, currentEntry);
        return;
    }

    const previousEntry = highlightedComponents.get(componentId);
    highlightedComponents.delete(componentId);
    if (previousEntry === currentEntry && !activeComponentFlowCounts.has(componentId)) {
        applyComponentActiveStyle(componentId, false);
    }
}

/** Clears highlights previously applied by the dispatcher. */
function clearHighlights() {
    for (const [componentId, previousEntry] of highlightedComponents) {
        if (componentMeshes.get(componentId) === previousEntry && !activeComponentFlowCounts.has(componentId)) {
            applyComponentActiveStyle(componentId, false);
        }
    }
    highlightedComponents.clear();
}

/** Resolves a unique scenario slug against the loaded connection groups. */
function resolveScenario(scenarioId, warnings) {
    const matchingGroups = connectionGroups.filter(group => toScenarioId(group.name) === scenarioId);
    if (matchingGroups.length === 0) {
        addWarning(warnings, `playScenario: unknown scenarioId '${scenarioId}'`);
        return null;
    }
    if (matchingGroups.length > 1) {
        addWarning(warnings, `playScenario: ambiguous scenarioId '${scenarioId}'`);
        return null;
    }

    return matchingGroups[0];
}

/** Validates and executes one viewer action. */
function applyAction(action) {
    const warnings = [];
    if (!isObject(action) || !isNonEmptyString(action.type)) {
        addWarning(warnings, 'Invalid action: expected an object with a string type');
        return warnings;
    }
    if (!validActionTypes.has(action.type)) {
        addWarning(warnings, `Unknown action type '${action.type}'`);
        return warnings;
    }

    switch (action.type) {
        case 'highlightComponents':
        case 'activateAreas': {
            const componentIds = validateComponentIds(action.componentIds, action.type, warnings);
            componentIds.forEach(componentId => setComponentHighlight(componentId, true));
            break;
        }
        case 'deactivateAreas': {
            const componentIds = validateComponentIds(action.componentIds, action.type, warnings);
            componentIds.forEach(componentId => setComponentHighlight(componentId, false));
            break;
        }
        case 'clearHighlights':
            clearHighlights();
            break;
        case 'setView': {
            if (!isNonEmptyString(action.viewId)) {
                addWarning(warnings, 'setView: viewId must be a non-empty string');
                break;
            }
            if (!cameraViews.some(view => view.id === action.viewId)) {
                addWarning(warnings, `setView: unknown viewId '${action.viewId}'`);
                break;
            }
            setCameraView(action.viewId, true);
            break;
        }
        case 'focusCamera': {
            if (!isNonEmptyString(action.componentId)) {
                addWarning(warnings, 'focusCamera: componentId must be a non-empty string');
                break;
            }
            if (!componentMeshes.has(action.componentId) || !componentCenters.has(action.componentId)) {
                addWarning(warnings, `focusCamera: unknown componentId '${action.componentId}'`);
                break;
            }
            focusCameraOnComponent(action.componentId, true);
            break;
        }
        case 'playScenario': {
            if (!isNonEmptyString(action.scenarioId)) {
                addWarning(warnings, 'playScenario: scenarioId must be a non-empty string');
                break;
            }
            if (action.speed !== undefined && (!Number.isFinite(action.speed) || action.speed < 0.25 || action.speed > 4)) {
                addWarning(warnings, 'playScenario: speed must be a number between 0.25 and 4');
                break;
            }
            if (action.speed !== undefined && action.speed !== 1) {
                addWarning(warnings, 'playScenario: speed values other than 1 are not supported by the current viewer');
                break;
            }

            const scenario = resolveScenario(action.scenarioId, warnings);
            if (!scenario) break;
            if (scenario.visible === false) {
                addWarning(warnings, `playScenario: scenario '${action.scenarioId}' is hidden`);
                break;
            }

            stopAutoPlay();
            connectionGroups.forEach(group => {
                group.active = group === scenario;
            });
            updateConnectionVisibilityFromGroups();
            rebuildConnectionSequence();
            buildConnectionGroupsUI();
            playFromStartStep();
            resumeAutoPlay();
            break;
        }
        case 'pauseScenario':
            pauseAutoPlay();
            break;
        case 'stopScenario':
            stopAutoPlay();
            break;
        default:
            addWarning(warnings, `Unknown action type '${action.type}'`);
    }

    return warnings;
}

/** Applies one action and returns any validation warnings. */
export function applyViewerAction(action) {
    return { warnings: applyAction(action) };
}

/** Applies actions independently so one invalid action does not block others. */
export function applyViewerActions(actions) {
    const warnings = [];
    if (!Array.isArray(actions)) {
        addWarning(warnings, 'Invalid actions: expected an array');
        return { warnings };
    }

    actions.forEach((action, index) => {
        try {
            warnings.push(...applyAction(action));
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            addWarning(warnings, `Action at index ${index} failed: ${detail}`);
        }
    });

    return { warnings };
}
