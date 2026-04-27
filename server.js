import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkFlightsAndSendWhatsApp } from './whatsappTracker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Run the WhatsApp tracker check every 5 minutes automatically while the server is alive
setInterval(() => {
  checkFlightsAndSendWhatsApp().catch(console.error);
}, 5 * 60 * 1000);

// Endpoint for GitHub Actions cron to ping and trigger the check
app.get('/cron/whatsapp-check', async (req, res) => {
  try {
    const result = await checkFlightsAndSendWhatsApp();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
