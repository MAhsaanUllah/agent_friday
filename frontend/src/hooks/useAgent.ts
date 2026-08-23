import { useCallback, useRef, useState } from "react";
import { resumeAgent, streamRun } from "../api/client";
import type { AgentResponse, MessageView, ToolCallView } from "../types";

export type Phase = "idle" | "running" | "awaiting_approval" | "error";

export interface AgentSession {
  phase: Phase;
  threadId: string | null;
  messages: MessageView[];
  plan: string | null;
  pending: ToolCallView[];
  progress: string[];
  error: string | null;
}

const INITIAL: AgentSession = {
  phase: "idle",
  threadId: null,
  messages: [],
  plan: null,
  pending: [],
  progress: [],
  error: null,
};

function apply(session: AgentSession, response: AgentResponse): AgentSession {
  return {
    ...session,
    phase:
      response.status === "awaiting_approval"
        ? "awaiting_approval"
        : "idle",
    threadId: response.thread_id,
    messages: response.messages,
    plan: response.plan ?? session.plan,
    pending: response.pending_tool_calls,
    error: null,
  };
}

export function useAgent() {
  const [session, setSession] = useState<AgentSession>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setSession(INITIAL);
  }, []);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setSession((s) => ({
      ...s,
      phase: "idle",
      messages: [
        ...s.messages,
        {
          role: "assistant",
          content: "🛑 **Execution stopped by user.**",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    }));
  }, []);

  const send = useCallback(async (message: string) => {
    const controller = new AbortController();
    abortRef.current = controller;

    setSession((s) => ({
      ...s,
      phase: "running",
      error: null,
      progress: [],
      messages: [
        ...s.messages,
        {
          role: "user",
          content: message,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    }));
    try {
      const response = await streamRun(
        message,
        session.threadId ?? undefined,
        (e) => {
          if (e.type === "node" && e.nodes) {
            setSession((s) => ({ ...s, progress: [...s.progress, ...e.nodes!] }));
          }
        },
        controller.signal,
      );
      setSession((s) => apply(s, response));
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        return;
      }
      setSession((s) => ({
        ...s,
        phase: "error",
        error: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [session.threadId]);

  const resume = useCallback(async (approved: boolean) => {
    if (!session.threadId || session.phase !== "awaiting_approval") return;
    setSession((s) => ({ ...s, phase: "running", error: null }));
    try {
      const response = await resumeAgent(session.threadId, approved);
      setSession((s) => apply(s, response));
    } catch (err) {
      setSession((s) => ({
        ...s,
        phase: "error",
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [session.threadId, session.phase]);

  return { session, send, resume, reset, stop };
}
