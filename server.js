const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3000;
const API_URL = 'https://apipoliciadev.azurewebsites.net/';

// Sirve los archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Proxy para las peticiones a la API
// Todas las llamadas desde el frontend hacia /api/... serán redirigidas al backend C#
// Esto engaña al navegador y evita por completo el error de CORS,
// ya que el frontend y el proxy están en el mismo origen (localhost:3000).
// Proxy para las peticiones a la API
// v3.0.0 Syntax: Usamos pathFilter para que NO elimine el prefijo /api
app.use(createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
    secure: false,
    pathFilter: '/api',
}));

app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 Frontend Dashboard corriendo en http://localhost:${PORT}`);
    console.log(`🔌 Proxy conectado hacia el backend en ${API_URL}`);
    console.log(`===============================================`);
});