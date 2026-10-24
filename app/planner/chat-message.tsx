"use client";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import type { ChatMessage } from "../../domain/schema";
export function ChatMessageView({
  message,
  revision,
  busy,
  onPreview,
  onPersonalize,
}: {
  message: ChatMessage;
  revision: number;
  busy: boolean;
  onPreview: (message: ChatMessage) => void;
  onPersonalize: () => void;
}) {
  return (
    <article
      className={`chat-message ${message.role}`}
      key={message.id}
      aria-label={message.role === "user" ? "Your message" : "Gather’s reply"}
    >
      <div className="chat-speaker">
        {message.role === "assistant" ? (
          <Sparkles size={13} />
        ) : (
          <span className="chat-user-dot" />
        )}
        {message.role === "assistant" ? "Gather" : "You"}
      </div>
      <p>{message.content}</p>
      {message.proposal && (
        <div className="chat-proposal">
          <strong>
            <Sparkles size={13} />
            {message.applied
              ? "Added to your plan"
              : "A suggestion for your plan"}
          </strong>
          <p>{message.proposal.summary}</p>
          {message.applied ? (
            <>
              <span className="chat-applied">
                <Check size={13} />
                Changes applied
              </span>
              {message.proposal.preferences !== null && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={onPersonalize}
                >
                  Personalize with these thoughts
                  <ArrowRight size={13} />
                </button>
              )}
            </>
          ) : message.baseRevision === revision ? (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => onPreview(message)}
            >
              Preview plan changes
              <ArrowRight size={14} />
            </button>
          ) : (
            <small>
              This proposal expired after the plan or conversation changed. Ask
              for an updated suggestion.
            </small>
          )}
        </div>
      )}
    </article>
  );
}
