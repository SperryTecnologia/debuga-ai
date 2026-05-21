/**
 * Resolve a base LLM URL to the full chat/completions endpoint.
 * Handles various URL formats:
 *   - "https://api.openai.com/v1" → append "/chat/completions"
 *   - "https://generativelanguage.googleapis.com/v1beta/openai" → append "/chat/completions"
 *   - "https://api.openai.com" → append "/v1/chat/completions"
 *   - "http://ollama:11434" → append "/v1/chat/completions"
 *   - Already ends with "/chat/completions" → use as-is
 */
export function resolveChatCompletionsUrl(baseUrl: string): string {
  const cleaned = baseUrl.replace(/\/+$/, "");

  // If URL already ends with /chat/completions, use as-is
  if (cleaned.endsWith("/chat/completions")) {
    return cleaned;
  }

  // If URL already contains a versioned path segment (/v1, /v1beta, /v2, etc.), just append /chat/completions
  if (/\/v\d+(\.\d+)?(beta)?(\/|$)/i.test(cleaned)) {
    return `${cleaned}/chat/completions`;
  }

  // Otherwise, add the full /v1/chat/completions path
  return `${cleaned}/v1/chat/completions`;
}
