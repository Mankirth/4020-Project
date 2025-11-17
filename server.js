// ============================================
// SERVER.JS - Express & WebSocket Server
// ============================================

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const cors = require('cors');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Configuration
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE ROUTE: /api/add
// ============================================
/**
 * API endpoint to add two numbers
 * Query params: a, b
 * Example: /api/add?a=2&b=3 returns { "result": 5 }
 */
app.get('/api/add', (req, res) => {
    try {
        // Extract query parameters
        const a = parseFloat(req.query.a);
        const b = parseFloat(req.query.b);

        // Validate inputs
        if (isNaN(a) || isNaN(b)) {
            return res.status(400).json({
                error: 'Invalid input. Both a and b must be numbers.',
                example: '/api/add?a=2&b=3'
            });
        }

        // Calculate result
        const result = a + b;

        // Return JSON response
        res.json({
            a: a,
            b: b,
            result: result,
            operation: 'addition',
            timestamp: new Date().toISOString()
        });

        console.log(`✅ API Request: /api/add?a=${a}&b=${b} => ${result}`);
    } catch (error) {
        console.error('❌ Error in /api/add:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// ============================================
// WEBSOCKET SERVER
// ============================================

// Store connected clients
const clients = new Set();

/**
 * Handle WebSocket connections
 */
wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket client connected');
    clients.add(ws);

    // Send welcome message to new client
    ws.send(JSON.stringify({
        type: 'connection',
        message: 'Welcome! You are connected to the ChatGPT Efficiency Validator server.',
        clientCount: clients.size,
        timestamp: new Date().toISOString()
    }));

    /**
     * Handle incoming messages from client
     */
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log('📨 Received message:', message);

            // Echo message back to sender
            const response = {
                type: 'echo',
                originalMessage: message.text,
                serverResponse: `Server received: "${message.text}"`,
                clientCount: clients.size,
                timestamp: new Date().toISOString()
            };

            // Send response to this specific client
            ws.send(JSON.stringify(response));

            // Broadcast to all other clients
            const broadcastMessage = {
                type: 'broadcast',
                message: message.text,
                source: 'broadcast',
                timestamp: new Date().toISOString()
            };

            clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(broadcastMessage));
                }
            });

        } catch (error) {
            console.error('❌ Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Error processing message',
                error: error.message
            }));
        }
    });

    /**
     * Handle client disconnect
     */
    ws.on('close', () => {
        clients.delete(ws);
        console.log(`❌ Client disconnected. Remaining clients: ${clients.size}`);

        // Notify other clients
        const disconnectMessage = {
            type: 'notification',
            message: `A client disconnected. Current connections: ${clients.size}`,
            timestamp: new Date().toISOString()
        };

        clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(disconnectMessage));
            }
        });
    });

    /**
     * Handle WebSocket errors
     */
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

// ============================================
// DEFAULT ROUTES
// ============================================

/**
 * Root route - serve index.html
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'Server is running',
        timestamp: new Date().toISOString(),
        connectedClients: clients.size
    });
});

/**
 * 404 handler
 */
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        requestedPath: req.path,
        availableEndpoints: {
            GET: [
                '/',
                '/health',
                '/api/add?a=2&b=3'
            ],
            WebSocket: 'ws://localhost:3000'
        }
    });
});

// ============================================
// START SERVER
// ============================================

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║  ChatGPT Efficiency Validator Server   ║
╚════════════════════════════════════════╝

🚀 Server is running on port ${PORT}

📍 Access Points:
   - Website:    http://localhost:${PORT}
   - API Test:   http://localhost:${PORT}/api/add?a=2&b=3
   - Health:     http://localhost:${PORT}/health
   - WebSocket:  ws://localhost:${PORT}

⏹️  Press Ctrl+C to stop the server
    `);
});

// Handle server errors
server.on('error', (error) => {
    console.error('❌ Server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down server gracefully...');
    
    // Close all WebSocket connections
    wss.clients.forEach((client) => {
        client.close();
    });
    
    // Close server
    server.close(() => {
        console.log('✅ Server shut down successfully');
        process.exit(0);
    });
});
