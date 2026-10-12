import { getBackendBaseUrl } from './backend-models.js';

const requestTimeoutMs = 30000;

/** Sends a chat request with the optional LLM key only in its JSON body. */
export async function sendChatRequest(message, context, llmApiKey = '') {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
        throw new Error('Set the backend URL before sending a chat request.');
    }
    if (typeof message !== 'string' || !message.trim()) {
        throw new Error('Enter a message before sending.');
    }
    if (typeof llmApiKey !== 'string') {
        throw new Error('The LLM API key must be text.');
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs);
    const body = { message: message.trim(), context };
    if (llmApiKey) body.llmApiKey = llmApiKey;

    try {
        const response = await fetch(`${backendBaseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        let payload;
        try {
            payload = await response.json();
        } catch {
            if (!response.ok) {
                throw new Error(`Chat API returned HTTP ${response.status}.`);
            }
            throw new Error('Chat API returned invalid JSON.');
        }

        if (!response.ok) {
            throw new Error(`Chat API returned HTTP ${response.status}: ${payload?.error || 'request_failed'}`);
        }
        if (typeof payload?.answer !== 'string' || !Array.isArray(payload.actions) ||
            (payload.warnings !== undefined && !Array.isArray(payload.warnings))) {
            throw new Error('Chat API returned an invalid response.');
        }
        return { ...payload, warnings: payload.warnings || [] };
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('Chat request timed out.');
        }
        if (error instanceof TypeError) {
            throw new Error('Could not reach the chat backend. Check the URL, network connection, and CORS settings.');
        }
        throw error;
    } finally {
        window.clearTimeout(timeoutId);
    }
}
