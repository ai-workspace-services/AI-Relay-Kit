import { sessionCache } from '../../core/cache_manager';

export function parseCodexRequest(body: any): any {
  let messages = body.messages || [];

  // If there's a previous_response_id, we prepend the history
  if (body.previous_response_id) {
    const session = sessionCache.getSession(body.previous_response_id);
    if (session && session.history) {
      messages = [...session.history, ...messages];
    }
  }

  // Build the standard Chat Completions request
  const chatReq = {
    model: body.model,
    messages: messages,
    stream: body.stream !== false,
    temperature: body.temperature,
    top_p: body.top_p,
    max_tokens: body.max_tokens,
    tools: body.tools,
    tool_choice: body.tool_choice,
  };

  return { chatReq, fullMessages: messages };
}

// Function to handle the SSE stream transformation (if necessary)
// Many times Codex just expects standard Chat Completion chunks, 
// but we may need to inject the new response_id so Codex can send it back next time.
export function formatCodexChunk(chunkStr: string, responseId: string): string {
  // If the stream chunk is standard, we might not need heavy translation,
  // but we can ensure the ID is set.
  if (chunkStr.trim() === '[DONE]') {
    return chunkStr;
  }
  
  try {
    const data = JSON.parse(chunkStr);
    data.response_id = responseId; // Inject response_id
    // some proprietary fields codex might expect
    return JSON.stringify(data);
  } catch (e) {
    return chunkStr;
  }
}
