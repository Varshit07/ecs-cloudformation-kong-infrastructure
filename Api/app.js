const { response } = require('express');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (request, response) => {
    return response.status(200).json({
        message: "Hello, World!",
    });
});

app.get('/api1', (request, response) => {
    return response.status(200).json({
        message: "Hello from API1 😀",
    });
});

app.get('/api2', (request, response) => {
    return response.status(200).json({
        message: "Hello from API2 😀",
    });
});

app.get('/api3', (request, response) => {
    return response.status(200).json({
        message: "Hello from API3 😀",
    });
});

app.use((request, response, next) => {
    return response.status(404).json({
        error: "Not Found 😟",
    });
});

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});