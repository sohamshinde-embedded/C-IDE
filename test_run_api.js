
async function testRun() {
    const code = '#include <stdio.h>\nint main() { printf("Hello from /api/run!\\n"); return 0; }';
    try {
        console.log("Testing /api/run...");
        const response = await fetch('http://localhost:3000/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await response.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error:", error.message);
    }
}
testRun();
