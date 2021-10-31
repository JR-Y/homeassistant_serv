const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        '/api',
        createProxyMiddleware({
            target: 'http://localhost:9467',
            changeOrigin: true,
        })
    );
    app.use(
        '/socket.io',
        createProxyMiddleware({
            target: 'ws://localhost:9467',
            ws: true,
            changeOrigin: true,
        })
    );
};