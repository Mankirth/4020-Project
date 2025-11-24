// ============================================
// CLIENT-SIDE ROUTING & CHARTS (Integrated with Unified WebSocket)
// ============================================

const pages = ['home', 'about', 'education', 'experience', 'project'];

// -----------------------------
// Hash-based Routing
// -----------------------------
function navigate(hash) {
    const page = hash.replace('#/', '') || 'home';

    if (!pages.includes(page)) {
        console.warn(`Page "${page}" not found. Redirecting to home.`);
        window.location.hash = '#/';
        return;
    }

    // Hide all pages
    pages.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.classList.remove('active');
    });

    // Show requested page
    const targetEl = document.getElementById(page);
    if (targetEl) targetEl.classList.add('active');

    // Update URL hash
    if (window.location.hash !== hash) window.location.hash = hash;

    // Smooth scroll
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Refresh charts if home
    if (page === 'home') fetchResultsAndUpdateCharts();
}

window.addEventListener('hashchange', () => navigate(window.location.hash));

// -----------------------------
// Charts Setup
// -----------------------------
let accuracyChart, responseChart;

function initCharts() {
    const ctxAcc = document.getElementById('accuracyChart').getContext('2d');
    accuracyChart = new Chart(ctxAcc, {
        type: 'bar',
        data: {
            labels: ['Computer Security', 'Prehistory', 'Sociology'],
            datasets: [{
                label: 'Accuracy (%)',
                data: [0, 0, 0],
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c']
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
    });

    const ctxResp = document.getElementById('responseChart').getContext('2d');
    responseChart = new Chart(ctxResp, {
        type: 'bar',
        data: {
            labels: ['Computer Security', 'Prehistory', 'Sociology'],
            datasets: [{
                label: 'Average Response Time (ms)',
                data: [0, 0, 0],
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c']
            }]
        },
        options: { responsive: true }
    });
}

// -----------------------------
// Fetch results from backend
// -----------------------------
async function fetchResultsAndUpdateCharts() {
    try {
        const res = await fetch('/api/results');
        const data = await res.json();

        const results = {
            computer_security: { accuracy: parseFloat(data.computer_security.accuracy), avgTime: parseFloat(data.computer_security.avgTime) },
            prehistory: { accuracy: parseFloat(data.prehistory.accuracy), avgTime: parseFloat(data.prehistory.avgTime) },
            sociology: { accuracy: parseFloat(data.sociology.accuracy), avgTime: parseFloat(data.sociology.avgTime) }
        };

        // Update chart data
        accuracyChart.data.datasets[0].data = [
            results.computer_security.accuracy,
            results.prehistory.accuracy,
            results.sociology.accuracy
        ];
        responseChart.data.datasets[0].data = [
            results.computer_security.avgTime,
            results.prehistory.avgTime,
            results.sociology.avgTime
        ];

        accuracyChart.update();
        responseChart.update();
    } catch (err) {
        console.error('❌ Failed to fetch or parse results:', err);
    }
}

// -----------------------------
// Reset button
// -----------------------------
document.getElementById('resetSessionBtn').addEventListener('click', async () => {
    try {
        const res = await fetch('/api/reset', { method: 'POST' });
        const data = await res.json();
        if (data.status === 'reset') {
            accuracyChart.data.datasets[0].data = [0, 0, 0];
            responseChart.data.datasets[0].data = [0, 0, 0];
            accuracyChart.update();
            responseChart.update();
            alert('Session reset! You can now run /api/run for fresh results.');
        }
    } catch (err) {
        console.error('❌ Failed to reset session:', err);
    }
});

// -----------------------------
// Page Load
// -----------------------------
window.addEventListener('load', () => {
    initCharts();
    const initialHash = window.location.hash || '#/';
    navigate(initialHash);
    console.log('Routing & charts initialized');
});
