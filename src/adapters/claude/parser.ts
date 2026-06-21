export function parseClaudeRequest(body: any): any {
  const messages = [...(body.messages || [])];
  
  if (body.system) {
    messages.unshift({
      role: 'system',
      content: body.system
    });
  }

  // We convert standard Anthropic tool structures to OpenAI if needed, 
  // though LiteLLM usually handles standard OpenAI formats best.
  // Assuming simplified direct mapping for basic use-cases
  const chatReq = {
    model: body.model,
    messages: messages,
    stream: body.stream !== false,
    temperature: body.temperature,
    top_p: body.top_p,
    max_tokens: body.max_tokens,
  };

  return chatReq;
}

// Function to convert OpenAI Chat Completions chunk to Anthropic Messages chunk
export function formatClaudeChunk(chatChunkStr: string, index: number): string | null {
  if (chatChunkStr === '[DONE]') {
    // We send message_stop event instead
    return JSON.stringify({ type: 'message_stop' });
  }

  try {
    const parsed = JSON.parse(chatChunkStr);
    const content = parsed.choices?.[0]?.delta?.content || '';
    
    // In Anthropic streaming:
    // First event is message_start
    if (index === 0) {
      return JSON.stringify({
        type: 'message_start',
        message: {
          id: parsed.id || 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [],
          model: parsed.model,
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 }
        }
      });
    }

    if (content) {
      return JSON.stringify({
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: content }
      });
    }

    if (parsed.choices?.[0]?.finish_reason) {
      return JSON.stringify({
        type: 'message_delta',
        delta: { stop_reason: parsed.choices[0].finish_reason, stop_sequence: null },
        usage: { output_tokens: 0 }
      });
    }

    return null;
  } catch (e) {
    return null;
  }
}
