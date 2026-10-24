"use client";
import { useEffect, useRef, useState } from "react";
import { responseError, responseField } from "../../lib/ai-response";
import { applyAiDraft } from "../../domain/planner";
import { aiDraftSchema, type EventPlan } from "../../domain/schema";

type PersonalizationOptions = {
  getCurrent: () => EventPlan | null;
  onUpdate: (plan: EventPlan, text?: string) => void;
  onNotice: (text: string) => void;
  onError: (text: string) => void;
};
export function usePersonalization({
  getCurrent,
  onUpdate,
  onNotice,
  onError,
}: PersonalizationOptions) {
  const [generating, setGenerating] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  function cancel() {
    requestRef.current?.abort();
    requestRef.current = null;
    setGenerating(false);
  }
  async function generate() {
    const event = getCurrent();
    if (!event || requestRef.current) return;
    setGenerating(true);
    onError("");
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event.brief),
        signal: controller.signal,
      });
      const payload: unknown = await response.json();
      if (!response.ok)
        throw new Error(responseError(payload, "AI planning is unavailable."));
      const current = getCurrent();
      if (current?.id !== event.id || current.revision !== event.revision) {
        onNotice(
          "Your event changed during generation. The AI draft was not applied; try again with your latest plan.",
        );
        return;
      }
      const draft = aiDraftSchema.parse(responseField(payload, "draft"));
      onUpdate(
        applyAiDraft(event, draft),
        "Gemini personalized your tasks, ideas, and event-day schedule.",
      );
    } catch (cause) {
      if (!controller.signal.aborted)
        onError(
          responseError(
            cause,
            "Could not personalize your plan. Your existing plan is safe.",
          ),
        );
    } finally {
      if (requestRef.current === controller) {
        setGenerating(false);
        requestRef.current = null;
      }
    }
  }
  return { generating, generate, cancel };
}
