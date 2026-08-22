import type { AgentResponse } from "../types";

async function post<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = localStorage.getItem("FRIDAY_API_KEY");
  if (apiKey) headers["X-API-Key"] = apiKey;

  const response = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response
      .json()
      .then((d: { detail?: string }) => d.detail)
      .catch(() => undefined);
    throw new Error(detail ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function runAgent(
  message: string,
  threadId?: string,
): Promise<AgentResponse> {
  const model = localStorage.getItem("FRIDAY_MODEL") || undefined;
  const apiKey = localStorage.getItem("FRIDAY_API_KEY") || undefined;
  const allowlistStr = localStorage.getItem("FRIDAY_TOOL_ALLOWLIST");
  const allowlist = allowlistStr ? JSON.parse(allowlistStr) : undefined;
  return post<AgentResponse>("/agent/run", {
    message,
    ...(threadId ? { thread_id: threadId } : {}),
    ...(model ? { model } : {}),
    ...(apiKey ? { api_key: apiKey } : {}),
    ...(allowlist ? { allowlist } : {}),
  });
}

export function resumeAgent(
  threadId: string,
  approved: boolean,
): Promise<AgentResponse> {
  return post<AgentResponse>("/agent/resume", {
    thread_id: threadId,
    approved,
  });
}

export async function getThreads(): Promise<{id: string, title: string}[]> {
  const response = await fetch("/agent/threads");
  if (!response.ok) {
    throw new Error("Failed to fetch threads");
  }
  return response.json();
}

export interface StreamEvent {
  type: "node" | "done" | "error";
  nodes?: string[];
  detail?: string;
  state?: AgentResponse;
}

/** POST to the SSE streaming endpoint and surface live node events. */
export function streamRun(
  message: string,
  threadId: string | undefined,
  onEvent: (e: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<AgentResponse> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const apiKey = localStorage.getItem("FRIDAY_API_KEY");
    if (apiKey) headers["X-API-Key"] = apiKey;

    const model = localStorage.getItem("FRIDAY_MODEL") || undefined;
    const allowlistStr = localStorage.getItem("FRIDAY_TOOL_ALLOWLIST");
    const allowlist = allowlistStr ? JSON.parse(allowlistStr) : undefined;

    fetch("/agent/run/stream", {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        message,
        ...(threadId ? { thread_id: threadId } : {}),
        ...(model ? { model } : {}),
        ...(apiKey ? { api_key: apiKey } : {}),
        ...(allowlist ? { allowlist } : {}),
      }),
    })
      .then((response) => {
        if (!response.ok || !response.body) {
          reject(new Error(`Stream failed (${response.status})`));
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const pump = (): void => {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                resolve({
                  thread_id: threadId ?? "",
                  status: "completed",
                  messages: [],
                } as unknown as AgentResponse);
                return;
              }
              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split("\n\n");
              buffer = parts.pop() ?? "";
              for (const part of parts) {
                let event = "message";
                let data = "";
                for (const line of part.split("\n")) {
                  if (line.startsWith("event:")) event = line.slice(6).trim();
                  else if (line.startsWith("data:")) data += line.slice(5).trim();
                }
                if (!data) continue;
                try {
                  const payload = JSON.parse(data);
                  if (event === "node") {
                    onEvent({ type: "node", nodes: payload.nodes });
                  } else if (event === "done") {
                    onEvent({ type: "done", state: payload });
                    resolve(payload as AgentResponse);
                    return;
                  } else if (event === "error") {
                    onEvent({ type: "error", detail: payload.detail });
                    reject(new Error(payload.detail ?? "Stream error"));
                    return;
                  }
                } catch {
                  /* ignore malformed frame */
                }
              }
              pump();
            })
            .catch((err) => reject(err));
        };
        pump();
      })
      .catch((err) => reject(err));
  });
}
