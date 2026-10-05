import {
    activeComponentFlowCounts,
    componentMeshes,
    connectionSequence,
    currentCameraViewId,
    currentModelFile,
    currentSelectedConnectionIndex,
    getModulePath,
    getPlaybackContext
} from './viewer.js';

/** Builds a compact context snapshot from the current viewer state. */
export function buildViewerContext() {
    const playback = getPlaybackContext();
    const selectedIndex = currentSelectedConnectionIndex;
    const hasCurrentConnection = selectedIndex >= 0 && selectedIndex < connectionSequence.length;
    const selectedConnection = hasCurrentConnection
        ? connectionSequence[selectedIndex]?.userData?.connection
        : null;
    const currentFlow = playback.flows.find(flow => flow.status === 'running') || playback.flows[0] || null;

    return {
        modelId: currentModelFile || null,
        activeView: currentCameraViewId,
        activeComponentIds: playback.activeComponentIds,
        flowHighlightedComponentIds: [...activeComponentFlowCounts.keys()]
            .filter(componentId => componentMeshes.has(componentId)),
        currentConnectionId: currentFlow?.connectionId || null,
        selectedConnectionId: typeof selectedConnection?.id === 'string' ? selectedConnection.id : null,
        playback,
        modulePath: getModulePath()
    };
}
