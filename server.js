import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Proxy for the lightweight telemetry feed
app.use('/api', createProxyMiddleware({
  target: 'https://data-cloud.flightradar24.com',
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  secure: false,
  onProxyReq: (proxyReq) => {
    proxyReq.removeHeader('Origin');
    proxyReq.removeHeader('Referer');
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    proxyReq.setHeader('Accept', 'application/json');
  }
}));

// Proxy for the detailed clickhandler (ETA and Departure times)
app.use('/api-live', createProxyMiddleware({
  target: 'https://data-live.flightradar24.com',
  changeOrigin: true,
  pathRewrite: { '^/api-live': '' },
  secure: false,
  onProxyReq: (proxyReq) => {
    proxyReq.removeHeader('Origin');
    proxyReq.removeHeader('Referer');
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    proxyReq.setHeader('Accept', 'application/json');
  }
}));

// Serve React static files in production
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
