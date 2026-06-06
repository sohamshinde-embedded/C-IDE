const dashboard = document.getElementById('dashboard');
const categoryFilter = document.getElementById('categoryFilter');
const dailyBtn = document.getElementById('dailyMenuBtn');

let allProblems = [];

// Fetch all problems on load
async function fetchProblems() {
    try {
        const response = await fetch('/api/problems');
        allProblems = await response.json();
        renderProblems(allProblems);
    } catch (error) {
        console.error("Failed to fetch problems:", error);
        dashboard.innerHTML = '<p>Error loading problems. Ensure backend is running.</p>';
    }
}

// LocalStorage helpers
function getSolvedIds() {
    return JSON.parse(localStorage.getItem('solvedProblems')) || [];
}

window.markAsSolved = function(id) {
    let solvedIds = getSolvedIds();
    const card = document.getElementById(`card-${id}`);
    const btn = card ? card.querySelector('.mark-btn') : null;

    if (!solvedIds.includes(id)) {
        solvedIds.push(id);
        if (card) card.classList.add('solved');
        if (btn) btn.textContent = 'Unmark as Solved';
    } else {
        solvedIds = solvedIds.filter(i => i !== id);
        if (card) card.classList.remove('solved');
        if (btn) btn.textContent = 'Mark as Solved';
    }
    localStorage.setItem('solvedProblems', JSON.stringify(solvedIds));
};

// Fetch a random daily set based on the selected category
async function fetchDailySet() {
    try {
        const currentCategory = categoryFilter.value;
        let filteredProblems = allProblems;
        
        if (currentCategory !== 'All') {
            filteredProblems = allProblems.filter(p => p.category === currentCategory);
        }
        
        const solvedIds = getSolvedIds();
        const unsolvedProblems = filteredProblems.filter(p => !solvedIds.includes(p.id));
        
        // Shuffle and pick up to 10
        const shuffled = [...unsolvedProblems].sort(() => 0.5 - Math.random());
        const dailySet = shuffled.slice(0, 10);
        
        renderProblems(dailySet);
    } catch (error) {
        console.error("Failed to fetch daily set:", error);
    }
}

// Render cards to the DOM
function renderProblems(problems) {
    dashboard.innerHTML = ''; // Clear current

    if (problems.length === 0) {
        dashboard.innerHTML = '<p>No unsolved problems found for this category.</p>';
        return;
    }

    const solvedIds = getSolvedIds();

    problems.forEach(prob => {
        const isSolved = solvedIds.includes(prob.id);
        const card = document.createElement('div');
        card.id = `card-${prob.id}`;
        card.className = `card ${isSolved ? 'solved' : ''}`;
        card.innerHTML = `
            <div class="tags">
                <span class="tag">${prob.category}</span>
                <span class="tag">${prob.difficulty}</span>
                <span class="solved-badge">✓ Solved</span>
            </div>
            <h3>${prob.title}</h3>
            <p>${prob.statement}</p>
            
            <button class="toggle-btn" onclick="toggleVisibility('hint-${prob.id}')">Show Hint</button>
            <button class="toggle-btn" onclick="toggleVisibility('output-${prob.id}')">Show Output</button>
            <button class="mark-btn" onclick="markAsSolved(${prob.id})">${isSolved ? 'Unmark as Solved' : 'Mark as Solved'}</button>
            
            <div id="hint-${prob.id}" class="hidden-content"><strong>Hint:</strong> <pre><code class="language-c">${prob.hint}</code></pre></div>
            <div id="output-${prob.id}" class="hidden-content"><strong>Expected Output:</strong> <pre><code class="language-c">${prob.output}</code></pre></div>
        `;
        dashboard.appendChild(card);
    });

    if (window.Prism) {
        Prism.highlightAllUnder(dashboard);
    }
}

// Helper to toggle hints/outputs
window.toggleVisibility = function (id) {
    const el = document.getElementById(id);
    if (el.style.display === 'block') {
        el.style.display = 'none';
    } else {
        el.style.display = 'block';
    }
};

// Event Listeners
categoryFilter.addEventListener('change', (e) => {
    const category = e.target.value;
    if (category === 'All') {
        renderProblems(allProblems);
    } else {
        const filtered = allProblems.filter(p => p.category === category);
        renderProblems(filtered);
    }
});

dailyBtn.addEventListener('click', fetchDailySet);

const aiGenerateBtn = document.getElementById('aiGenerateMenuBtn');
aiGenerateBtn.addEventListener('click', async () => {
    const category = categoryFilter.value;
    if (category === 'All') {
        alert("Please select a specific category from the dropdown to generate new problems for.");
        return;
    }
    
    aiGenerateBtn.textContent = 'Generating...';
    aiGenerateBtn.disabled = true;
    
    try {
        const response = await fetch('/api/generate-problems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, count: 2 })
        });
        
        const data = await response.json();

        if (response.status === 401 || data.missingKey) {
            openSettings('Please enter an API Key to use AI features.');
            aiGenerateBtn.textContent = 'AI: New Problems';
            aiGenerateBtn.disabled = false;
            return;
        }

        if (response.ok) {
            allProblems.push(...data);
            const filtered = allProblems.filter(p => p.category === category);
            renderProblems(filtered);
        } else {
            alert(data.error || 'Failed to generate problems. Check backend logs.');
        }
    } catch (error) {
        console.error("Generate error:", error);
        alert('Error connecting to backend.');
    }
    
    aiGenerateBtn.textContent = 'AI: New Problems';
    aiGenerateBtn.disabled = false;
});

// Settings Modal Logic
window.saveApiKey = async function() {
    const key = document.getElementById('apiKeyInput').value;
    if (!key) return alert("Please enter a key!");

    try {
        const response = await fetch('/api/settings/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: key })
        });
        
        if (response.ok) {
            alert("API Key Saved Successfully! AI features are now unlocked.");
            closeSettings();
            document.getElementById('apiKeyInput').value = ''; // Clear for security
            checkApiKeyStatus(); // Refresh placeholder
        } else {
            const data = await response.json();
            alert("Error saving API Key: " + (data.error || "Check backend logs."));
        }
    } catch (err) {
        alert("Failed to connect to backend to save API key.");
    }
};

window.closeSettings = function() {
    document.getElementById('settings-overlay').classList.add('hidden');
};

// Initialize
fetchProblems();
checkCompiler();
checkApiKeyStatus();

async function checkApiKeyStatus() {
    try {
        const response = await fetch('/api/settings/status');
        const data = await response.json();
        const apiKeyInput = document.getElementById('apiKeyInput');
        if (data.hasKey) {
            apiKeyInput.placeholder = "Key is set (••••••••••••)";
        } else {
            apiKeyInput.placeholder = "AIzaSy...";
        }
    } catch (error) {
        console.error("Failed to check API key status:", error);
    }
}

// Check Compiler Status
async function checkCompiler() {
    try {
        const response = await fetch('/api/check-compiler');
        const data = await response.json();
        
        const setupOverlay = document.getElementById('setup-overlay');
        const compilerBadge = document.getElementById('compiler-badge');
        const runBtn = document.getElementById('runBtn');
        
        if (data.installed) {
            setupOverlay.classList.add('hidden');
            compilerBadge.classList.remove('hidden');
            runBtn.disabled = false;
            compilerBadge.title = `Found: ${data.version}`;
        } else {
            setupOverlay.classList.remove('hidden');
            compilerBadge.classList.add('hidden');
            runBtn.disabled = true;
        }
    } catch (error) {
        console.error("Failed to check compiler:", error);
    }
}

// --- IDE Logic ---
const runBtn = document.getElementById('runBtn');
const codeEditor = document.getElementById('code-editor');
const stdinInput = document.getElementById('stdin-input');
const consoleOutput = document.getElementById('console-output');

runBtn.addEventListener('click', async () => {
    const code = codeEditor.value;
    const input = stdinInput ? stdinInput.value : '';
    consoleOutput.textContent = 'Compiling and running...';
    
    try {
        const response = await fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, input })
        });
        const data = await response.json();
        
        if (data.missingKey) {
            openSettings('Please enter an API Key to use AI simulation.');
            consoleOutput.textContent = 'AI Simulation requires an API Key.';
            return;
        }

        if (data.error) {
            consoleOutput.style.color = '#ff5555'; // Error red
        } else {
            consoleOutput.style.color = '#a6e22e'; // Success green
        }
        consoleOutput.textContent = data.output || 'No output.';
    } catch (err) {
        consoleOutput.style.color = '#ff5555';
        consoleOutput.textContent = 'Failed to connect to backend for execution.';
    }
});

function openSettings(message = '') {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        const status = document.getElementById('settings-status');
        if (status) {
            status.textContent = message;
            status.style.display = message ? 'block' : 'none';
        }
    }
}

// --- Chat Widget Logic ---
const chatWidget = document.getElementById('chat-widget');
const chatHeader = document.getElementById('chat-header');
const chatBody = document.getElementById('chat-body');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

chatHeader.addEventListener('click', () => {
    chatWidget.classList.toggle('collapsed');
    const icon = chatHeader.querySelector('.toggle-icon');
    icon.textContent = chatWidget.classList.contains('collapsed') ? '▲' : '▼';
});

async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add User Message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message user-msg';
    userMsg.textContent = message;
    chatBody.appendChild(userMsg);
    chatInput.value = '';
    
    // Add Loading
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'chat-message ai-msg';
    loadingMsg.textContent = 'Thinking...';
    chatBody.appendChild(loadingMsg);
    chatBody.scrollTop = chatBody.scrollHeight;
    
    try {
        const code = codeEditor.value;
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, code })
        });
        const data = await response.json();
        
        if (data.reply) {
            loadingMsg.textContent = data.reply;
        } else {
            loadingMsg.textContent = 'Error from backend';
            console.error('Error from backend');
        }
    } catch (error) {
        console.error('Network error:', error);
        loadingMsg.textContent = 'Error connecting to AI backend.';
    }
    chatBody.scrollTop = chatBody.scrollHeight;
}

chatSend.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});