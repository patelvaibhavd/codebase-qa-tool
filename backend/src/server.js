// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

// Now import all other modules (after env is loaded)
const { default: express } = await import('express');
const { default: cors } = await import('cors');
const { default: uploadRoutes } = await import('./routes/upload.routes.js');
const { default: qaRoutes } = await import('./routes/qa.routes.js');
const { default: projectRoutes } = await import('./routes/project.routes.js');
const { getProviderStatus, getProviderConfig } = await import('./services/aiProvider.service.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/project', projectRoutes);

// Health check with provider status
app.get('/api/health', (req, res) => {
  const providerStatus = getProviderStatus();
  res.json({ 
    status: 'ok', 
    message: 'Codebase Q&A API is running',
    aiProvider: providerStatus
  });
});

// Get current AI provider info
app.get('/api/provider', (req, res) => {
  const config = getProviderConfig();
  const status = getProviderStatus();
  res.json({
    provider: config.provider,
    name: config.name,
    chatModel: config.chatModel,
    embeddingModel: config.embeddingModel,
    isConfigured: status.isConfigured,
    message: status.message
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 Codebase Q&A Tool - Backend API Ready`);
});
