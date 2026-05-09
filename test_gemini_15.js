require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
    try {
        const prompt = `
        You are a C programming instructor. Generate 1 brand new practice problem for the category: "If/Else".
        Focus on logic, algorithms, or embedded systems scenarios.
        Return ONLY a valid JSON array of objects. Do not use markdown blocks like \`\`\`json.
        Each object must have exactly these keys:
        - id: 1
        - title: "Test"
        - category: "If/Else"
        - difficulty: "Beginner"
        - statement: "Desc"
        - hint: "Hint"
        - output: "Out"
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        console.log("Response:", response.text);
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
