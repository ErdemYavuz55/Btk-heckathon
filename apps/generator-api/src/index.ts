import Fastify from 'fastify';
import { config } from 'dotenv';
import { generateRoutes } from './routes/generate';
import path from 'path';

// Load .env from root directory
config({ path: path.join(__dirname, '../../../.env') });

const server = Fastify({
  logger: true,
  bodyLimit: 10 * 1024 // 10KB limit as per security requirements
});

// CORS for frontend
server.register(require('@fastify/cors'), {
  origin: ['http://localhost:3000'],
  credentials: true
});

// Register routes
server.register(generateRoutes);

// Health check
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '4000');
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Generator API running on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start(); 