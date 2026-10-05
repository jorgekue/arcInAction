import { applyViewerActions } from './viewer-actions.js';

const chatToggleButton = document.getElementById('chatToggleBtn');
const chatCloseButton = document.getElementById('chatCloseBtn');
const chatPanel = document.getElementById('chat-panel');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const mockContext = { modelId: 'local-mock' };

export function getMockResponse(message, context = {}) {
    const text = message.trim();
    const componentMatch = text.match(/^(?:zeige|markiere|hebe hervor)(?: mir)?\s+(?:(?:die )?komponente\s+)?([a-z0-9_-]+)$/i);
    if (componentMatch) {
        const componentId = componentMatch[1];
        return {
            answer: `Ich hebe Komponente ${componentId} hervor.`,
            actions: [{ type: 'highlightComponents', componentIds: [componentId] }]
        };
    }

    const focusMatch = text.match(/^(?:fokussiere|fokussier|kamera auf)\s+(?:komponente\s+)?([a-z0-9_-]+)$/i);
    if (focusMatch) {
        const componentId = focusMatch[1];
        return {
            answer: `Ich richte die Kamera auf Komponente ${componentId}.`,
            actions: [{ type: 'focusCamera', componentId }]
        };
    }

    const viewMatch = text.match(/^(?:ansicht|sicht)\s+(iso|top|front)$/i);
    if (viewMatch) {
        const viewId = viewMatch[1].toLowerCase();
        return {
            answer: `Ich wechsle zur Ansicht ${viewId}.`,
            actions: [{ type: 'setView', viewId }]
        };
    }

    if (/^(?:lösche|entferne) (?:alle )?(?:hervorhebungen|markierungen)$/i.test(text)) {
        return {
            answer: 'Ich entferne die Chat-Hervorhebungen.',
            actions: [{ type: 'clearHighlights' }]
        };
    }

    return {
        answer: `Der lokale Mock für ${context.modelId || 'dieses Modell'} versteht derzeit: „zeige S1“, „fokussiere S1“, „ansicht top“ oder „lösche hervorhebungen“.`,
        actions: []
    };
}

function appendMessage(role, text) {
    const message = document.createElement('div');
    message.className = `chat-message chat-message-${role}`;
    message.textContent = text;
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatForm.addEventListener('submit', event => {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    appendMessage('user', message);
    chatInput.value = '';

    const response = getMockResponse(message, mockContext);
    appendMessage('assistant', response.answer);

    const result = applyViewerActions(response.actions);
    result.warnings.forEach(warning => appendMessage('warning', warning));
});

function setChatPanelOpen(isOpen) {
    chatPanel.hidden = !isOpen;
    chatToggleButton.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) chatInput.focus();
}

chatToggleButton.addEventListener('click', () => {
    setChatPanelOpen(chatPanel.hidden);
});

chatCloseButton.addEventListener('click', () => {
    setChatPanelOpen(false);
    chatToggleButton.focus();
});
