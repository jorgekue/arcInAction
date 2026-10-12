import { loadBackendModel, setBackendModelFetcher } from './viewer.js';

const toggleButton = document.getElementById('backend-model-toggle');
const closeButton = document.getElementById('backend-model-close');
const panel = document.getElementById('backend-model-panel');
const connectionForm = document.getElementById('backend-connection-form');
const backendUrlInput = document.getElementById('backend-base-url');
const llmApiKeyInput = document.getElementById('llm-api-key');
const loadModelsButton = document.getElementById('backend-load-models');
const statusElement = document.getElementById('backend-model-status');
const modelList = document.getElementById('backend-model-list');

let backendBaseUrl = '';
let llmApiKey = '';

/** Normalizes and validates a user-entered backend base URL. */
function normalizeBackendUrl(value) {
    const url = new URL(value.trim());
    const isLoopbackHost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const usesAllowedProtocol = url.protocol === 'https:' || (url.protocol === 'http:' && isLoopbackHost);
    if (!usesAllowedProtocol || url.username || url.password || url.search || url.hash) {
        throw new Error('Use HTTPS for remote backends. HTTP is allowed only for localhost.');
    }
    return url.href.replace(/\/+$/, '');
}

/** Requests JSON from a backend endpoint without sending the LLM key. */
async function fetchBackendJson(path) {
    const response = await fetch(`${backendBaseUrl}${path}`, {
        headers: { Accept: 'application/json' }
    });
    if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}.`);
    }
    return response.json();
}

/** Loads one model by backend ID for module drill-down or model selection. */
async function fetchBackendModelById(modelId) {
    if (!backendBaseUrl) {
        throw new Error('Set the backend URL before loading backend models.');
    }
    const payload = await fetchBackendJson(`/api/models/${encodeURIComponent(modelId)}`);
    const model = payload?.model && typeof payload.model === 'object' ? payload.model : payload;
    if (!model || typeof model !== 'object' || Array.isArray(model)) {
        throw new Error(`Backend returned an invalid model for '${modelId}'.`);
    }
    return model;
}

/** Displays backend-provided model choices as safe text-only buttons. */
function renderBackendModels(models) {
    modelList.replaceChildren();
    models.forEach(model => {
        const modelId = String(model?.id ?? '').trim();
        if (!modelId) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'backend-model-option';
        button.textContent = String(model.name || modelId);
        button.addEventListener('click', () => selectBackendModel(modelId, button));
        modelList.appendChild(button);
    });

    if (!modelList.childElementCount) {
        statusElement.textContent = 'The backend returned no usable models.';
    }
}

/** Fetches and validates the token-free backend model catalog. */
async function loadBackendModels() {
    loadModelsButton.disabled = true;
    statusElement.textContent = 'Loading models...';
    modelList.replaceChildren();

    try {
        const payload = await fetchBackendJson('/api/models');
        const models = Array.isArray(payload) ? payload : payload?.models;
        if (!Array.isArray(models)) {
            throw new Error('Backend response must contain a models array.');
        }
        renderBackendModels(models);
        if (modelList.childElementCount) statusElement.textContent = `${modelList.childElementCount} model(s) available.`;
    } catch (error) {
        statusElement.textContent = error instanceof Error ? error.message : String(error);
    } finally {
        loadModelsButton.disabled = false;
    }
}

/** Loads the selected model and marks it as backend-provided in the viewer. */
async function selectBackendModel(modelId, button) {
    button.disabled = true;
    statusElement.textContent = `Loading ${button.textContent}...`;

    try {
        const model = await fetchBackendModelById(modelId);
        loadBackendModel(model, modelId);
        statusElement.textContent = `Loaded ${button.textContent}.`;
        panel.hidden = true;
        toggleButton.setAttribute('aria-expanded', 'false');
    } catch (error) {
        statusElement.textContent = error instanceof Error ? error.message : String(error);
    } finally {
        button.disabled = false;
    }
}

/** Returns the optional LLM key kept in this page's memory. */
export function getLlmApiKey() {
    return llmApiKey;
}

/** Returns the configured backend base URL. */
export function getBackendBaseUrl() {
    return backendBaseUrl;
}

setBackendModelFetcher(fetchBackendModelById);

connectionForm.addEventListener('submit', event => {
    event.preventDefault();
    try {
        backendBaseUrl = normalizeBackendUrl(backendUrlInput.value);
        llmApiKey = llmApiKeyInput.value;
        loadBackendModels();
    } catch (error) {
        statusElement.textContent = error instanceof Error ? error.message : String(error);
    }
});

llmApiKeyInput.addEventListener('input', () => {
    llmApiKey = llmApiKeyInput.value;
});

toggleButton.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggleButton.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) backendUrlInput.focus();
});

closeButton.addEventListener('click', () => {
    panel.hidden = true;
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.focus();
});
