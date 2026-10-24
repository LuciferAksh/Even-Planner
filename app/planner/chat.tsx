"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleHelp,
  LoaderCircle,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  appendExchange,
  applyChatProposal,
  buildChatContext,
} from "../../domain/chat";
import {
  chatReplySchema,
  type ChatMessage,
  type EventPlan,
} from "../../domain/schema";
import { money } from "../../domain/money";

export function Chat({
  event,
  getCurrent,
  onUpdate,
  onPersonalize,
  storageError,
}: {
  event: EventPlan;
  getCurrent: () => EventPlan | null;
  onUpdate: (next: EventPlan, message?: string) => void;
  onPersonalize: () => void;
  storageError: string;
}) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [preview, setPreview] = useState<{
    messageId: string;
    baseRevision: number;
    plan: EventPlan;
  } | null>(null);
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
    setPreview(null);
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
      const payload = (await response.json()) as {
        error?: string;
        response?: unknown;
      };
      if (!response.ok)
        throw new Error(
          payload.error ||
            "Gather could not reply. Your message is ready to retry.",
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
      const reply = chatReplySchema.parse(payload.response);
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
  const activePreview =
    preview?.baseRevision === event.revision ? preview : null;
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
            disabled={busy}
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
              onClick={() => {
                const current = getCurrent();
                if (current)
                  onUpdate({ ...current, chat: [] }, "Conversation cleared.");
                setConfirmClear(false);
                setPreview(null);
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
        aria-label="Event planning conversation"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={busy}
      >
        {!event.chat.length && (
          <div className="chat-welcome">
            <span className="chat-welcome-icon">
              <FlowerMark />
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
                  disabled={busy}
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
          <article
            className={`chat-message ${message.role}`}
            key={message.id}
            aria-label={
              message.role === "user" ? "Your message" : "Gather’s reply"
            }
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
                ) : message.baseRevision === event.revision ? (
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => openPreview(message)}
                  >
                    Preview plan changes
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <small>
                    This proposal expired after the plan or conversation
                    changed. Ask for an updated suggestion.
                  </small>
                )}
              </div>
            )}
          </article>
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
            <button
              className="text-button"
              onClick={() => {
                controllerRef.current?.abort();
                setError(
                  "Reply canceled. Your saved conversation is unchanged.",
                );
              }}
            >
              Cancel reply
            </button>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {activePreview && (
        <section className="chat-preview" aria-label="Proposed plan changes">
          <div className="chat-preview-heading">
            <h3>Review before applying</h3>
            <button
              className="icon-button"
              aria-label="Close plan preview"
              onClick={() => setPreview(null)}
            >
              <X size={16} />
            </button>
          </div>
          {activePreview.plan.brief.preferences !== event.brief.preferences && (
            <div>
              <span>Preferences</span>
              <p>{activePreview.plan.brief.preferences || "No preferences"}</p>
            </div>
          )}
          {activePreview.plan.brief.budget !== event.brief.budget && (
            <div>
              <span>Total budget</span>
              <p>
                {money(event.brief.budget, event.brief.currency)} →{" "}
                <strong>
                  {money(activePreview.plan.brief.budget, event.brief.currency)}
                </strong>
              </p>
            </div>
          )}
          {activePreview.plan.brief.guests !== event.brief.guests && (
            <div>
              <span>Guest count</span>
              <p>
                {event.brief.guests} →{" "}
                <strong>{activePreview.plan.brief.guests}</strong>
              </p>
            </div>
          )}
          {activePreview.plan.brief.budget !== event.brief.budget && (
            <ul className="chat-allocation-diff">
              {event.budget.map((line, i) => (
                <li key={line.id}>
                  <span>
                    {line.name}
                    {line.locked ? " · protected" : ""}
                  </span>
                  <span>
                    {money(line.amount, event.brief.currency)} →{" "}
                    {money(
                      activePreview.plan.budget[i].amount,
                      event.brief.currency,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {activePreview.plan.tasks.length > event.tasks.length && (
            <div>
              <span>New checklist tasks</span>
              <ul>
                {activePreview.plan.tasks
                  .filter(
                    (task) =>
                      !event.tasks.some((existing) => existing.id === task.id),
                  )
                  .map((task) => (
                    <li key={task.id}>
                      {task.title} · {task.due}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <p className="small muted">
            Protected allocations, recorded payments, bookings, and completed
            tasks are preserved.
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={applyPreview}
          >
            <Check size={14} />
            Apply to my plan
          </button>
        </section>
      )}
      {(error || storageError) && (
        <p className="error chat-error" role="alert">
          {error || storageError}
        </p>
      )}
      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="chat-message" className="sr-only">
          Message Gather
        </label>
        <textarea
          id="chat-message"
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Share a thought, ask a question, or tell me what you’d like to change…"
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              if (!busy) void send();
            }
          }}
        />
        <div className="chat-compose-footer">
          <span>Enter to send · Shift + Enter for a new line</span>
          <button
            className="button primary"
            disabled={busy || !draft.trim()}
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
      <p className="chat-privacy">
        <CircleHelp size={12} />
        Sending shares your messages and event summary with Google Gemini.
        Free-tier content may improve Google’s products. Avoid private
        information. Recent messages provide AI context; up to 30 exchanges stay
        in this browser.
      </p>
    </div>
  );
}
function FlowerMark() {
  return <MessageCircle size={26} strokeWidth={1.4} />;
}
