import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { config } from './config';
import { codexRouter } from './adapters/codex/routes';
import { claudeRouter } from './adapters/claude/routes';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok', service: 'AI-Relay-Kit', time: new Date().toISOString() }));

// Mount Adapters
app.route('/codex/v1', codexRouter);
app.route('/claude/v1', claudeRouter);

console.log(`Starting AI-Relay-Kit unified relay on port ${config.port}`);

serve({
  fetch: app.fetch,
  port: config.port,
});
