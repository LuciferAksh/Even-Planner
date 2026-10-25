"use client";
import type { RefObject } from "react";
import { LoaderCircle, Send } from "lucide-react";
export function ChatComposer({
  value,
  onChange,
  busy,
  onSend,
  inputRef,
  readOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  busy: boolean;
  onSend: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  readOnly?: boolean;
}) {
  return (
    <form
      className="chat-composer"
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
    >
      <label htmlFor="chat-message" className="sr-only">
        Message Gather
      </label>
      <textarea
        id="chat-message"
        disabled={readOnly}
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={2000}
        rows={2}
        aria-describedby="chat-keyboard-help chat-privacy"
        placeholder="Share a thought, ask a question, or tell me what you’d like to change…"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!busy) onSend();
          }
        }}
      />
      <div className="chat-compose-footer">
        <span id="chat-keyboard-help">
          Enter to send · Shift + Enter for a new line
        </span>
        <button
          className="button primary"
          disabled={busy || readOnly || !value.trim()}
          aria-label="Send message"
        >
          {busy ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <Send size={15} />
          )}
          Send
        </button>
      </div>
    </form>
  );
}
