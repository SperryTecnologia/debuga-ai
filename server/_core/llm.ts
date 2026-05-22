/**
 * LLM Gateway for debuga.ai.
 * Supports both cloud (OpenAI-compatible) and local (Ollama) inference.
 * Feature flag: ENABLE_LOCAL_INFERENCE=true activates local provider.
 */

import { ENV, resolveLLMProvider, resolveFallbackProvider } from "./env";
import { resolveChatCompletionsUrl } from "./llmUrl";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

// ── Provider resolution ──
type LlmProvider = { apiUrl: string; apiKey: string; model: string; isLocal: boolean };

function resolveProvider(): LlmProvider {
  // Use the centralized resolveLLMProvider from env.ts
  const provider = resolveLLMProvider();
  if (!provider) {
    throw new Error(
      "[LLM] Nenhum provedor configurado. Configure pelo menos uma opção:\n" +
      "  1) GEMINI_API_KEY (+ GEMINI_API_URL)\n" +
      "  2) OPENAI_API_KEY (+ OPENAI_API_URL)\n" +
      "  3) LLM_CLOUD_API_URL + LLM_CLOUD_API_KEY\n" +
      "  4) BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY\n" +
      "  5) ENABLE_LOCAL_INFERENCE=true + LOCAL_LLM_BASE_URL + LOCAL_LLM_MODEL\n" +
      "Consulte docs/15-LLM-PROVIDERS.md para detalhes."
    );
  }

  const isLocal = provider.name === "ollama";
  return {
    apiUrl: resolveChatCompletionsUrl(provider.apiUrl),
    apiKey: provider.apiKey || "ollama",
    model: provider.model,
    isLocal,
  };
}

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const provider = resolveProvider();
  const { messages, tools, toolChoice, tool_choice, outputSchema, output_schema, responseFormat, response_format } = params;

  const payload: Record<string, unknown> = {
    model: provider.model,
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
    if (!provider.isLocal) {
      const ntc = normalizeToolChoice(toolChoice || tool_choice, tools);
      if (ntc) payload.tool_choice = ntc;
    }
  }

  payload.max_tokens = provider.isLocal ? 8192 : 32768;

  if (!provider.isLocal) {
    payload.thinking = { budget_tokens: 128 };
  }

  const nrf = normalizeResponseFormat({ responseFormat, response_format, outputSchema, output_schema });
  if (nrf) payload.response_format = nrf;

  // Log provider details (never log API keys)
  const safeUrl = provider.apiUrl.replace(/\/v1\/chat\/completions$/, "");
  console.log(`[LLM] Provider: ${provider.isLocal ? "LOCAL/Ollama" : "CLOUD"} | Model: ${provider.model} | Endpoint: ${safeUrl}`);

  const response = await fetch(provider.apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();

    // Fallback: try the configured fallback provider or any available alternative
    const fallbackConfig = resolveFallbackProvider();
    if (fallbackConfig) {
      const fallbackUrl = resolveChatCompletionsUrl(fallbackConfig.apiUrl);
      const fallbackSafeUrl = fallbackConfig.apiUrl.replace(/\/$/, "");
      console.warn(`[LLM] FALLBACK: Primary failed (${response.status}) → ${fallbackConfig.name} | Model: ${fallbackConfig.model} | Endpoint: ${fallbackSafeUrl}`);
      const fallbackResponse = await fetch(fallbackUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${fallbackConfig.apiKey}`,
        },
        body: JSON.stringify({ ...payload, model: fallbackConfig.model, max_tokens: 32768 }),
      });
      if (fallbackResponse.ok) {
        return (await fallbackResponse.json()) as InvokeResult;
      }
    }

    throw new Error(`LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`);
  }

  return (await response.json()) as InvokeResult;
}
