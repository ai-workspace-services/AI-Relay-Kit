import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { parseClaudeRequest, formatClaudeChunk } from './parser';
import { proxyToLiteLLM } from '../../core/request_handler';

export const claudeRouter = new Hono();

claudeRouter.post('/messages', async (c) => {
  const body = await c.req.json();
  const chatReq = parseClaudeRequest(body);
  const headers = c.req.header();
  
  // Anthropic API uses x-api-key instead of Authorization header often
  if (headers['x-api-key']) {
    headers['Authorization'] = `Bearer ${headers['x-api-key']}`;
  }

  try {
    const response = await proxyToLiteLLM('/v1/chat/completions', 'POST', chatReq, headers, chatReq.stream ? 'stream' : 'json');
    
    if (!chatReq.stream) {
      // Simplified non-streaming response format conversion
      const data = response.data;
      return c.json({
        id: data.id,
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: data.choices?.[0]?.message?.content || ''
          }
        ],
        model: chatReq.model,
        stop_reason: data.choices?.[0]?.finish_reason || 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: data.usage?.prompt_tokens || 0,
          output_tokens: data.usage?.completion_tokens || 0
        }
      });
    }

    let index = 0;
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');

    return stream(c, async (streamWriter) => {
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            const transformed = formatClaudeChunk(dataStr, index++);
            
            if (transformed) {
              streamWriter.write(`event: ${JSON.parse(transformed).type}\n`);
              streamWriter.write(`data: ${transformed}\n\n`);
            }
          }
        }
      });

      response.data.on('end', () => {
        streamWriter.close();
      });
      
      response.data.on('error', (err: any) => {
        console.error('Claude stream error:', err);
        streamWriter.abort();
      });
    });

  } catch (error: any) {
    c.status(error.response?.status || 500);
    return c.json(error.response?.data || { error: { message: error.message } });
  }
});
