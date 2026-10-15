const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // Remove o prefixo /api
      },
      // Aumenta o limite de tamanho dos cabeçalhos
      onProxyReq: function (proxyReq, req, res) {
        proxyReq.setHeader('Connection', 'keep-alive');

        // Se o método for POST e não houver Content-Type, define como application/json
        if (req.method === 'POST' && !req.headers['content-type']) {
          proxyReq.setHeader('Content-Type', 'application/json');
        }
      },
      logLevel: 'debug', // Para ajudar na depuração
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(
          JSON.stringify({
            message:
              'Erro de proxy ao tentar se conectar ao backend. Verifique se o servidor está rodando.',
            error: err.message,
          }),
        );
      },
    }),
  );
};
