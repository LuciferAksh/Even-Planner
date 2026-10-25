"use client";
import { useState } from "react";
import {
  ArrowRight,
  CircleHelp,
  LoaderCircle,
  MessageCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { money } from "../../domain/money";
import { ChatComposer } from "./chat-composer";
import { ChatMessageView } from "./chat-message";
import { ChatPreview } from "./chat-preview";
import { useConversation, type ConversationOptions } from "./use-conversation";
import { useProposalReview } from "./use-proposal-review";
export function Chat({
  event,
  getCurrent,
  onUpdate,
  onPersonalize,
  storageError,
  readOnly = false,
}: ConversationOptions & {
  onPersonalize: () => void;
  storageError: string;
  readOnly?: boolean;
}) {
  const conversation = useConversation({ event, getCurrent, onUpdate });
  const { draft, setDraft, pending, error, busy, endRef, inputRef } =
    conversation;
  const review = useProposalReview({
    getCurrent,
    onUpdate,
    setError: conversation.setError,
  });
  const [confirmClear, setConfirmClear] = useState(false);
  const activePreview =
    review.preview?.baseRevision === event.revision ? review.preview : null;
  return (
    <div className="chat-layout">
      <div className="chat-context">
        <span className="chat-mark">
          <Sparkles size={19} />
        </span>
        <div>
          <strong>{event.brief.title}</strong>
          <span>
            {event.brief.guests} guests ·{" "}
            {money(event.brief.budget, event.brief.currency)} ·{" "}
            {event.brief.location}
          </span>
        </div>
        <span className="badge">Gemini</span>
      </div>
      <div className="chat-toolbar">
        <span>
          <MessageCircle size={13} />A conversation about your event
        </span>
        {event.chat.length > 0 && (
          <button
            className="text-button"
            disabled={busy || readOnly}
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 size={13} />
            Clear chat
          </button>
        )}
      </div>
      {confirmClear && (
        <div
          className="chat-clear"
          role="group"
          aria-label="Clear conversation confirmation"
        >
          <p>
            Clear this event’s saved messages? Your event plan stays in place.
          </p>
          <div className="inline-actions">
            <button
              className="button secondary"
              onClick={() => setConfirmClear(false)}
            >
              Keep messages
            </button>
            <button
              className="button destructive"
              disabled={readOnly}
              onClick={() => {
                const current = getCurrent();
                if (current)
                  onUpdate({ ...current, chat: [] }, "Conversation cleared.");
                setConfirmClear(false);
                review.close();
              }}
            >
              Clear messages
            </button>
          </div>
        </div>
      )}
      <div
        className="chat-thread"
        role="log"
        tabIndex={0}
        aria-label="Event planning conversation"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={busy}
      >
        {!event.chat.length && (
          <div className="chat-welcome">
            <span className="chat-welcome-icon">
              <MessageCircle size={26} strokeWidth={1.4} />
            </span>
            <h3>Let’s think it through, together.</h3>
            <p>
              Tell me what’s on your mind. We can shape an idea, work through
              your budget, or figure out the next small step.
            </p>
            <div className="chat-starters">
              {[
                "Help me simplify my budget",
                "I’m not sure where to start",
                "Suggest a personal touch",
              ].map((text) => (
                <button
                  key={text}
                  disabled={busy || readOnly}
                  onClick={() => {
                    setDraft(text);
                    inputRef.current?.focus();
                  }}
                >
                  {text}
                  <ArrowRight size={13} />
                </button>
              ))}
            </div>
          </div>
        )}
        {event.chat.map((message) => (
          <ChatMessageView
            key={message.id}
            message={message}
            revision={event.revision}
            busy={busy || readOnly}
            onPreview={review.openPreview}
            onPersonalize={onPersonalize}
          />
        ))}
        {pending && (
          <article className="chat-message user pending">
            <div className="chat-speaker">You</div>
            <p>{pending}</p>
          </article>
        )}
        {busy && (
          <div className="chat-thinking" role="status">
            <LoaderCircle size={15} className="spin" />
            Gather is thinking through your event…
            <button className="text-button" onClick={conversation.cancel}>
              Cancel reply
            </button>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {activePreview && (
        <ChatPreview
          event={event}
          plan={activePreview.plan}
          busy={busy || readOnly}
          onClose={review.close}
          onApply={review.applyPreview}
        />
      )}
      {(error || storageError) && (
        <p className="error chat-error" role="alert">
          {error || storageError}
        </p>
      )}
      <ChatComposer
        value={draft}
        onChange={setDraft}
        busy={busy}
        readOnly={readOnly}
        onSend={() => {
          review.close();
          void conversation.send();
        }}
        inputRef={inputRef}
      />
      <p id="chat-privacy" className="chat-privacy">
        <CircleHelp size={12} />
        Sending shares your messages and event summary with Google Gemini.
        Free-tier content may improve Google’s products. Avoid private
        information. Recent messages provide AI context; up to 30 exchanges stay
        in this browser.
      </p>
    </div>
  );
}
