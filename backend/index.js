import { promises as fs, readFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(backendDirectory, '..');
const privateModelsDirectory = path.join(backendDirectory, 'data', 'models');
const maxRequestBytes = 64 * 1024;
const sampleModels = new Map([
    ['demo-model', { name: 'Demo model', filePath: path.join(repositoryRoot, 'model.json') }],
    ['modulePrint.json', { name: 'Module Print', filePath: path.join(repositoryRoot, 'modulePrint.json') }]
]);

loadEnvironmentFile();

/** Loads local environment values without overriding process-level settings. */
function loadEnvironmentFile() {
    let contents;
    try {
        contents = readFileSync(path.join(backendDirectory, '.env'), 'utf8');
    } catch {
        return;
    }

    for (const line of contents.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (!match || match[1] in process.env) continue;

        let value = match[2];
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[match[1]] = value;
    }
}

/** Writes a JSON response with no-store caching. */
function sendJson(response, statusCode, payload) {
    const body = JSON.stringify(payload);
    response.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store'
    });
    response.end(body);
}

/** Applies the configured browser-origin allowlist. */
function setCorsHeaders(request, response) {
    const defaultOrigins = ['http://127.0.0.1:5502', 'http://localhost:5502'];
    const allowedOrigins = new Set(
        (process.env.ALLOWED_ORIGINS || defaultOrigins.join(','))
            .split(',')
            .map(origin => origin.trim())
            .filter(Boolean)
    );
    const origin = request.headers.origin;

    if (origin && !allowedOrigins.has(origin)) {
        sendJson(response, 403, { error: 'origin_not_allowed' });
        return false;
    }

    if (origin) response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Max-Age', '600');
    return true;
}

/** Reads a bounded JSON request body. */
async function readJsonBody(request) {
    const contentType = String(request.headers['content-type'] || '').toLowerCase();
    if (!contentType.includes('application/json')) {
        const error = new Error('Content-Type must be application/json.');
        error.statusCode = 415;
        throw error;
    }

    const chunks = [];
    let totalBytes = 0;
    let sizeError = null;
    for await (const chunk of request) {
        totalBytes += chunk.length;
        if (totalBytes > maxRequestBytes) {
            sizeError = new Error('Request body is too large.');
            sizeError.statusCode = 413;
            continue;
        }
        chunks.push(chunk);
    }
    if (sizeError) throw sizeError;
    if (totalBytes === 0) {
        const error = new Error('Request body is required.');
        error.statusCode = 400;
        throw error;
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        const error = new Error('Request body must be valid JSON.');
        error.statusCode = 400;
        throw error;
    }
}

/** Resolves a private model ID while preventing path traversal. */
function safePrivateModelPath(modelId) {
    if (typeof modelId !== 'string' || !modelId.trim() || !modelId.toLowerCase().endsWith('.json')) {
        return null;
    }

    const filePath = path.resolve(privateModelsDirectory, modelId);
    const allowedPrefix = `${path.resolve(privateModelsDirectory)}${path.sep}`;
    return filePath.startsWith(allowedPrefix) ? filePath : null;
}

/** Finds a built-in sample or a private backend model by ID. */
async function resolveModel(modelId) {
    if (typeof modelId !== 'string' || !modelId.trim()) return null;

    const sample = sampleModels.get(modelId);
    if (sample) return { ...sample, id: modelId };

    const filePath = safePrivateModelPath(modelId);
    if (!filePath) return null;

    try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) return null;
        return { id: modelId, name: path.basename(modelId, '.json'), filePath };
    } catch {
        return null;
    }
}

/** Recursively lists JSON model files stored outside the public repository. */
async function listPrivateModels(directory = privateModelsDirectory, relativeDirectory = '') {
    let entries;
    try {
        entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }

    const models = [];
    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const relativePath = path.posix.join(relativeDirectory, entry.name);
        const filePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            models.push(...await listPrivateModels(filePath, relativePath));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
            models.push({
                id: relativePath.split(path.sep).join('/'),
                name: path.basename(entry.name, '.json')
            });
        }
    }
    return models;
}

/** Combines the fixed development samples with private backend models. */
async function listModels() {
    const models = [...sampleModels.entries()].map(([id, model]) => ({ id, name: model.name }));
    const privateModels = await listPrivateModels();
    const knownIds = new Set(models.map(model => model.id));
    return models.concat(privateModels.filter(model => !knownIds.has(model.id)));
}

/** Reads and parses one allowlisted model without exposing filesystem paths. */
async function readModel(modelId) {
    const modelEntry = await resolveModel(modelId);
    if (!modelEntry) return null;

    try {
        const contents = await fs.readFile(modelEntry.filePath, 'utf8');
        const model = JSON.parse(contents);
        if (!model || typeof model !== 'object' || Array.isArray(model)) return null;
        return model;
    } catch {
        return null;
    }
}

/** Validates a free mock chat request and never persists its optional LLM key. */
async function handleChat(request, response) {
    const body = await readJsonBody(request);
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const context = body?.context;
    if (!message || message.length > 4000 || !context || typeof context !== 'object' || Array.isArray(context)) {
        sendJson(response, 400, { error: 'invalid_request' });
        return;
    }
    if (body.llmApiKey !== undefined && (typeof body.llmApiKey !== 'string' || body.llmApiKey.length > 8192)) {
        sendJson(response, 400, { error: 'invalid_llm_api_key' });
        return;
    }
    if (typeof context.modelId !== 'string' || !await resolveModel(context.modelId)) {
        sendJson(response, 400, { error: 'unknown_model' });
        return;
    }

    sendJson(response, 200, {
        answer: 'Mock backend response. LLM integration is not enabled yet.',
        actions: [],
        warnings: []
    });
}

/** Routes the model catalog, model retrieval, and mock chat API. */
async function handleRequest(request, response) {
    if (!setCorsHeaders(request, response)) return;
    if (request.method === 'OPTIONS') {
        response.writeHead(204);
        response.end();
        return;
    }

    const requestUrl = new URL(request.url || '/', 'http://localhost');
    if (request.method === 'GET' && requestUrl.pathname === '/api/models') {
        sendJson(response, 200, { models: await listModels() });
        return;
    }

    const modelPathPrefix = '/api/models/';
    if (request.method === 'GET' && requestUrl.pathname.startsWith(modelPathPrefix)) {
        let modelId;
        try {
            modelId = decodeURIComponent(requestUrl.pathname.slice(modelPathPrefix.length));
        } catch {
            sendJson(response, 400, { error: 'invalid_model_id' });
            return;
        }
        const model = await readModel(modelId);
        if (!model) {
            sendJson(response, 404, { error: 'model_not_found' });
            return;
        }
        sendJson(response, 200, model);
        return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/chat') {
        await handleChat(request, response);
        return;
    }

    sendJson(response, 404, { error: 'not_found' });
}

const server = http.createServer((request, response) => {
    handleRequest(request, response).catch(error => {
        if (response.headersSent) {
            response.destroy();
            return;
        }
        const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
        if (statusCode >= 500) console.error('Backend request failed:', error.message);
        sendJson(response, statusCode, { error: statusCode === 500 ? 'internal_server_error' : error.message });
    });
});

const port = Number.parseInt(process.env.PORT || '8787', 10);
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => {
    console.log(`arcInAction backend listening on http://${host}:${port}`);
});
