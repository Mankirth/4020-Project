// ============================================
// WEBSOCKET CLIENT MODULE
// ============================================

let ws = null;
const messageQueue = [];
const MAX_MESSAGES = 50;

/**
 * Initialize WebSocket connection
 */
function initWebSocket() {
    // Detect if running on localhost (development) or production
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;

    console.log('🔗 Attempting to connect to WebSocket:', wsUrl);

    ws = new WebSocket(wsUrl);

    /**
     * Connection opened
     */
    ws.onopen = () => {
        console.log('✅ WebSocket connected');
        updateConnectionStatus(true);
        addMessageToDisplay('System', 'Connected to server', 'success');
    };

    /**
     * Receive messages from server
     */
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('📨 Received from server:', data);

            // Handle different message types
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
                default:
                    addMessageToDisplay('Message', JSON.stringify(data), 'default');
            }
        } catch (error) {
            console.error('❌ Error parsing message:', error);
            addMessageToDisplay('Error', `Parse error: ${error.message}`, 'error');
        }
    };

    /**
     * Connection error
     */
    ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        updateConnectionStatus(false);
        addMessageToDisplay('Error', 'WebSocket connection error', 'error');
    };

    /**
     * Connection closed
     */
    ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        updateConnectionStatus(false);
        addMessageToDisplay('System', 'Disconnected from server', 'warning');
        ws = null;
    };
}

/**
 * Send message to server
 */
function sendMessage() {
    const inputElement = document.getElementById('websocketInput');
    const messageText = inputElement ? inputElement.value.trim() : '';

    if (!messageText) {
        console.warn('⚠️  Empty message, not sending');
        return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        addMessageToDisplay('Error', 'Not connected to server', 'error');
        console.warn('⚠️  WebSocket not connected');
        return;
    }

    // Create message object
    const message = {
        text: messageText,
        timestamp: new Date().toISOString(),
        type: 'user'
    };

    try {
        // Send to server
        ws.send(JSON.stringify(message));
        console.log('📤 Sent to server:', message);

        // Add to display
        addMessageToDisplay('You', messageText, 'sent');

        // Clear input
        if (inputElement) {
            inputElement.value = '';
            inputElement.focus();
        }
    } catch (error) {
        console.error('❌ Error sending message:', error);
        addMessageToDisplay('Error', `Send error: ${error.message}`, 'error');
    }
}

/**
 * Add message to display box
 */
function addMessageToDisplay(sender, text, type = 'default') {
    const displayElement = document.getElementById('websocketMessages');

    if (!displayElement) {
        console.warn('⚠️  Message display element not found');
        return;
    }

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `ws-message ws-${type}`;
    messageDiv.style.marginBottom = '8px';
    messageDiv.style.padding = '8px';
    messageDiv.style.borderRadius = '4px';
    messageDiv.style.fontSize = '0.9em';

    // Style based on type
    const styles = {
        'sent': { backgroundColor: '#d4edda', color: '#155724', borderLeft: '3px solid #28a745' },
        'echo': { backgroundColor: '#cfe2ff', color: '#084298', borderLeft: '3px solid #0d6efd' },
        'broadcast': { backgroundColor: '#fff3cd', color: '#997404', borderLeft: '3px solid #ffc107' },
        'success': { backgroundColor: '#d4edda', color: '#155724', borderLeft: '3px solid #28a745' },
        'info': { backgroundColor: '#e2e3e5', color: '#383d41', borderLeft: '3px solid #6c757d' },
        'notification': { backgroundColor: '#e2e3e5', color: '#383d41', borderLeft: '3px solid #6c757d' },
        'warning': { backgroundColor: '#fff3cd', color: '#997404', borderLeft: '3px solid #ffc107' },
        'error': { backgroundColor: '#f8d7da', color: '#842029', borderLeft: '3px solid #dc3545' },
        'default': { backgroundColor: '#e9ecef', color: '#495057', borderLeft: '3px solid #dee2e6' }
    };

    const style = styles[type] || styles.default;
    Object.assign(messageDiv.style, style);

    // Add timestamp
    const timestamp = new Date().toLocaleTimeString();
    const senderSpan = document.createElement('strong');
    senderSpan.textContent = `[${timestamp}] ${sender}: `;

    const textSpan = document.createElement('span');
    textSpan.textContent = text;

    messageDiv.appendChild(senderSpan);
    messageDiv.appendChild(textSpan);

    // Add to display
    displayElement.appendChild(messageDiv);

    // Keep only last MAX_MESSAGES
    while (displayElement.children.length > MAX_MESSAGES) {
        displayElement.removeChild(displayElement.firstChild);
    }

    // Auto-scroll to bottom
    displayElement.scrollTop = displayElement.scrollHeight;

    // Also store in queue for reference
    messageQueue.push({
        sender,
        text,
        type,
        timestamp
    });

    // Keep queue size manageable
    while (messageQueue.length > MAX_MESSAGES) {
        messageQueue.shift();
    }
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('websocketStatus');

    if (!statusElement) return;

    if (isConnected) {
        statusElement.textContent = '● Connected';
        statusElement.style.color = '#28a745';
        statusElement.style.fontWeight = 'bold';
    } else {
        statusElement.textContent = '● Disconnected';
        statusElement.style.color = '#dc3545';
        statusElement.style.fontWeight = 'bold';
    }
}

/**
 * Clear all messages
 */
function clearMessages() {
    const displayElement = document.getElementById('websocketMessages');
    if (displayElement) {
        displayElement.innerHTML = '';
    }
    messageQueue.length = 0;
    console.log('🗑️  Messages cleared');
}

/**
 * Disconnect WebSocket
 */
function disconnectWebSocket() {
    if (ws) {
        ws.close();
        console.log('🔌 WebSocket disconnected manually');
    }
}

/**
 * Reconnect WebSocket
 */
function reconnectWebSocket() {
    disconnectWebSocket();
    setTimeout(() => {
        initWebSocket();
    }, 500);
}

/**
 * Initialize on page load
 */
window.addEventListener('load', () => {
    console.log('Initializing WebSocket client...');
    initWebSocket();
});

/**
 * Handle page visibility (reconnect if tab becomes active)
 */
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && (!ws || ws.readyState !== WebSocket.OPEN)) {
        console.log('Page became visible, reconnecting WebSocket...');
        reconnectWebSocket();
    }
});

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    if (ws) {
        ws.close();
    }
});

/**
 * Allow Enter key to send message
 */
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
        sendMessage();
    }
});
