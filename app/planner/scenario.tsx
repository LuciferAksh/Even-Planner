"use client";
import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import type { EventPlan } from "../../domain/schema";
import { money, parseMoney } from "../../domain/money";
import { scenario } from "../../domain/planner";
export function Scenario({
  event,
  onApply,
  readOnly = false,
}: {
  event: EventPlan;
  onApply: (next: EventPlan) => void;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState<EventPlan | null>(null);
  const [error, setError] = useState("");
  return (
    <div className="dialog-copy">
      <p>
        Compare a new budget or guest count. Protected categories, recorded
        payments, bookings, and completed tasks stay in place. This comparison
        uses exact calculations and makes no AI request.
      </p>
      <form
        action={(form) => {
          try {
            setDraft(
              scenario(
                event,
                parseMoney(String(form.get("budget"))),
                Number(form.get("guests")),
              ),
            );
            setError("");
          } catch (e) {
            setDraft(null);
            setError(
              e instanceof Error && !("issues" in e)
                ? e.message
                : "Use a valid budget and a guest count between 1 and 10,000.",
            );
          }
        }}
      >
        <div className="form-grid">
          <label>
            New budget ({event.brief.currency})
            <input
              name="budget"
              disabled={readOnly}
              inputMode="decimal"
              defaultValue={String(Math.round(event.brief.budget * 0.8) / 100)}
              required
              onChange={() => setDraft(null)}
            />
          </label>
          <label>
            New guest count
            <input
              type="number"
              name="guests"
              disabled={readOnly}
              min="1"
              max="10000"
              required
              defaultValue={event.brief.guests}
              onChange={() => setDraft(null)}
            />
          </label>
        </div>
        <button className="button secondary full spaced" disabled={readOnly}>
          Preview changes
          <ArrowRight size={16} />
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {draft && (
        <div className="scenario-preview">
          <h3>Here’s what would change</h3>
          <p>
            {event.brief.guests} → {draft.brief.guests} guests ·{" "}
            {money(
              Math.round(draft.brief.budget / draft.brief.guests),
              draft.brief.currency,
            )}{" "}
            per guest
          </p>
          <div className="diff-list">
            {draft.budget.map((line, i) => (
              <div key={line.id}>
                <span>
                  {line.locked && <LockKeyhole size={12} />}
                  {line.name}
                </span>
                <span>
                  {money(event.budget[i].amount, event.brief.currency)}{" "}
                  <ArrowRight size={13} />{" "}
                  <strong>{money(line.amount, event.brief.currency)}</strong>
                </span>
              </div>
            ))}
          </div>
          <p className="small muted">
            Guest-count changes require reviewing catering quantities, venue
            capacity, and vendor quotes. This redistribution does not verify
            market feasibility.
          </p>
          <button
            className="button primary full"
            onClick={() => onApply(draft)}
            disabled={readOnly}
          >
            Apply this scenario
          </button>
        </div>
      )}
    </div>
  );
}
