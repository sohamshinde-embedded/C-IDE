// server.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

require('dotenv').config();
const { exec, execSync } = require('child_process');
const { GoogleGenAI } = require('@google/genai');

const path = require('path');

app.use(cors()); // Allow frontend to fetch data
app.use(express.json()); // Parse JSON requests
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend files from a 'public' folder
const fs = require('fs');

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
    { id: 109, title: 'Uppercase or Lowercase', category: 'If/Else', difficulty: 'Beginner', statement: 'Check if an alphabet is uppercase or lowercase.', hint: 'Compare with A-Z and a-z.', output: 'Input: G -> Output: Uppercase' },
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

// Initialize Gemini (Moved up so /api/run can use it)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function simulateExecutionWithAI(code, res) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.json({ output: "Compiler Error: 'gcc' is not available on Vercel's serverless environment, and no GEMINI_API_KEY is configured to simulate execution.", error: true });
        }
        const prompt = `You are an expert C compiler and code executor. I will provide you with a C program.
Your job is to read the code, analyze its logic, and accurately simulate its standard output as if it were run on a Linux machine.
- If there are syntax errors, provide standard GCC-like compiler error messages.
- If the code has an infinite loop or requires user input that is not provided, print "Execution timed out (infinite loop or waiting for input)".
- Provide ONLY the exact standard output of the execution. DO NOT wrap it in markdown formatting, and DO NOT add any conversational text. Just the raw console output.

Here is the code:
${code}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        
        let outputText = response.text.replace(/^\`\`\`(c|text)?\n/i, '').replace(/\n\`\`\`$/, '').trim();
        return res.json({ output: "[Vercel AI Simulated Output]\n" + outputText, error: false });
    } catch (e) {
        console.error("AI Simulation Error:", e);
        return res.json({ output: "Compiler Error: 'gcc' is not available on Vercel, and the AI simulation fallback failed (possibly high demand). Please try again.", error: true });
    }
}

// API Endpoint to run C code
app.post('/api/run', (req, res) => {
    const code = req.body.code;
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

        // Run the compiled executable
        exec(`"${exeName}"`, { timeout: 5000 }, (runErr, runStdout, runStderr) => {
            // Cleanup
            try {
                if (fs.existsSync(fileName)) fs.unlinkSync(fileName);
                if (fs.existsSync(exeName)) fs.unlinkSync(exeName);
            } catch (e) {
                console.error("Cleanup error", e);
            }

            if (runErr) {
                if (runErr.killed) {
                    return res.json({ output: 'Execution timed out (infinite loop?)', error: true });
                }
                return res.json({ output: runStderr || runErr.message, error: true });
            }

            res.json({ output: runStdout, error: false });
        });
    });
});

// API Endpoint for AI Chat
app.post('/api/chat', async (req, res) => {
    const { message, code } = req.body;

    if (!process.env.GEMINI_API_KEY) {
        return res.json({ reply: 'Please add your GEMINI_API_KEY to the .env file in the backend directory to enable the AI chat!' });
    }

    try {
        const prompt = `You are a helpful C programming tutor. The user says: "${message}".\n\nHere is their current code context:\n${code || 'No code provided.'}\n\nProvide a concise and helpful response to debug or explain the concept. Do not provide the full solution immediately, but guide them.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        res.json({ reply: response.text });
    } catch (error) {
        console.error('AI Error:', error);
        res.json({ reply: 'Error communicating with AI. Check your API key and network.' });
    }
});

// AI Problem Generator Endpoint
app.post('/api/generate-problems', async (req, res) => {
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server. Please add it to your environment variables.' });
    }

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
            response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
        } catch (firstError) {
            console.warn("gemini-3-flash-preview failed, falling back to gemini-flash-latest...", firstError.message);
            // Fallback to latest stable model if 503 High Demand or similar error
            response = await ai.models.generateContent({
                model: 'gemini-flash-latest',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
        }

        // Clean text and parse JSON safely
        let rawText = response.text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        const newProblems = JSON.parse(rawText);

        problems.push(...newProblems);
        res.json(newProblems);
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Failed to generate problems. The AI model is experiencing high demand. Please try again in a few moments." });
    }
});

// Local Development: Run normally
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Backend server running at http://localhost:${PORT}`);
    });
}

// Vercel Production: Export the app so Vercel can run it "serverless"
module.exports = app;
