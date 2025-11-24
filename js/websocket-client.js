// ============================================
// UNIFIED WEBSOCKET CLIENT
// Handles echo messages, broadcast, notifications, and ChatGPT progress updates
// ============================================

let ws = null;
let messageQueue = [];
const MAX_MESSAGES = 50;
let wsInitialized = false;

/**
 * Initialize WebSocket connection (only once)
 */
function initWebSocket() {
    if (wsInitialized) return;
    wsInitialized = true;

    ws = new WebSocket('ws://localhost:3000');

    ws.onopen = () => {
        console.log('✅ WebSocket connected');
        updateConnectionStatus(true);
        addMessageToDisplay('System', 'Connected to server', 'success');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            // Handle server message types
            switch (data.type) {
                case 'connection':
                    addMessageToDisplay('System', data.message, 'info');
                    break;
                case 'echo':
                    addMessageToDisplay('Server Echo', data.serverResponse, 'echo');
                    break;
                case 'broadcast':
                    addMessageToDisplay('Broadcast', data.message, 'broadcast');
                    break;
                case 'notification':
                    addMessageToDisplay('Notification', data.message, 'notification');
                    break;
                case 'error':
                    addMessageToDisplay('Error', data.message, 'error');
                    break;
                case 'progress':
                    fetchResultsAndUpdateCharts(); // Update charts on GPT progress
                    break;
                default:
                    addMessageToDisplay('Message', JSON.stringify(data), 'default');
            }
        } catch (err) {
            console.error('❌ Error parsing message:', err);
        }
    };

    ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        updateConnectionStatus(false);
        addMessageToDisplay('Error', 'WebSocket connection error', 'error');
    };

    ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        updateConnectionStatus(false);
        addMessageToDisplay('System', 'Disconnected from server', 'warning');
        ws = null;
        wsInitialized = false; // allow reconnect
    };
}

/**
 * Send message to server
 */
function sendMessage() {
    const inputElement = document.getElementById('websocketInput');
    const messageText = inputElement?.value.trim() || '';

    if (!messageText) return;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        addMessageToDisplay('Error', 'Not connected to server', 'error');
        return;
    }

    const message = { text: messageText, type: 'user', timestamp: new Date().toISOString() };
    ws.send(JSON.stringify(message));
    addMessageToDisplay('You', messageText, 'sent');

    inputElement.value = '';
    inputElement.focus();
}

/**
 * Display message in UI
 */
function addMessageToDisplay(sender, text, type = 'default') {
    const displayElement = document.getElementById('websocketMessages');
    if (!displayElement) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `ws-message ws-${type}`;
    messageDiv.style.marginBottom = '8px';
    messageDiv.style.padding = '8px';
    messageDiv.style.borderRadius = '4px';
    messageDiv.style.fontSize = '0.9em';

    // Style based on type
    const styles = {
        sent: { backgroundColor: '#d4edda', color: '#155724', borderLeft: '3px solid #28a745' },
        echo: { backgroundColor: '#cfe2ff', color: '#084298', borderLeft: '3px solid #0d6efd' },
        broadcast: { backgroundColor: '#fff3cd', color: '#997404', borderLeft: '3px solid #ffc107' },
        success: { backgroundColor: '#d4edda', color: '#155724', borderLeft: '3px solid #28a745' },
        info: { backgroundColor: '#e2e3e5', color: '#383d41', borderLeft: '3px solid #6c757d' },
        notification: { backgroundColor: '#e2e3e5', color: '#383d41', borderLeft: '3px solid #6c757d' },
        warning: { backgroundColor: '#fff3cd', color: '#997404', borderLeft: '3px solid #ffc107' },
        error: { backgroundColor: '#f8d7da', color: '#842029', borderLeft: '3px solid #dc3545' },
        default: { backgroundColor: '#e9ecef', color: '#495057', borderLeft: '3px solid #dee2e6' }
    };
    Object.assign(messageDiv.style, styles[type] || styles.default);

    const timestamp = new Date().toLocaleTimeString();
    const senderSpan = document.createElement('strong');
    senderSpan.textContent = `[${timestamp}] ${sender}: `;
    const textSpan = document.createElement('span');
    textSpan.textContent = text;

    messageDiv.appendChild(senderSpan);
    messageDiv.appendChild(textSpan);
    displayElement.appendChild(messageDiv);

    while (displayElement.children.length > MAX_MESSAGES) displayElement.removeChild(displayElement.firstChild);
    displayElement.scrollTop = displayElement.scrollHeight;

    messageQueue.push({ sender, text, type, timestamp });
    while (messageQueue.length > MAX_MESSAGES) messageQueue.shift();
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('websocketStatus');
    if (!statusElement) return;
    statusElement.textContent = isConnected ? '● Connected' : '● Disconnected';
    statusElement.style.color = isConnected ? '#28a745' : '#dc3545';
    statusElement.style.fontWeight = 'bold';
}

/**
 * Clear messages
 */
function clearMessages() {
    const displayElement = document.getElementById('websocketMessages');
    if (displayElement) displayElement.innerHTML = '';
    messageQueue = [];
}

/**
 * Reconnect WebSocket
 */
function reconnectWebSocket() {
    if (ws) ws.close();
    setTimeout(initWebSocket, 500);
}

/**
 * Init on page load
 */
window.addEventListener('load', () => {
    initWebSocket();
});

// Send message on Ctrl+Enter
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.ctrlKey) sendMessage();
});
