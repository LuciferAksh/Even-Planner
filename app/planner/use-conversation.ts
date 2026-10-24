"use client";
import { useEffect, useRef, useState } from "react";
import { appendExchange, buildChatContext } from "../../domain/chat";
import { chatReplySchema, type EventPlan } from "../../domain/schema";
import { responseError, responseField } from "../../lib/ai-response";
export type ConversationOptions = {
  event: EventPlan;
  getCurrent: () => EventPlan | null;
  onUpdate: (plan: EventPlan, message?: string) => void;
};
export function useConversation({
  event,
  getCurrent,
  onUpdate,
}: ConversationOptions) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [event.chat.length, pending, busy]);
  async function send() {
    const content = draft.trim();
    const current = getCurrent();
    if (!content || !current || controllerRef.current) return;
    setError("");
    setPending(content);
    setBusy(true);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const messages = [
        ...current.chat.map(({ role, content }) => ({ role, content })),
        { role: "user" as const, content },
      ].slice(-12);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: buildChatContext(current), messages }),
        signal: controller.signal,
      });
      const payload: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          responseError(
            payload,
            "Gather could not reply. Your message is ready to retry.",
          ),
        );
      const latest = getCurrent();
      if (
        !latest ||
        latest.id !== current.id ||
        latest.revision !== current.revision
      )
        throw new Error(
          "Your event changed while Gather was replying. Please send your message again with the updated plan.",
        );
      const reply = chatReplySchema.parse(responseField(payload, "response"));
      onUpdate(
        appendExchange(latest, content, reply),
        "Conversation saved in this browser.",
      );
      setDraft((value) => (value.trim() === content ? "" : value));
      inputRef.current?.focus();
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error && !("issues" in cause)
            ? cause.message
            : "Gather returned an invalid reply. Your message and plan are safe; please try again.",
        );
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setBusy(false);
        setPending("");
      }
    }
  }

  function cancel() {
    controllerRef.current?.abort();
    setError("Reply canceled. Your saved conversation is unchanged.");
  }
  return {
    draft,
    setDraft,
    pending,
    error,
    setError,
    busy,
    endRef,
    inputRef,
    send,
    cancel,
  };
}
