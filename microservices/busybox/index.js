import express from 'express';

const app = express();
const PORT = process.env.HEALTH_PORT || process.env.PORT || 3000;

// Parse incoming JSON payloads
app.use(express.json());

// --- Health Check Endpoints for Kubernetes ---
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'busybox' });
});

app.get('/ready', (req, res) => {
  // Add database or external dependency readiness checks here if needed
  res.status(200).json({ status: 'READY' });
});

// --- Sample API Routes ---
app.get('/', (req, res) => {
  res.send('Busybox service is up and running!');
});

app.post('/api/data', (req, res) => {
  const data = req.body;
  console.log('[Busybox] Received payload:', data);
  res.status(201).json({ message: 'Data received successfully', data });
});

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// --- Server Lifecycle ---
const server = app.listen(PORT, () => {
  console.log(`[Busybox] Express server listening on port ${PORT}`);
});

// --- Graceful Shutdown for K8s / Docker SIGTERM ---
const shutdown = (signal) => {
  console.log(`[Busybox] Received ${signal}. Closing HTTP server...`);
  server.close(() => {
    console.log('[Busybox] HTTP server closed. Exiting process.');
    process.exit(0);
  });

  // Force shutdown if connections hang longer than 10 seconds
  setTimeout(() => {
    console.error('[Busybox] Could not close connections in time, forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));