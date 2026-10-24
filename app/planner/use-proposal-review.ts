"use client";
import { useState } from "react";
import { applyChatProposal } from "../../domain/chat";
import type { ChatMessage, EventPlan } from "../../domain/schema";
export function useProposalReview({
  getCurrent,
  onUpdate,
  setError,
}: {
  getCurrent: () => EventPlan | null;
  onUpdate: (plan: EventPlan, message?: string) => void;
  setError: (error: string) => void;
}) {
  const [preview, setPreview] = useState<{
    messageId: string;
    baseRevision: number;
    plan: EventPlan;
  } | null>(null);
  function openPreview(message: ChatMessage) {
    const current = getCurrent();
    if (
      !current ||
      !message.proposal ||
      current.revision !== message.baseRevision
    ) {
      setError(
        "This proposal is out of date. Ask Gather to suggest changes using your latest plan.",
      );
      return;
    }
    try {
      setPreview({
        messageId: message.id,
        baseRevision: current.revision,
        plan: applyChatProposal(current, message.proposal),
      });
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error && !("issues" in cause)
          ? cause.message
          : "These changes could not be validated. Ask Gather to revise the proposal.",
      );
    }
  }
  function applyPreview() {
    const current = getCurrent();
    if (!preview || !current) return;
    if (current.revision !== preview.baseRevision) {
      setError(
        "Your plan changed. Preview a fresh proposal before applying it.",
      );
      setPreview(null);
      return;
    }
    onUpdate(
      {
        ...preview.plan,
        chat: current.chat.map((message) =>
          message.id === preview.messageId
            ? { ...message, applied: true }
            : message,
        ),
      },
      "Chat suggestions applied. Review or personalize your updated plan.",
    );
    setPreview(null);
    setError("");
  }

  return { preview, openPreview, applyPreview, close: () => setPreview(null) };
}
