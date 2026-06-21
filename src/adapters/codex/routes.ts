import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { parseCodexRequest, formatCodexChunk } from './parser';
import { proxyToLiteLLM } from '../../core/request_handler';
import { sessionCache } from '../../core/cache_manager';

export const codexRouter = new Hono();

codexRouter.post('/responses', async (c) => {
  const body = await c.req.json();
  const { chatReq, fullMessages } = parseCodexRequest(body);
  const headers = c.req.header();

  try {
    const response = await proxyToLiteLLM('/v1/chat/completions', 'POST', chatReq, headers, chatReq.stream ? 'stream' : 'json');
    
    // We generate a new response ID for this session
    const responseId = sessionCache.generateId();
    
    // Save the message history immediately; we assume the assistant will append to this in real-time or we can just save what we have.
    // To be perfectly accurate, we should append the assistant's response to `fullMessages` as it streams.
    // For simplicity, we just save the full user request history, and the next turn the user will send it again or we can reconstruct.
    const currentSessionMessages = [...fullMessages];

    if (!chatReq.stream) {
      const data = response.data;
      data.response_id = responseId;
      
      // Append assistant message
      if (data.choices && data.choices[0] && data.choices[0].message) {
        currentSessionMessages.push(data.choices[0].message);
        sessionCache.saveSession(responseId, currentSessionMessages);
      }
      return c.json(data);
    }

    // Handle Streaming
    let assistantMessage = '';
    
    return stream(c, async (streamWriter) => {
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              streamWriter.write(`data: [DONE]\n\n`);
              continue;
            }
            
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                assistantMessage += parsed.choices[0].delta.content;
              }
            } catch(e) {}
            
            const transformed = formatCodexChunk(dataStr, responseId);
            streamWriter.write(`data: ${transformed}\n\n`);
          } else {
            streamWriter.write(`${line}\n`);
          }
        }
      });

      response.data.on('end', () => {
        // Save history with full assistant message once stream is done
        currentSessionMessages.push({ role: 'assistant', content: assistantMessage });
        sessionCache.saveSession(responseId, currentSessionMessages);
        streamWriter.close();
      });
      
      response.data.on('error', (err: any) => {
        console.error('Stream error:', err);
        streamWriter.abort();
      });
    });

  } catch (error: any) {
    c.status(error.response?.status || 500);
    return c.json(error.response?.data || { error: error.message });
  }
});
