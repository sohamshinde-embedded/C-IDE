const axios = require('axios');

async function testCompile() {
    const code = `
#include <stdio.h>
int main() {
    printf("Hello from /api/compile!\\n");
    return 0;
}
    `;

    try {
        const response = await axios.post('http://localhost:3000/api/compile', { code });
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testCompile();
