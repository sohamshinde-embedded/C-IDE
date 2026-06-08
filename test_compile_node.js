const http = require('http');

const data = JSON.stringify({
    code: '#include <stdio.h>\nint main() { printf("Hello from internal test!\\n"); return 0; }'
});

const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/compile',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => {
        responseBody += chunk;
    });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Body:', responseBody);
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
    process.exit(1);
});

req.write(data);
req.end();
