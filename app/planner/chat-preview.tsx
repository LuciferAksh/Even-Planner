"use client";
import { Check, X } from "lucide-react";
import type { EventPlan } from "../../domain/schema";
import { money } from "../../domain/money";
export function ChatPreview({
  event,
  plan,
  busy,
  onClose,
  onApply,
}: {
  event: EventPlan;
  plan: EventPlan;
  busy: boolean;
  onClose: () => void;
  onApply: () => void;
}) {
  return (
    <section className="chat-preview" aria-label="Proposed plan changes">
      <div className="chat-preview-heading">
        <h3>Review before applying</h3>
        <button
          className="icon-button"
          aria-label="Close plan preview"
          onClick={() => onClose()}
        >
          <X size={16} />
        </button>
      </div>
      {plan.brief.preferences !== event.brief.preferences && (
        <div>
          <span>Preferences</span>
          <p>{plan.brief.preferences || "No preferences"}</p>
        </div>
      )}
      {plan.brief.budget !== event.brief.budget && (
        <div>
          <span>Total budget</span>
          <p>
            {money(event.brief.budget, event.brief.currency)} →{" "}
            <strong>{money(plan.brief.budget, event.brief.currency)}</strong>
          </p>
        </div>
      )}
      {plan.brief.guests !== event.brief.guests && (
        <div>
          <span>Guest count</span>
          <p>
            {event.brief.guests} → <strong>{plan.brief.guests}</strong>
          </p>
        </div>
      )}
      {plan.brief.budget !== event.brief.budget && (
        <ul className="chat-allocation-diff">
          {event.budget.map((line, i) => (
            <li key={line.id}>
              <span>
                {line.name}
                {line.locked ? " · protected" : ""}
              </span>
              <span>
                {money(line.amount, event.brief.currency)} →{" "}
                {money(plan.budget[i].amount, event.brief.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {plan.tasks.length > event.tasks.length && (
        <div>
          <span>New checklist tasks</span>
          <ul>
            {plan.tasks
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
        Protected allocations, recorded payments, bookings, and completed tasks
        are preserved.
      </p>
      <button className="button primary" disabled={busy} onClick={onApply}>
        <Check size={14} />
        Apply to my plan
      </button>
    </section>
  );
}
