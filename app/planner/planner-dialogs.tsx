"use client";
import { Sparkles } from "lucide-react";
import type { Brief, EventPlan } from "../../domain/schema";
import { Chat } from "./chat";
import { Dialog } from "./dialog";
import { EventForm } from "./event-form";
import { Scenario } from "./scenario";
import { Help } from "./help";
export type PlannerModal =
  "create" | "scenario" | "ai" | "chat" | "help" | "delete" | null;
type Props = {
  modal: PlannerModal;
  active: EventPlan | null;
  initialType: Brief["type"];
  error: string;
  getCurrent: () => EventPlan | null;
  onUpdate: (plan: EventPlan, message?: string) => void;
  onClose: () => void;
  onPersonalize: () => void;
  onCreate: (brief: Brief) => Promise<void>;
  onScenario: (plan: EventPlan) => void;
  onGenerate: () => void;
  onRemove: () => void;
};
export function PlannerDialogs({
  modal,
  active,
  initialType,
  error,
  getCurrent,
  onUpdate,
  onClose,
  onPersonalize,
  onCreate,
  onScenario,
  onGenerate,
  onRemove,
}: Props) {
  return (
    <>
      {modal === "chat" && active && (
        <Dialog
          title="Your ideas. A little guidance."
          wide
          onClose={() => onClose()}
        >
          <Chat
            key={active.id}
            event={active}
            getCurrent={getCurrent}
            onUpdate={onUpdate}
            onPersonalize={() => onPersonalize()}
            storageError={error}
          />
        </Dialog>
      )}
      {modal === "create" && (
        <Dialog
          title="Let’s plan a lovely gathering."
          onClose={() => onClose()}
        >
          <EventForm initialType={initialType} onCreate={onCreate} />
        </Dialog>
      )}
      {modal === "scenario" && active && (
        <Dialog title="What if we changed the plan?" onClose={() => onClose()}>
          <Scenario event={active} onApply={onScenario} />
        </Dialog>
      )}
      {modal === "ai" && active && (
        <Dialog title="A more personal plan." onClose={() => onClose()}>
          <div className="dialog-copy">
            <span className="ai-orb">
              <Sparkles size={28} />
            </span>
            <p>
              Gemini will use your event details and preferences to personalize
              tasks, ideas, and the event-day schedule. Budget amounts, vendor
              records, and completed tasks stay in place.
            </p>
            <p>
              Your brief is sent to Google’s Gemini API. Google’s free tier may
              use content to improve its products. Avoid including private or
              sensitive information.
            </p>
            <p className="small muted">
              If the API is unavailable, your existing plan remains usable.
              Changing the event while generation runs prevents an outdated
              draft from being applied.
            </p>
            <div className="dialog-actions">
              <button className="button secondary" onClick={() => onClose()}>
                Keep current plan
              </button>
              <button className="button primary" onClick={onGenerate}>
                <Sparkles size={16} />
                Personalize my plan
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {modal === "delete" && active && (
        <Dialog title="Remove this event?" onClose={() => onClose()}>
          <div className="dialog-copy">
            <p>
              This removes “{active.brief.title}” from this browser. Download a
              backup first if you might need it later.
            </p>
            <div className="dialog-actions">
              <button className="button secondary" onClick={() => onClose()}>
                Keep event
              </button>
              <button className="button destructive" onClick={onRemove}>
                Delete event
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {modal === "help" && (
        <Dialog
          title="A little help, and your privacy."
          onClose={() => onClose()}
        >
          <Help onClose={onClose} />
        </Dialog>
      )}
    </>
  );
}
