/**
 * CMentor Dashboard Core Logic
 * Handles View Switching, Stats, Problem Browser, and IDE State
 */

const views = ['home', 'practice', 'problems'];
const navItems = document.querySelectorAll('.nav-item');
const viewSections = document.querySelectorAll('.view');

// Data state
let allProblems = [];
let currentProblem = null;
let filteredProblems = [];

// Initialize
async function init() {
    setupViewNavigation();
    setupFilters();
    setupGlobalSearch();
    await fetchProblems();
    renderHome();
    checkCompiler();
    checkApiKeyStatus();
}

function setupGlobalSearch() {
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', () => {
            const query = globalSearch.value.toLowerCase();
            if (query.length > 0) {
                filteredProblems = allProblems.filter(p =>
                    p.title.toLowerCase().includes(query) || p.statement.toLowerCase().includes(query)
                );
                switchView('problems');
                renderProblemLibrary();
            } else {
                filteredProblems = [...allProblems];
                renderProblemLibrary();
            }
        });
    }
}

/**
 * VIEW NAVIGATION
 */
function setupViewNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = item.getAttribute('data-view');
            switchView(viewName);
        });
    });

    // Special "Start" buttons
    const startDailyBtn = document.getElementById('start-daily-btn');
    if (startDailyBtn) {
        startDailyBtn.addEventListener('click', () => {
            const unsolved = allProblems.filter(p => !getSolvedIds().includes(p.id));
            if (unsolved.length > 0) {
                const random = unsolved[Math.floor(Math.random() * unsolved.length)];
                loadProblem(random);
            } else {
                switchView('problems');
            }
        });
    }
}

function switchView(viewId) {
    viewSections.forEach(section => {
        section.classList.toggle('hidden', section.id !== `${viewId}-view`);
    });
    navItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === viewId);
    });

    if (viewId === 'home') renderHome();
    if (viewId === 'problems') renderProblemLibrary();
}

/**
 * DATA FETCHING
 */
async function fetchProblems() {
    try {
        const response = await fetch('/api/problems');
        allProblems = await response.json();
        filteredProblems = [...allProblems];
    } catch (error) {
        console.error("Failed to fetch problems:", error);
    }
}

/**
 * HOME VIEW RENDERING
 */
function renderHome() {
    const solvedIds = getSolvedIds();
    document.getElementById('solved-count').textContent = solvedIds.length;
    document.getElementById('total-problems').textContent = allProblems.length;
    
    // Streak (Simplified: just check if any solved today/yesterday)
    document.getElementById('streak-count').textContent = calculateStreak();

    renderCategories();
    renderRecentSolved();
    updateDailyChallenge();
}

function renderCategories() {
    const categoriesGrid = document.getElementById('categories-grid');
    if (!categoriesGrid) return;
    
    const categories = [...new Set(allProblems.map(p => p.category))];
    categoriesGrid.innerHTML = '';

    categories.forEach(cat => {
        const catProblems = allProblems.filter(p => p.category === cat);
        const solvedInCat = catProblems.filter(p => getSolvedIds().includes(p.id)).length;
        const progress = (solvedInCat / catProblems.length) * 100;

        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <h3>${cat}</h3>
            <p>${catProblems.length} Problems</p>
            <div class="category-progress">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <p style="font-size: 11px; margin-top: 8px;">${solvedInCat} Solved</p>
        `;
        card.onclick = () => {
            document.getElementById('categoryFilter').value = cat;
            renderProblemLibrary();
            switchView('problems');
        };
        categoriesGrid.appendChild(card);
    });
}

function renderRecentSolved() {
    const list = document.getElementById('recent-solved-list');
    if (!list) return;
    
    const solvedIds = getSolvedIds().slice(-5).reverse();
    if (solvedIds.length === 0) {
        list.innerHTML = '<li class="empty-msg">No problems solved yet. Start practicing!</li>';
        return;
    }

    list.innerHTML = '';
    solvedIds.forEach(id => {
        const prob = allProblems.find(p => p.id === id);
        if (prob) {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.padding = '10px 0';
            li.style.borderBottom = '1px solid var(--border)';
            li.innerHTML = `
                <span>${prob.title}</span>
                <span class="tag" style="background: rgba(34, 211, 238, 0.1); color: var(--primary); border: none;">${prob.category}</span>
            `;
            li.style.cursor = 'pointer';
            li.onclick = () => loadProblem(prob);
            list.appendChild(li);
        }
    });
}

function updateDailyChallenge() {
    const unsolved = allProblems.filter(p => !getSolvedIds().includes(p.id));
    const dailyTitle = document.getElementById('daily-title');
    const dailyStatement = document.getElementById('daily-statement');
    
    if (unsolved.length > 0) {
        const prob = unsolved[0]; // Just take first unsolved for now
        dailyTitle.textContent = prob.title;
        dailyStatement.textContent = prob.statement.substring(0, 100) + '...';
    } else {
        dailyTitle.textContent = "All Caught Up!";
        dailyStatement.textContent = "You've solved all available problems. Generate more with AI!";
    }
}

/**
 * PROBLEM LIBRARY VIEW
 */
function setupFilters() {
    const search = document.getElementById('problemSearch');
    const catFilter = document.getElementById('categoryFilter');
    const diffFilter = document.getElementById('difficultyFilter');

    const runFilters = () => {
        const query = search.value.toLowerCase();
        const cat = catFilter.value;
        const diff = diffFilter.value;

        filteredProblems = allProblems.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(query) || p.statement.toLowerCase().includes(query);
            const matchesCat = cat === 'All' || p.category === cat;
            const matchesDiff = diff === 'All' || p.difficulty === diff;
            return matchesSearch && matchesCat && matchesDiff;
        });
        renderProblemLibrary();
    };

    search.addEventListener('input', runFilters);
    catFilter.addEventListener('change', runFilters);
    diffFilter.addEventListener('change', runFilters);
}

function renderProblemLibrary() {
    const body = document.getElementById('problems-body');
    if (!body) return;

    // Update Problem Library banner stats
    const categories = [...new Set(allProblems.map(p => p.category))];
    const metaLessons = document.getElementById('meta-lessons');
    const metaProblems = document.getElementById('meta-problems');
    if (metaLessons) metaLessons.textContent = categories.length;
    if (metaProblems) metaProblems.textContent = allProblems.length;

    // Update course progress bar
    const solvedIds = getSolvedIds();
    const progressPct = allProblems.length > 0 ? Math.round((solvedIds.length / allProblems.length) * 100) : 0;
    const progressFill = document.getElementById('course-progress-fill');
    const progressText = document.getElementById('course-progress-text');
    if (progressFill) progressFill.style.width = progressPct + '%';
    if (progressText) progressText.textContent = progressPct + '% Completed';
    
    body.innerHTML = '';

    filteredProblems.forEach(prob => {
        const isSolved = solvedIds.includes(prob.id);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="status-icon ${isSolved ? 'solved' : ''}">${isSolved ? '✓' : '○'}</td>
            <td style="font-weight: 600;">${prob.title}</td>
            <td><span class="tag">${prob.category}</span></td>
            <td><span class="difficulty-tag ${prob.difficulty.toLowerCase()}">${prob.difficulty}</span></td>
            <td><button class="btn btn-small" onclick="event.stopPropagation(); loadProblemById(${prob.id})">Solve</button></td>
        `;
        tr.onclick = () => loadProblem(prob);
        body.appendChild(tr);
    });
}

window.loadProblemById = function(id) {
    const prob = allProblems.find(p => p.id === id);
    if (prob) loadProblem(prob);
};

/**
 * PRACTICE (IDE) VIEW
 */
function loadProblem(prob) {
    currentProblem = prob;
    switchView('practice');

    document.getElementById('detail-title').textContent = prob.title;
    document.getElementById('detail-category').textContent = prob.category;
    document.getElementById('detail-difficulty').textContent = prob.difficulty;
    document.getElementById('detail-difficulty').className = `tag difficulty-tag ${prob.difficulty.toLowerCase()}`;
    document.getElementById('detail-statement').textContent = prob.statement;
    document.getElementById('detail-hint').innerHTML = `<strong>Hint:</strong> <pre><code class="language-c">${prob.hint}</code></pre>`;
    document.getElementById('detail-output').innerHTML = `<strong>Expected Output:</strong> <pre><code class="language-c">${prob.output}</code></pre>`;

    // Update Mark as Solved button
    const solveBtn = document.getElementById('solve-mark-btn');
    const isSolved = getSolvedIds().includes(prob.id);
    solveBtn.textContent = isSolved ? 'Unmark as Solved' : 'Mark as Solved';
    solveBtn.onclick = () => toggleSolved(prob.id);

    // Initial code if editor is empty
    if (!document.getElementById('code-editor').value.trim()) {
        document.getElementById('code-editor').value = `#include <stdio.h>\n\nint main() {\n    // Problem: ${prob.title}\n    \n    return 0;\n}`;
    }

    if (window.Prism) Prism.highlightAll();
}

function toggleSolved(id) {
    let solvedIds = getSolvedIds();
    const wasSolved = solvedIds.includes(id);
    if (wasSolved) {
        solvedIds = solvedIds.filter(i => i !== id);
    } else {
        solvedIds.push(id);
        // Record today's date as a solve date for streak tracking
        recordSolveDate();
    }
    localStorage.setItem('solvedProblems', JSON.stringify(solvedIds));
    
    // Update UI
    const solveBtn = document.getElementById('solve-mark-btn');
    const isSolved = solvedIds.includes(id);
    solveBtn.textContent = isSolved ? 'Unmark as Solved' : 'Mark as Solved';
    
    // Refresh background data if home is visible
    renderHome();
}

// Navigation within IDE
document.getElementById('next-prob-btn').addEventListener('click', () => {
    const index = allProblems.findIndex(p => p.id === currentProblem.id);
    if (index < allProblems.length - 1) loadProblem(allProblems[index + 1]);
});

document.getElementById('prev-prob-btn').addEventListener('click', () => {
    const index = allProblems.findIndex(p => p.id === currentProblem.id);
    if (index > 0) loadProblem(allProblems[index - 1]);
});

document.getElementById('reset-code-btn').addEventListener('click', () => {
    if (confirm("Reset code to default template?")) {
        document.getElementById('code-editor').value = `#include <stdio.h>\n\nint main() {\n    // Problem: ${currentProblem.title}\n    \n    return 0;\n}`;
    }
});

/**
 * HELPERS & STORAGE
 */
function getSolvedIds() {
    return JSON.parse(localStorage.getItem('solvedProblems')) || [];
}

/**
 * Records today's date in localStorage so streak can be calculated.
 * Stored as a sorted array of unique date strings (YYYY-MM-DD).
 */
function recordSolveDate() {
    const today = new Date().toISOString().split('T')[0]; // e.g. "2026-06-08"
    let dates = JSON.parse(localStorage.getItem('solveDates')) || [];
    if (!dates.includes(today)) {
        dates.push(today);
        dates.sort();
        localStorage.setItem('solveDates', JSON.stringify(dates));
    }
}

/**
 * Calculates the current streak: consecutive days (up to today or yesterday)
 * on which at least one problem was solved.
 */
function calculateStreak() {
    const dates = JSON.parse(localStorage.getItem('solveDates')) || [];
    if (dates.length === 0) return 0;

    // Build a Set of date strings for O(1) lookup
    const dateSet = new Set(dates);

    // Start from today; if today isn't in the set, try yesterday
    // (so the streak doesn't break mid-day before you've solved one)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    let checkDate = new Date(today);
    if (!dateSet.has(todayStr)) {
        // Allow streak to persist if last solve was yesterday
        checkDate.setDate(checkDate.getDate() - 1);
        if (!dateSet.has(checkDate.toISOString().split('T')[0])) {
            return 0; // No solve today or yesterday — streak is broken
        }
    }

    // Count consecutive days backward
    let streak = 0;
    while (dateSet.has(checkDate.toISOString().split('T')[0])) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
}

window.toggleVisibility = function(id) {
    const el = document.getElementById(id);
    el.style.display = (el.style.display === 'block') ? 'none' : 'block';
};

/**
 * COMPILER & RUN LOGIC (Migrated from original)
 */
const runBtn = document.getElementById('runBtn');
const codeEditor = document.getElementById('code-editor');
const stdinInput = document.getElementById('stdin-input');
const consoleOutput = document.getElementById('console-output');

runBtn.addEventListener('click', async () => {
    const code = codeEditor.value;
    const input = stdinInput ? stdinInput.value : '';
    consoleOutput.textContent = 'Compiling and running...';
    consoleOutput.style.color = 'var(--accent)';
    
    try {
        const response = await fetch('/api/compile', {
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

        // Handle the /api/compile response format { success, output, error }
        if (data.success) {
            consoleOutput.style.color = '#4ade80';
            consoleOutput.textContent = data.output || 'Execution completed with no output.';
        } else {
            consoleOutput.style.color = '#f87171';
            consoleOutput.textContent = data.error || 'Unknown error occurred.';
            if (data.output) {
                consoleOutput.textContent += '\n\nPartial Output:\n' + data.output;
            }
        }
    } catch (err) {
        consoleOutput.style.color = '#f87171';
        consoleOutput.textContent = 'Failed to connect to backend for execution.';
    }
});

// Settings Dropdown and Modal Logic
const settingsTrigger = document.getElementById('settings-trigger');
const settingsDropdown = document.getElementById('settings-dropdown');
const settingsOverlay = document.getElementById('settings-overlay');
const aiSection = document.getElementById('ai-settings-section');
const systemSection = document.getElementById('system-settings-section');

if (settingsTrigger) {
    settingsTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsDropdown.classList.toggle('hidden');
    });
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (settingsDropdown && !settingsDropdown.contains(e.target) && e.target !== settingsTrigger) {
        settingsDropdown.classList.add('hidden');
    }
});

document.getElementById('open-system-settings').addEventListener('click', () => {
    openSettings('system');
});

document.getElementById('open-ai-settings').addEventListener('click', () => {
    openSettings('ai');
});

function openSettings(tab = 'all') {
    settingsDropdown.classList.add('hidden');
    settingsOverlay.classList.remove('hidden');
    
    if (tab === 'ai') {
        aiSection.style.display = 'block';
        systemSection.style.display = 'none';
        document.getElementById('settings-modal-title').textContent = '⚙️ AI Configuration';
    } else if (tab === 'system') {
        aiSection.style.display = 'none';
        systemSection.style.display = 'block';
        document.getElementById('settings-modal-title').textContent = '⚙️ System Settings';
        checkCompilerStatusInModal();
    } else {
        aiSection.style.display = 'block';
        systemSection.style.display = 'block';
        document.getElementById('settings-modal-title').textContent = '⚙️ Settings';
    }
}

async function checkCompilerStatusInModal() {
    const msg = document.getElementById('compiler-status-msg');
    try {
        const response = await fetch('/api/check-compiler');
        const data = await response.json();
        if (data.installed) {
            msg.innerHTML = `🟢 Compiler: Found (${data.version})<br><span style="font-size: 11px; color: var(--success);">System is ready for local execution.</span>`;
        } else {
            msg.innerHTML = `🔴 Compiler: Not Found<br><span style="font-size: 11px; color: var(--advanced);">Please install GCC to run code locally.</span>`;
        }
    } catch (e) {
        msg.textContent = "Error checking compiler status.";
    }
}

window.closeSettings = function() {
    settingsOverlay.classList.add('hidden');
};

// AI Settings & Chat (Migrated and adapted)
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
            alert("API Key Saved Successfully!");
            closeSettings();
            checkApiKeyStatus();
        }
    } catch (err) {
        alert("Failed to save API key.");
    }
};

window.closeSettings = function() {
    document.getElementById('settings-overlay').classList.add('hidden');
};

async function checkApiKeyStatus() {
    try {
        const response = await fetch('/api/settings/status');
        const data = await response.json();
        const input = document.getElementById('apiKeyInput');
        if (data.hasKey) input.placeholder = "Key is set (••••••••••••)";
    } catch (e) {}
}

async function checkCompiler() {
    try {
        const response = await fetch('/api/check-compiler');
        const data = await response.json();
        if (data.installed) {
            document.getElementById('compiler-badge').classList.remove('hidden');
        } else {
            document.getElementById('setup-overlay').classList.remove('hidden');
        }
    } catch (e) {}
}

/**
 * CHAT WIDGET (Migrated)
 */
const chatWidget = document.getElementById('chat-widget');
const chatHeader = document.getElementById('chat-header');
const chatBody = document.getElementById('chat-body');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

chatHeader.addEventListener('click', () => {
    chatWidget.classList.toggle('collapsed');
    chatHeader.querySelector('.toggle-icon').textContent = chatWidget.classList.contains('collapsed') ? '▲' : '▼';
});

// Basic markdown-to-HTML renderer for chat messages
function renderMarkdown(text) {
    let html = text
        // Escape HTML to prevent XSS
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // Code blocks: ```lang\n...\n```
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="chat-code-block"><code>$2</code></pre>')
        // Inline code: `code`
        .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')
        // Bold: **text**
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic: *text*
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>');
    return html;
}

async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message user-msg';
    userMsg.textContent = message;
    chatBody.appendChild(userMsg);
    chatInput.value = '';
    
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'chat-message ai-msg';
    loadingMsg.textContent = 'Thinking...';
    chatBody.appendChild(loadingMsg);
    chatBody.scrollTop = chatBody.scrollHeight;
    
    chatSend.disabled = true;
    chatInput.disabled = true;
    chatSend.textContent = '...';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, code: codeEditor.value })
        });
        const data = await response.json();

        if (data.missingKey) {
            loadingMsg.innerHTML = '🔑 ' + renderMarkdown(data.reply) + '<br><button class="btn btn-small btn-primary" style="margin-top:8px;" onclick="openSettings(\'ai\')">Open Settings</button>';
        } else {
            loadingMsg.innerHTML = renderMarkdown(data.reply || 'Error from AI');
        }
    } catch (error) {
        loadingMsg.textContent = 'Error connecting to AI. Is the server running?';
    } finally {
        chatSend.disabled = false;
        chatInput.disabled = false;
        chatSend.textContent = 'Send';
        chatInput.focus();
    }
    chatBody.scrollTop = chatBody.scrollHeight;
}

chatSend.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });

// Problem Generation Logic — wire up the AI Generate button in the Problem Library
const aiGenerateBtn = document.getElementById('ai-generate-btn');
if (aiGenerateBtn) {
    aiGenerateBtn.addEventListener('click', () => {
        document.getElementById('generate-overlay').classList.remove('hidden');
    });
}

// Called by the "Generate" button inside the AI Generate modal (onclick in HTML)
window.submitGenerateProblems = async function() {
    const category = document.getElementById('gen-category').value;
    const count = parseInt(document.getElementById('gen-count').value) || 3;
    const submitBtn = document.getElementById('gen-submit-btn');

    submitBtn.textContent = 'Generating...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/generate-problems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, count })
        });
        const data = await response.json();
        if (response.ok && Array.isArray(data)) {
            allProblems.push(...data);
            filteredProblems = [...allProblems];
            renderProblemLibrary();
            renderHome();
            document.getElementById('generate-overlay').classList.add('hidden');
            showToast(`✨ Generated ${data.length} new problems!`);
        } else {
            showToast(data.error || 'Failed to generate problems.', 'error');
        }
    } catch (e) {
        showToast('Failed to generate problems. Check your connection.', 'error');
    }

    submitBtn.textContent = 'Generate';
    submitBtn.disabled = false;
};

// Simple toast notification helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) { alert(message); return; }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = 'padding:12px 20px; margin-bottom:8px; border-radius:8px; font-size:13px; font-weight:500; color:#fff; animation: fadeIn 0.3s ease;';
    toast.style.background = type === 'error' ? '#ef4444' : '#22c55e';
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Run Init
init();