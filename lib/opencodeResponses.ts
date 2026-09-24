import { randomUUID } from "node:crypto";
import { insertCall } from "./db";
import { encodeModelMarker } from "./markers";

type ChatContentPart = {
  type: string;
  text?: string;
  image_url?: { url?: string };
};

type ResponsesContentPart =
  | { type: "input_text" | "output_text"; text: string }
  | { type: "input_image"; image_url: string };

export interface ChatMessageLike {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ChatContentPart[];
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

export interface ChatToolLike {
  type: string;
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ResponseToolCall {
  id: string;
  name: string;
  arguments: string;
}

interface ResponseUsage {
  input_tokens?: number;
  output_tokens?: number;
  output_tokens_details?: { reasoning_tokens?: number };
  input_tokens_details?: { cached_tokens?: number };
}

interface ResponseEvent {
  type?: string;
  delta?: string;
  item_id?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  error?: { message?: string };
  response?: {
    error?: { message?: string };
    usage?: ResponseUsage;
    cost?: number | string;
  };
  item?: {
    type?: string;
    id?: string;
    call_id?: string;
    name?: string;
    arguments?: string;
  };
}

function inputContent(
  role: ChatMessageLike["role"],
  content: string | ChatContentPart[]
) : ResponsesContentPart[] {
  const parts =
    typeof content === "string" ? [{ type: "text", text: content }] : content;
  return parts.flatMap((part): ResponsesContentPart[] => {
    if (part.type === "image_url" && part.image_url?.url) {
      return [{ type: "input_image", image_url: part.image_url.url }];
    }
    if (part.text) {
      return [
        {
          type: role === "assistant" ? "output_text" : "input_text",
          text: part.text,
        },
      ];
    }
    return [];
  });
}

function toResponsesInput(messages: readonly ChatMessageLike[]) {
  const input: Record<string, unknown>[] = [];
  for (const message of messages) {
    if (message.role === "tool") {
      input.push({
        type: "function_call_output",
        call_id: message.tool_call_id ?? "",
        output: typeof message.content === "string" ? message.content : "",
      });
      continue;
    }

    if (message.tool_calls?.length) {
      for (const call of message.tool_calls) {
        input.push({
          type: "function_call",
          call_id: call.id,
          name: call.function.name,
          arguments: call.function.arguments,
        });
      }
      continue;
    }

    const content = inputContent(message.role, message.content);
    if (content.length > 0) {
      input.push({
        role: message.role,
        content,
      });
    }
  }
  return input;
}

function toResponsesTools(tools: readonly ChatToolLike[]) {
  return tools.map((tool) => ({
    type: "function",
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
  }));
}

function errorFromResponse(status: number, text: string): Error {
  let message = `OpenCode request failed (HTTP ${status}).`;
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } };
    if (parsed.error?.message) message = parsed.error.message;
  } catch {}
  return new Error(message);
}

function usageFromResponse(usage?: ResponseUsage) {
  if (!usage) return undefined;
  return {
    input: usage.input_tokens ?? 0,
    output: usage.output_tokens ?? 0,
    reasoning: usage.output_tokens_details?.reasoning_tokens ?? 0,
    cacheRead: usage.input_tokens_details?.cached_tokens ?? 0,
    cacheWrite: 0,
  };
}

function responseText(body: {
  output_text?: string;
  output?: { type?: string; content?: { type?: string; text?: string }[] }[];
}) {
  if (body.output_text) return body.output_text;
  return (body.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text" && part.text)
    .map((part) => part.text)
    .join("");
}

export async function* streamResponses(
  apiKey: string,
  baseUrl: string,
  messages: readonly ChatMessageLike[],
  model: string,
  tools: readonly ChatToolLike[],
  reasoningLevel: "max" | "medium" | "low",
  sessionId: string | undefined,
  hasImageParts: boolean
): AsyncGenerator<string, { toolCalls: ResponseToolCall[] }, void> {
  const requestId = Math.random().toString(36).slice(2, 8);
  const body: Record<string, unknown> = {
    model,
    input: toResponsesInput(messages),
    stream: true,
  };
  if (!hasImageParts) {
    body.reasoning = {
      effort: reasoningLevel === "max" ? "high" : reasoningLevel,
    };
  }
  if (tools.length > 0) body.tools = toResponsesTools(tools);

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "InsChat/1.0",
      "x-opencode-session": sessionId ?? `inschat-${randomUUID()}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(hasImageParts ? 30_000 : 120_000),
  });
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    const error = errorFromResponse(response.status, text);
    insertCall({
      kind: "opencode",
      model,
      ok: false,
      error: error.message.slice(0, 300),
    }).catch(() => {});
    throw error;
  }

  yield encodeModelMarker(model);
  const startedAt = Date.now();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const toolAcc = new Map<string, ResponseToolCall>();
  let buffer = "";
  let produced = false;
  let firstTokenAt: number | null = null;
  let lastUsage: ResponseUsage | undefined;
  let lastCost: number | string | undefined;
  let failed: Error | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        let event: ResponseEvent;
        try {
          event = JSON.parse(raw) as ResponseEvent;
        } catch {
          continue;
        }

        const eventError =
          event.error?.message ?? event.response?.error?.message;
        if (eventError) throw new Error(eventError);
        if (event.response?.usage) lastUsage = event.response.usage;
        if (event.response?.cost !== undefined) lastCost = event.response.cost;

        if (event.type === "response.output_text.delta" && event.delta) {
          if (!produced) {
            produced = true;
            firstTokenAt = Date.now();
          }
          yield event.delta;
        }

        if (
          event.type === "response.function_call_arguments.delta" &&
          event.delta
        ) {
          const item = event.item;
          const id = event.call_id ?? event.item_id ?? item?.call_id ?? item?.id ?? "";
          const call = toolAcc.get(id) ?? {
            id,
            name: event.name ?? item?.name ?? "",
            arguments: "",
          };
          call.arguments += event.delta;
          toolAcc.set(id, call);
        }

        if (
          event.type === "response.output_item.added" ||
          event.type === "response.output_item.done"
        ) {
          const item = event.item;
          if (item?.type === "function_call") {
            const id = item.call_id ?? item.id ?? "";
            const call = toolAcc.get(id) ?? {
              id,
              name: item.name ?? "",
              arguments: "",
            };
            if (item.name) call.name = item.name;
            if (item.arguments && item.arguments.length > call.arguments.length) {
              call.arguments = item.arguments;
            }
            toolAcc.set(id, call);
          }
        }
      }
    }
  } catch (error) {
    failed = error instanceof Error ? error : new Error(String(error));
  }

  const totalMs = Date.now() - startedAt;
  const toolCalls = [...toolAcc.values()].filter(
    (call) => call.id && call.name
  );
  if (failed) {
    insertCall({
      kind: "opencode",
      model,
      ok: false,
      error: failed.message.slice(0, 300),
    }).catch(() => {});
    throw failed;
  }
  if (!produced && toolCalls.length === 0) {
    const error = new Error("OpenCode stream ended with no content.");
    insertCall({ kind: "opencode", model, ok: false, error: error.message }).catch(
      () => {}
    );
    throw error;
  }

  insertCall({
    kind: "opencode",
    model,
    ok: true,
    cost: typeof lastCost === "number" ? lastCost : undefined,
    tokens: usageFromResponse(lastUsage),
  }).catch(() => {});
  console.log(
    `[opencode:${requestId}] done — ${model}: first token ${
      firstTokenAt ? firstTokenAt - startedAt : totalMs
    }ms, total ${totalMs}ms, ${toolCalls.length} tool calls`
  );
  return { toolCalls };
}

export async function completeResponses(
  apiKey: string,
  baseUrl: string,
  messages: readonly ChatMessageLike[],
  model: string,
  maxTokens: number | undefined,
  json: boolean,
  reasoning: "none" | "minimal" | "low" | "medium" | "high" | "max"
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    input: toResponsesInput(messages),
    max_output_tokens: Math.max(maxTokens ?? 2048, 16),
  };
  if (json) body.text = { format: { type: "json_object" } };
  if (reasoning !== "none") {
    body.reasoning = { effort: reasoning === "max" ? "high" : reasoning };
  }

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "InsChat/1.0",
      "x-opencode-session": `inschat-${randomUUID()}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const text = await response.text();
  if (!response.ok) throw errorFromResponse(response.status, text);
  let bodyJson: {
    output_text?: string;
    output?: { type?: string; content?: { type?: string; text?: string }[] }[];
  };
  try {
    bodyJson = JSON.parse(text) as typeof bodyJson;
  } catch {
    throw new Error("OpenCode returned an invalid Responses payload.");
  }
  const content = responseText(bodyJson);
  if (!content) throw new Error("OpenCode returned an empty response.");
  return content;
}
