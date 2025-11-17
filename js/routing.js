// ============================================
// CLIENT-SIDE ROUTING MODULE
// ============================================

const pages = ['home', 'about', 'education', 'experience', 'project'];

/**
 * Navigate to a specific page using hash-based routing
 * @param {string} hash - The hash to navigate to (e.g., '#/about', '#/')
 */
function navigate(hash) {
    const page = hash.replace('#/', '') || 'home';
    
    // Validate page exists
    if (!pages.includes(page)) {
        console.warn(`Page "${page}" not found. Redirecting to home.`);
        navigate('#/');
        return;
    }
    
    // Hide all pages
    pages.forEach(p => {
        const element = document.getElementById(p);
        if (element) {
            element.classList.remove('active');
        }
    });
    
    // Show requested page
    const targetElement = document.getElementById(page);
    if (targetElement) {
        targetElement.classList.add('active');
        console.log(`Navigated to: ${page}`);
    }
    
    // Update URL hash (only if different)
    if (window.location.hash !== hash) {
        window.location.hash = hash;
    }
}

/**
 * Handle hash change events (browser back/forward buttons)
 */
window.addEventListener('hashchange', () => {
    navigate(window.location.hash);
});

/**
 * Initialize routing on page load
 */
window.addEventListener('load', () => {
    const initialHash = window.location.hash || '#/';
    navigate(initialHash);
    console.log('Routing initialized');
});

/**
 * Smooth scroll to top when navigating
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Scroll to top when page changes
window.addEventListener('hashchange', scrollToTop);
