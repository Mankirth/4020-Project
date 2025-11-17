// ============================================
// ANIMATED ASSISTANT CHARACTER MODULE
// ============================================

const assistantTips = [
    "💡 This project analyzes ChatGPT efficiency across History, Social Science, and Computer Security.",
    "💾 We use MongoDB to store evaluation results and track performance metrics.",
    "⚡ WebSocket technology enables real-time communication between client and server.",
    "🔧 Express.js middleware validates API requests and computes results on the backend.",
    "🚀 Client-side routing allows seamless navigation without page reloads.",
    "🤖 The animated assistant provides contextual tips based on the current page.",
    "📊 We measure ChatGPT response latency, accuracy, completeness, and relevance.",
    "🔐 Focus on cybersecurity, API security, and web security best practices.",
    "🎓 York University IT Program.",
    "🌐 Full-stack web development with modern technologies."
];

let tipIndex = 0;
const TIP_INTERVAL = 10000; // Change tip every 10 seconds
let tipIntervalId = null;

/**
 * Update the assistant message to display the next tip
 */
function updateAssistantMessage() {
    const tipElement = document.getElementById('assistantMessage');
    
    if (!tipElement) {
        console.warn('Assistant message element not found');
        return;
    }
    
    // Fade out effect
    tipElement.style.opacity = '0';
    tipElement.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
        tipElement.textContent = assistantTips[tipIndex];
        tipElement.style.opacity = '1';
        tipIndex = (tipIndex + 1) % assistantTips.length;
    }, 300);
}

/**
 * Start the assistant tip rotation
 */
function startAssistantTips() {
    if (tipIntervalId) {
        console.log('Assistant tips already running');
        return;
    }
    
    // Set initial tip
    updateAssistantMessage();
    
    // Start rotation
    tipIntervalId = setInterval(updateAssistantMessage, TIP_INTERVAL);
    console.log('Assistant tips started');
}

/**
 * Stop the assistant tip rotation
 */
function stopAssistantTips() {
    if (tipIntervalId) {
        clearInterval(tipIntervalId);
        tipIntervalId = null;
        console.log('Assistant tips stopped');
    }
}

/**
 * Initialize assistant on page load
 */
window.addEventListener('load', () => {
    console.log('Initializing assistant...');
    startAssistantTips();
});

/**
 * Handle page visibility (pause when tab is not active)
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAssistantTips();
    } else {
        startAssistantTips();
    }
});

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    stopAssistantTips();
});
