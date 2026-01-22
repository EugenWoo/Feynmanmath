import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80; // WeChat Cloud Run usually expects port 80

// Proxy configuration for Google GenAI
// This allows the client to talk to this server, which then talks to Google (bypassing firewall issues if container is overseas/configured correctly)
app.use('/api/genai', createProxyMiddleware({
  target: 'https://generativelanguage.googleapis.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/genai': '', // Remove the /api/genai prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    // Optional: Log proxy requests or inject headers if needed
  },
  onError: (err, req, res) => {
    console.error('Proxy Error:', err);
    res.status(500).send('Proxy Error');
  }
}));

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});