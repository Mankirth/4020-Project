// ============================================
// SERVER.JS - Express & WebSocket Server (ES Module)
// ============================================

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// MongoDB Connection
// ============================================
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("🍃 MongoDB connected"))
.catch(err => console.error("❌ MongoDB error:", err));

// Define Schema and Model
const questionSchema = new mongoose.Schema({
    question: String,
    A: String,
    B: String,
    C: String,
    D: String,
    expected_response: String,
    chatgpt_response: String,
    domain: String,
    response_time: Number
});

const Question = mongoose.model("chatgpt_evaluation_questions", questionSchema);

// ============================================
// OpenAI API
// ============================================
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
// Express & WebSocket Setup
// ============================================
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;

// ============================================
// /api/add Route
// ============================================
app.get('/api/add', (req, res) => {
    try {
        const a = parseFloat(req.query.a);
        const b = parseFloat(req.query.b);

        if (isNaN(a) || isNaN(b)) {
            return res.status(400).json({
                error: 'Invalid input. Both a and b must be numbers.',
                example: '/api/add?a=2&b=3'
            });
        }

        const result = a + b;
        res.json({ a, b, result, operation: 'addition', timestamp: new Date().toISOString() });
        console.log(`✅ API Request: /api/add?a=${a}&b=${b} => ${result}`);
    } catch (error) {
        console.error('❌ Error in /api/add:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// WebSocket Server
// ============================================
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket client connected');
    clients.add(ws);

    ws.send(JSON.stringify({
        type: 'connection',
        message: 'Welcome! You are connected to the ChatGPT Efficiency Validator server.',
        clientCount: clients.size,
        timestamp: new Date().toISOString()
    }));

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            const response = {
                type: 'echo',
                originalMessage: message.text,
                serverResponse: `Server received: "${message.text}"`,
                clientCount: clients.size,
                timestamp: new Date().toISOString()
            };
            ws.send(JSON.stringify(response));

            const broadcastMessage = {
                type: 'broadcast',
                message: message.text,
                source: 'broadcast',
                timestamp: new Date().toISOString()
            };

            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(broadcastMessage));
                }
            });
        } catch (error) {
            console.error('❌ Error processing message:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Error processing message', error: error.message }));
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log(`❌ Client disconnected. Remaining clients: ${clients.size}`);

        const disconnectMessage = {
            type: 'notification',
            message: `A client disconnected. Current connections: ${clients.size}`,
            timestamp: new Date().toISOString()
        };
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(disconnectMessage));
        });
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

// ============================================
// Default Routes
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({
        status: 'Server is running',
        timestamp: new Date().toISOString(),
        connectedClients: clients.size
    });
});

// ============================================
// API: /api/run
// ============================================
app.get('/api/run', async (req, res) => {
    try {
        console.log("🚀 /api/run triggered");

        const comp = await Question.find({ domain: "computer_security" }).limit(50);
        const hist = await Question.find({ domain: "prehistory" }).limit(50);
        const soc = await Question.find({ domain: "sociology" }).limit(50);

        console.log(`Found ${comp.length} computer_security questions`);
        console.log(`Found ${hist.length} prehistory questions`);
        console.log(`Found ${soc.length} sociology questions`);

        await Promise.all([askGpt(comp, "computer_security"),askGpt(hist, "prehistory"), askGpt(soc, "sociology")]).then(() => {
            res.json({ status: "completed" });
        });
    } catch (err) {
        console.error("❌ Error in /api/run:", err);
        res.status(500).json({ error: err.message });
    }
});


// ============================================
// API: /api/results (fixed for accuracy calculation)
// ============================================
app.get('/api/results', async (req, res) => {
    try {
        const domains = ['computer_security', 'prehistory', 'sociology'];
        const results = {};

        for (let domain of domains) {
            const questions = await Question.find({ domain });
            const total = questions.length;

            if (total > 0) {
                // Use trimmed, uppercased comparison to handle minor formatting differences
                const correct = questions.filter(q => 
                    (q.chatgpt_response || '').trim().toUpperCase() === 
                    (q.expected_response || '').trim().toUpperCase()
                ).length;

                const avgTime = questions.reduce((sum, q) => sum + (q.response_time || 0), 0) / total;

                results[domain] = {
                    accuracy: ((correct / total) * 100).toFixed(2),
                    avgTime: avgTime.toFixed(2)
                };
            } else {
                results[domain] = { accuracy: "0.00", avgTime: "0.00" };
            }
        }

        res.json(results);
    } catch (err) {
        console.error('❌ Error in /api/results:', err);
        res.status(500).json({ error: 'Could not fetch results' });
    }
});

// ============================================
// TEST ROUTE: OpenAI API Check
// ============================================
app.get('/api/test-gpt', async (req, res) => {
    try {
        const prompt = "What is 2 + 2? Answer with only a single letter: A=3, B=4, C=5, D=6";
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }]
        });
        let ans = response.choices[0].message.content.trim().toUpperCase();
        if (!['A','B','C','D'].includes(ans)) ans = "ERROR";
        res.json({ answer: ans });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Updated askGpt Function with response sanitization
// ============================================
async function askGpt(questions, domain) {
    for (let i = 0; i < questions.length; i++) {
        let q = questions[i];
        const prompt = `${q.question}\nA. ${q.A}\nB. ${q.B}\nC. ${q.C}\nD. ${q.D}\nAnswer with only A, B, C, or D.`;
        const start = Date.now();

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }]
            });

            // ⚡ Sanitize GPT response: store only A/B/C/D or ERROR
            let ans = response.choices[0].message.content.trim().toUpperCase();
            if (!['A','B','C','D'].includes(ans)) ans = "ERROR";
            q.chatgpt_response = ans;

        } catch (err) {
            console.error(`❌ GPT error for question ${i + 1} in ${domain}:`, err);
            q.chatgpt_response = "ERROR";
        }

        q.response_time = Date.now() - start;

        try { await q.save(); } catch (saveErr) { 
            console.error(`❌ Failed to save question ${i + 1} in ${domain}:`, saveErr); 
        }

        const progress = { type: "progress", domain, index: i + 1, total: questions.length, time: q.response_time };
        wss.clients.forEach(client => { 
            if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(progress)); 
        });
    }
}

// ============================================
// API: /api/reset
// ============================================
app.post('/api/reset', async (req, res) => {
    try {
        await Question.updateMany({}, { $set: { chatgpt_response: "", response_time: null } });
        res.json({ status: 'reset' });
        console.log('✅ All questions reset');
    } catch (err) {
        console.error('❌ Failed to reset questions:', err);
        res.status(500).json({ error: 'Could not reset questions' });
    }
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        requestedPath: req.path,
        availableEndpoints: {
            GET: ['/', '/health', '/api/add?a=2&b=3', '/api/run', '/api/results'],
            WebSocket: 'ws://localhost:3000'
        }
    });
});

// ============================================
// START SERVER (kept EXACTLY as original)
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
   - ChatGPT Test: http://localhost:${PORT}/api/run

⏹️ Press Ctrl+C to stop the server
`);
});

// Handle server errors
server.on('error', (error) => {
    console.error('❌ Server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down server gracefully...');
    wss.clients.forEach(client => client.close());
    server.close(() => {
        console.log('✅ Server shut down successfully');
        process.exit(0);
    });
});