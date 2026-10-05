const chatToggleButton = document.getElementById('chatToggleBtn');
const chatCloseButton = document.getElementById('chatCloseBtn');
const chatPanel = document.getElementById('chat-panel');

function setChatPanelOpen(isOpen) {
    chatPanel.hidden = !isOpen;
    chatToggleButton.setAttribute('aria-expanded', String(isOpen));
}

chatToggleButton.addEventListener('click', () => {
    setChatPanelOpen(chatPanel.hidden);
});

chatCloseButton.addEventListener('click', () => {
    setChatPanelOpen(false);
    chatToggleButton.focus();
});
