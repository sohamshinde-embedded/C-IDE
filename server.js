// server.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

require('dotenv').config();
const { exec, execSync, execFile } = require('child_process');
const { GoogleGenAI } = require('@google/genai');

const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const os = require('os');
const pty = require('node-pty');

app.use(cors()); // Allow frontend to fetch data
app.use(express.json()); // Parse JSON requests
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend files from a 'public' folder
const fs = require('fs');

// Initialize the local settings vault
let store = {
    data: {},
    get(key) { return this.data[key]; },
    set(key, val) { this.data[key] = val; }
};

// Use dynamic import for electron-store (ESM)
(async () => {
    try {
        const { default: Store } = await import('electron-store');
        store = new Store();
        console.log("Store initialized successfully.");
    } catch (e) {
        console.warn("electron-store could not be initialized (standalone node environment). Using memory fallback.");
    }
})();

// Helper to get Gemini API Key
function getApiKey() {
    return store.get('gemini_api_key') || process.env.GEMINI_API_KEY;
}

// Helper to extract text from Gemini response safely
function getResponseText(response) {
    // @google/genai SDK exposes response.text as a property, not a function
    let replyText = response.text || "";

    if (!replyText && response.candidates && response.candidates[0] && response.candidates[0].content) {
        replyText = response.candidates[0].content.parts[0].text;
    }
    return replyText;
}

// Route to securely save the user's API Key
app.post('/api/settings/save', (req, res) => {
    const { apiKey } = req.body;
    if (apiKey) {
        store.set('gemini_api_key', apiKey);
        // Also persist to .env file so the key survives server restarts
        try {
            const envPath = path.join(__dirname, '.env');
            let envContent = '';
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
            }
            if (envContent.includes('GEMINI_API_KEY=')) {
                envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${apiKey}`);
            } else {
                envContent += `\nGEMINI_API_KEY=${apiKey}\n`;
            }
            fs.writeFileSync(envPath, envContent);
        } catch (e) {
            console.warn('Could not persist API key to .env file:', e.message);
        }
        res.json({ success: true, message: "API Key saved securely." });
    } else {
        res.status(400).json({ error: "No API key provided." });
    }
});

// Route to check if a key exists
app.get('/api/settings/status', (req, res) => {
    const existingKey = getApiKey();
    res.json({ hasKey: !!existingKey });
});

// Read external problems using require so Vercel includes it automatically
let externalProblems = [];
try {
    externalProblems = require(path.join(__dirname, 'problems.json'));
} catch (e) {
    console.warn("Could not load problems.json", e);
}

// Database of C Practice Problems
const problems = [
    ...externalProblems,
    // If/Else
    { id: 101, title: 'Even or Odd', category: 'If/Else', difficulty: 'Beginner', statement: 'Write a program to check if an input integer is even or odd.', hint: 'Use the modulo operator (%).', output: 'Input: 4 -> Output: Even' },
    { id: 102, title: 'Positive or Negative', category: 'If/Else', difficulty: 'Beginner', statement: 'Check if a number is positive, negative, or zero.', hint: 'Use if-else if-else.', output: 'Input: -5 -> Output: Negative' },
    { id: 103, title: 'Maximum of Two', category: 'If/Else', difficulty: 'Beginner', statement: 'Find the maximum of two numbers.', hint: 'Compare them using >.', output: 'Input: 5 8 -> Output: 8' },
    { id: 104, title: 'Maximum of Three', category: 'If/Else', difficulty: 'Intermediate', statement: 'Find the maximum of three numbers.', hint: 'Use nested if or logical AND.', output: 'Input: 3 9 4 -> Output: 9' },
    { id: 105, title: 'Leap Year Checker', category: 'If/Else', difficulty: 'Intermediate', statement: 'Determine if a given year is a leap year.', hint: 'Divisible by 4, but not 100 unless also divisible by 400.', output: 'Input: 2024 -> Output: Leap Year' },
    { id: 106, title: 'Vowel or Consonant', category: 'If/Else', difficulty: 'Beginner', statement: 'Check if an alphabet is a vowel or consonant.', hint: 'Check against a, e, i, o, u.', output: 'Input: e -> Output: Vowel' },
    { id: 107, title: 'Grade Calculator', category: 'If/Else', difficulty: 'Intermediate', statement: 'Calculate grade (A, B, C, D, F) based on percentage.', hint: 'Use if-else if ladder based on score ranges.', output: 'Input: 85 -> Output: Grade B' },
    { id: 108, title: 'Alphabet Checker', category: 'If/Else', difficulty: 'Beginner', statement: 'Check if a character is an alphabet or not.', hint: 'Compare ASCII ranges or use isalpha().', output: 'Input: 7 -> Output: Not an alphabet' },
    { id: 110, title: 'Triangle Validity', category: 'If/Else', difficulty: 'Intermediate', statement: 'Check if a triangle is valid given its three angles.', hint: 'Sum of angles must be 180 and all angles > 0.', output: 'Input: 60 60 60 -> Output: Valid' },
    { id: 111, title: 'Triangle Type', category: 'If/Else', difficulty: 'Intermediate', statement: 'Check type of triangle given its three sides.', hint: 'Equilateral (all equal), Isosceles (two equal), Scalene (none equal).', output: 'Input: 3 3 5 -> Output: Isosceles' },
    { id: 112, title: 'Profit or Loss', category: 'If/Else', difficulty: 'Intermediate', statement: 'Calculate profit or loss given cost price and selling price.', hint: 'If SP > CP it\'s profit, else loss.', output: 'Input: CP=50 SP=70 -> Output: Profit of 20' },

    // Switch
    { id: 113, title: 'Simple Calculator', category: 'Switch', difficulty: 'Intermediate', statement: 'Create a basic calculator using a switch statement that performs +, -, *, /.', hint: 'Read the operator as a character first, then two numbers.', output: 'Input: + 5 3 -> Output: 8' },
    { id: 114, title: 'Day of Week', category: 'Switch', difficulty: 'Beginner', statement: 'Print the day of the week given a number 1-7.', hint: 'Switch on the number, 1 for Monday, etc.', output: 'Input: 3 -> Output: Wednesday' },
    { id: 115, title: 'Month Days', category: 'Switch', difficulty: 'Beginner', statement: 'Print number of days in a month given its number 1-12.', hint: 'Switch on month number, handle February separately.', output: 'Input: 2 -> Output: 28 or 29' },

    // For Loop
    { id: 116, title: 'Factorial Finder', category: 'For Loop', difficulty: 'Beginner', statement: 'Calculate the factorial of a given positive integer.', hint: 'Initialize a variable to 1 and multiply it by the loop counter.', output: 'Input: 5 -> Output: 120' },
    { id: 117, title: 'Prime Number Checker', category: 'For Loop', difficulty: 'Intermediate', statement: 'Check if a given number is prime or not.', hint: 'Loop from 2 to n/2.', output: 'Input: 7 -> Output: Prime' },
    { id: 118, title: 'Multiplication Table', category: 'For Loop', difficulty: 'Beginner', statement: 'Print the multiplication table of a given number.', hint: 'Loop from 1 to 10.', output: 'Input: 5 -> Output: 5 x 1 = 5...' },

    // While Loop
    { id: 119, title: 'Reverse a Number', category: 'While Loop', difficulty: 'Intermediate', statement: 'Reverse the digits of an integer (e.g., 123 to 321).', hint: 'Use modulo (%) to get the last digit.', output: 'Input: 456 -> Output: 654' },
    { id: 120, title: 'Sum of Digits', category: 'While Loop', difficulty: 'Beginner', statement: 'Calculate the sum of digits of a number.', hint: 'Use modulo 10 and divide by 10.', output: 'Input: 123 -> Output: 6' },

    // Nested Loops
    { id: 121, title: 'Star Pyramid', category: 'Nested Loops', difficulty: 'Advanced', statement: 'Print a right-angled triangle pattern using asterisks (*).', hint: 'Outer loop controls rows, inner loop controls stars per row.', output: '*\n**\n***' },

    // Embedded Logic
    { id: 122, title: 'Bit Masking - Set Bit', category: 'Embedded Logic', difficulty: 'Intermediate', statement: 'Write a C program to set the nth bit of a given 8-bit register value.', hint: 'Use the bitwise OR operator (|) with a left-shifted 1.', output: 'Input: val=0x00, n=3 -> Output: 8' },
    { id: 123, title: 'Bit Masking - Clear Bit', category: 'Embedded Logic', difficulty: 'Intermediate', statement: 'Write a C program to clear the nth bit of a given 8-bit register value.', hint: 'Use the bitwise AND operator (&) with the bitwise NOT (~) of a left-shifted 1.', output: 'Input: val=0xFF, n=0 -> Output: 254' },
    { id: 124, title: 'Register Toggle', category: 'Embedded Logic', difficulty: 'Beginner', statement: 'Write a C program to toggle the 5th bit (simulated LED pin) of a register PORTB.', hint: 'Use the bitwise XOR operator (^).', output: 'Input: PORTB=0x00 -> Output: 32' },
    { id: 125, title: 'Sensor Threshold', category: 'Embedded Logic', difficulty: 'Beginner', statement: 'Read a simulated 16-bit ADC sensor value and print ALARM if it exceeds 1023, else print NORMAL.', hint: 'Use an if condition comparing the variable to 1023.', output: 'Input: adc=1025 -> Output: ALARM' }
];

// API Endpoint to check if GCC is installed
app.get('/api/check-compiler', (req, res) => {
    try {
        const output = execSync('gcc --version', { stdio: 'pipe' }).toString();
        res.json({ installed: true, version: output.split('\n')[0] });
    } catch (e) {
        res.json({ installed: false, error: 'GCC not found' });
    }
});

// API Endpoint to get all problems
app.get('/api/problems', (req, res) => {
    res.json(problems);
});

// API Endpoint to get a daily set (e.g., 10 problems) based on category
app.get('/api/daily', (req, res) => {
    const { category } = req.query;

    let filteredProblems = problems;
    if (category && category !== 'All') {
        filteredProblems = problems.filter(p => p.category === category);
    }

    // Shuffle and pick up to 10
    const shuffled = [...filteredProblems].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);
    res.json(selected);
});

// Helper to get Gemini AI instance
const getAI = () => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

// Retry helper for Gemini API calls with exponential backoff on 429
async function callWithRetry(aiInstance, options, maxRetries = 2) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await aiInstance.models.generateContent(options);
        } catch (error) {
            if (error.status === 429 && attempt < maxRetries) {
                // Parse retryDelay from error if available (e.g. "54s")
                let waitMs = (attempt + 1) * 5000; // default: 5s, 10s
                try {
                    const match = JSON.stringify(error).match(/"retryDelay":\s*"(\d+)s"/);
                    if (match) waitMs = Math.min(parseInt(match[1]) * 1000, 30000);
                } catch (e) {}
                console.log(`Rate limited (429). Retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, waitMs));
            } else {
                throw error;
            }
        }
    }
}

async function simulateExecutionWithAI(code, res) {
    try {
        const aiInstance = getAI();
        if (!aiInstance) {
            return res.json({ output: "Compiler Error: 'gcc' is not available on Vercel's serverless environment, and no GEMINI_API_KEY is configured to simulate execution.", error: true, missingKey: true });
        }
        const prompt = `You are an expert C compiler and code executor. I will provide you with a C program.
Your job is to read the code, analyze its logic, and accurately simulate its standard output as if it were run on a Linux machine.
- If there are syntax errors, provide standard GCC-like compiler error messages.
- If the code has an infinite loop or requires user input that is not provided, print "Execution timed out (infinite loop or waiting for input)".
- Provide ONLY the exact standard output of the execution. DO NOT wrap it in markdown formatting, and DO NOT add any conversational text. Just the raw console output.

Here is the code:
${code}`;

        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });
        
        const replyText = getResponseText(response);
        let outputText = replyText.replace(/^\`\`\`(c|text)?\n/i, '').replace(/\n\`\`\`$/, '').trim();
        return res.json({ output: "[Vercel AI Simulated Output]\n" + outputText, error: false });
    } catch (e) {
        console.error("AI Simulation Error:", e);
        return res.json({ output: "Compiler Error: 'gcc' is not available on Vercel, and the AI simulation fallback failed (possibly high demand). Please try again.", error: true });
    }
}

// API Endpoint to run C code
app.post('/api/run', (req, res) => {
    const { code, input } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    // In Vercel serverless functions, only /tmp/ is writable.
    const uniqueId = Date.now() + '-' + Math.floor(Math.random() * 1000);
    const tmpDir = process.platform === 'win32' ? require('os').tmpdir() : '/tmp';
    const fileName = path.join(tmpDir, `temp_${uniqueId}.c`);
    const exeName = path.join(tmpDir, process.platform === 'win32' ? `temp_${uniqueId}.exe` : `temp_${uniqueId}`);

    try {
        fs.writeFileSync(fileName, code);
    } catch (err) {
        return res.json({ output: 'File system error. Note: Vercel lambda is read-only except /tmp.', error: true });
    }

    // Compile the code
    exec(`gcc "${fileName}" -o "${exeName}"`, (compileErr, compileStdout, compileStderr) => {
        if (compileErr) {
            let errorMsg = compileStderr || compileErr.message;
            if (errorMsg.includes('gcc') && errorMsg.includes('not found')) {
                // Fallback to Gemini AI simulation since gcc is missing (e.g., on Vercel)
                return simulateExecutionWithAI(code, res);
            }
            return res.json({ output: errorMsg, error: true });
        }

        // Run the compiled executable using execFile for more robustness
        const child = execFile(exeName, [], { timeout: 5000 }, (runErr, runStdout, runStderr) => {
            // Cleanup
            try {
                if (fs.existsSync(fileName)) fs.unlinkSync(fileName);
                if (fs.existsSync(exeName)) fs.unlinkSync(exeName);
            } catch (e) {
                console.error("Cleanup error", e);
            }

            if (runErr) {
                if (runErr.killed) {
                    return res.json({ output: 'Execution timed out (possibly waiting for input or infinite loop).', error: true });
                }
                return res.json({ output: runStderr || runErr.message, error: true });
            }

            res.json({ output: runStdout, error: false });
        });

        // Provide input to stdin if available
        if (input && child.stdin) {
            child.stdin.write(input);
            child.stdin.end();
        }
    });
});

// New Native Compilation Route
app.post('/api/compile', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ success: false, error: 'No code provided' });
    }

    // Use unique filenames to avoid race conditions and EPERM locks on Windows
    const uniqueId = Date.now() + '-' + Math.floor(Math.random() * 1000);
    const tmpDir = process.platform === 'win32' ? require('os').tmpdir() : '/tmp';
    const cFile = path.join(tmpDir, `practice_${uniqueId}.c`);
    const exeFile = path.join(tmpDir, process.platform === 'win32' ? `practice_${uniqueId}.exe` : `practice_${uniqueId}`);

    try {
        // 1. Save code to temp file
        fs.writeFileSync(cFile, code);

        // 2. Compile using gcc
        exec(`gcc "${cFile}" -o "${exeFile}"`, (compileError, stdout, stderr) => {
            if (compileError) {
                // Cleanup source file if compilation fails
                try { if (fs.existsSync(cFile)) fs.unlinkSync(cFile); } catch (e) {}
                return res.json({
                    success: false,
                    output: "",
                    error: stderr || compileError.message
                });
            }

            // 3. Execute the compiled program with 3000ms timeout
            // Use execFile for better binary execution handling
            const child = execFile(exeFile, [], { timeout: 3000, killSignal: 'SIGKILL' }, (runError, runStdout, runStderr) => {
                
                // 4. Cleanup: Attempt to delete both files
                // We use a small delay on Windows to ensure file handles are released
                const cleanup = () => {
                    try {
                        if (fs.existsSync(cFile)) fs.unlinkSync(cFile);
                        if (fs.existsSync(exeFile)) fs.unlinkSync(exeFile);
                    } catch (cleanupErr) {
                        // On Windows, sometimes the .exe is still locked for a few ms
                        // We'll just log it; unique filenames prevent this from breaking future runs
                        console.warn("Cleanup warning (non-fatal):", cleanupErr.message);
                    }
                };

                if (process.platform === 'win32') {
                    setTimeout(cleanup, 100);
                } else {
                    cleanup();
                }

                if (runError) {
                    return res.json({
                        success: false,
                        output: runStdout,
                        error: runError.killed ? "Execution timed out (3000ms)" : (runStderr || runError.message)
                    });
                }

                // 5. Success response
                res.json({
                    success: true,
                    output: runStdout,
                    error: runStderr
                });
            });

            // Provide input to stdin if available
            const { input } = req.body;
            if (input && child.stdin) {
                child.stdin.write(input);
                child.stdin.end();
            }
        });
    } catch (err) {
        res.json({
            success: false,
            output: "",
            error: err.message
        });
    }
});

// API Endpoint for AI Chat
app.post('/api/chat', async (req, res) => {
    const { message, code } = req.body;
    const apiKey = getApiKey();

    if (!apiKey) {
        return res.json({ reply: 'Please add your GEMINI_API_KEY to the .env file or settings to enable the AI chat!', missingKey: true });
    }

    const aiInstance = new GoogleGenAI({ apiKey });

    try {
        const prompt = `You are a helpful C programming tutor. The user says: "${message}".\n\nHere is their current code context:\n${code || 'No code provided.'}\n\nProvide a concise and helpful response to debug or explain the concept. Do not provide the full solution immediately, but guide them.`;

        const response = await callWithRetry(aiInstance, {
            model: 'gemini-2.0-flash',
            contents: prompt,
        });

        const replyText = getResponseText(response);
        res.json({ reply: replyText });
    } catch (error) {
        console.error('AI Error:', error);
        let errorMsg = 'Error communicating with AI.';
        if (error.status === 400 || error.message?.includes('API_KEY_INVALID')) {
            errorMsg = 'Invalid API key. Please check your Gemini API key in Settings → AI Configuration.';
        } else if (error.status === 403) {
            errorMsg = 'API key does not have permission. Ensure your key is enabled for the Gemini API at https://aistudio.google.com/apikey';
        } else if (error.status === 429) {
            // Parse the actual wait time from Google's response
            let waitSec = 60;
            try {
                const match = JSON.stringify(error).match(/"retryDelay":\s*"(\d+)s"/);
                if (match) waitSec = parseInt(match[1]);
            } catch (e) {}
            errorMsg = `Rate limit exceeded (free tier). The AI will be available again in ~${waitSec} seconds. You can also upgrade to a paid Gemini API plan for higher limits.`;
        } else if (error.status === 503 || error.message?.includes('overloaded')) {
            errorMsg = 'The AI model is temporarily overloaded. Please try again in a few seconds.';
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorMsg = 'Network error — cannot reach the Gemini API. Check your internet connection.';
        }
        res.json({ reply: errorMsg });
    }
});

// AI Problem Generator Endpoint
app.post('/api/generate-problems', async (req, res) => {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        return res.status(401).json({ error: 'Please configure your Gemini API key in settings.', missingKey: true });
    }

    // Initialize the AI securely with the user's key
    const aiInstance = new GoogleGenAI({ apiKey });

    try {
        const { category, count } = req.body;
        const currentHighestId = problems.length > 0 ? Math.max(...problems.map(p => p.id)) : 0;

        const prompt = `
        You are a C programming instructor. Generate ${count} brand new practice problems for the category: "${category}".
        Focus on logic, algorithms, or embedded systems scenarios.
        Return ONLY a valid JSON array of objects. Do not use markdown blocks like \`\`\`json.
        Each object must have exactly these keys:
        - id: (start counting from ${currentHighestId + 1})
        - title: (a short string)
        - category: "${category}"
        - difficulty: "Beginner" or "Intermediate"
        - statement: (the problem description)
        - hint: (a helpful tip)
        - output: (an example of the expected input/output)
        `;

        let response;
        try {
            response = await callWithRetry(aiInstance, {
                model: 'gemini-2.0-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
        } catch (firstError) {
            console.warn("gemini-2.0-flash failed, falling back to gemini-2.0-flash-lite...", firstError.message);
            response = await callWithRetry(aiInstance, {
                model: 'gemini-2.0-flash-lite',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
        }

        const replyText = getResponseText(response);

        // Clean text and parse JSON safely
        let rawText = replyText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        const newProblems = JSON.parse(rawText);

        problems.push(...newProblems);
        res.json(newProblems);
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Failed to generate problems. The AI model is experiencing high demand. Please try again in a few moments." });
    }
});

// Endpoint to save code locally for terminal execution
app.post('/api/save-code', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }
    // Save to a temp directory so the project root stays clean
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, 'cmentor_solution.c');
    try {
        fs.writeFileSync(filePath, code);
        res.json({ success: true, path: filePath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Setup HTTP and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    let ptyProcess = null;
    const tmpDir = os.tmpdir();
    const cFile = path.join(tmpDir, 'cmentor_solution.c');
    const exeName = process.platform === 'win32' ? 'cmentor_solution.exe' : 'cmentor_solution';
    const exePath = path.join(tmpDir, exeName);

    // Cleanup helper
    function cleanupFiles() {
        try { if (fs.existsSync(cFile)) fs.unlinkSync(cFile); } catch (e) {}
        // Small delay on Windows to release exe file handle
        setTimeout(() => {
            try { if (fs.existsSync(exePath)) fs.unlinkSync(exePath); } catch (e) {}
        }, process.platform === 'win32' ? 200 : 0);
    }

    ws.on('message', (msg) => {
        const msgStr = msg.toString();

        // Only treat as a command if it's a valid JSON object with a "type" field
        let parsed = null;
        try {
            const temp = JSON.parse(msgStr);
            if (temp && typeof temp === 'object' && temp.type) {
                parsed = temp;
            }
        } catch (e) {
            // Not valid JSON — will be treated as stdin below
        }

        if (parsed) {
            if (parsed.type === 'run') {
                // Kill any previously running process
                if (ptyProcess) {
                    try { ptyProcess.kill(); } catch (e) {}
                    ptyProcess = null;
                }

                // Clear terminal and show compiling status
                ws.send('\x1b[2J\x1b[H');
                ws.send('\x1b[33m⏳ Compiling...\x1b[0m\r\n');

                // Step 1: Compile
                try {
                    execSync(`gcc "${cFile}" -o "${exePath}"`, {
                        cwd: tmpDir,
                        stdio: 'pipe'
                    });
                } catch (compileError) {
                    const errText = compileError.stderr
                        ? compileError.stderr.toString()
                        : compileError.message;
                    ws.send('\x1b[31m✗ Compilation Error:\x1b[0m\r\n');
                    ws.send(errText.replace(/\n/g, '\r\n'));
                    ws.send('\r\n');
                    return;
                }

                ws.send('\x1b[32m✓ Compiled successfully\x1b[0m\r\n\r\n');

                // Step 2: Run the executable interactively via node-pty
                ptyProcess = pty.spawn(exePath, [], {
                    name: 'xterm-color',
                    cols: 80,
                    rows: 24,
                    cwd: tmpDir,
                    env: process.env
                });

                ptyProcess.onData((data) => {
                    try { ws.send(data); } catch (e) {}
                });

                ptyProcess.onExit(({ exitCode }) => {
                    try {
                        ws.send(`\r\n\x1b[90m--- Program exited with code ${exitCode} ---\x1b[0m\r\n`);
                    } catch (e) {}
                    ptyProcess = null;
                    cleanupFiles();
                });

            } else if (parsed.type === 'kill') {
                if (ptyProcess) {
                    try { ptyProcess.kill(); } catch (e) {}
                    ptyProcess = null;
                    ws.send('\r\n\x1b[31m⚠ Process terminated\x1b[0m\r\n');
                    cleanupFiles();
                }
            }
        } else {
            // Raw stdin input — forward to the running process
            if (ptyProcess) {
                ptyProcess.write(msgStr);
            }
        }
    });

    ws.on('close', () => {
        if (ptyProcess) {
            try { ptyProcess.kill(); } catch (e) {}
            ptyProcess = null;
        }
        cleanupFiles();
    });
});

// Start the server — always listen when this file is loaded
server.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});

// Vercel Production: Export the app so Vercel can run it "serverless"
module.exports = app;
