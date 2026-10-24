"use client";
import type { ReactNode } from "react";
import {
  Wallet,
  CheckCheck,
  Clock3,
  ClipboardList,
  ShieldCheck,
  ArrowRight,
  WandSparkles,
  Lightbulb,
  CalendarDays,
  Download,
} from "lucide-react";
import type { EventPlan } from "../../domain/schema";
import { planStats } from "../../domain/planner";
import { money } from "../../domain/money";
import { backupJson, calendarFile, download } from "../../exports/files";
export function Overview({
  active,
  taskRows,
  setTab,
  setModal,
}: {
  active: EventPlan;
  taskRows: (limit?: number) => ReactNode;
  setTab: (tab: "Budget" | "Timeline" | "Ideas") => void;
  setModal: (modal: "scenario") => void;
}) {
  const stats = planStats(active);
  const colors = [
    "#38594d",
    "#8ba88c",
    "#c6b78a",
    "#cf997a",
    "#9a8baa",
    "#d5d9c6",
  ];
  return (
    <>
      <section className="stats-grid" aria-label="Event at a glance">
        <div className="stat-card">
          <span>
            <Wallet size={16} />
            TOTAL BUDGET
          </span>
          <strong>{money(active.brief.budget, active.brief.currency)}</strong>
          <small>
            {money(
              Math.round(active.brief.budget / active.brief.guests),
              active.brief.currency,
            )}{" "}
            per guest
          </small>
        </div>
        <div className="stat-card">
          <span>
            <CheckCheck size={16} />
            TASKS COMPLETED
          </span>
          <strong>
            {stats!.completed}
            <em> / {active.tasks.length}</em>
          </strong>
          <div className="progress-track">
            <span style={{ width: `${stats!.progress}%` }} />
          </div>
        </div>
        <div className="stat-card">
          <span>
            <Clock3 size={16} />
            THE COUNTDOWN
          </span>
          <strong>
            {stats!.days < 0
              ? "Event passed"
              : stats!.days === 0
                ? "Today’s the day"
                : `${stats!.days} days`}
          </strong>
          <small>
            {stats!.overdue
              ? `${stats!.overdue} overdue tasks need a look`
              : "One step closer to a lovely gathering"}
          </small>
        </div>
        <div className="stat-card">
          <span>
            <ClipboardList size={16} />
            VENDORS BOOKED
          </span>
          <strong>
            {active.vendors.filter((v) => v.status === "Booked").length}
            <em> / {active.vendors.length}</em>
          </strong>
          <small>Bring your team together</small>
        </div>
      </section>
      <div className="overview-grid">
        <section className="panel tasks-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">SMALL STEPS, BIG MOMENTS</span>
              <h2>Next on your list</h2>
            </div>
            <button className="text-button" onClick={() => setTab("Timeline")}>
              View timeline
              <ArrowRight size={15} />
            </button>
          </div>
          {taskRows(5)}
          <div className="panel-foot">
            <span>
              <ShieldCheck size={14} />
              Your progress is saved on this device
            </span>
            <span>{stats!.progress}% complete</span>
          </div>
        </section>
        <section className="panel budget-preview">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">A PLAN FOR EVERY PENNY</span>
              <h2>Budget breakdown</h2>
            </div>
            <button
              className="icon-button"
              aria-label="Open budget"
              onClick={() => setTab("Budget")}
            >
              <ArrowRight size={18} />
            </button>
          </div>
          <div
            className="budget-stack"
            role="img"
            aria-label="Budget category proportions"
          >
            {active.budget.map((line, i) => (
              <span
                key={line.id}
                style={{
                  flexGrow: line.amount || 1,
                  background: colors[i % colors.length],
                }}
              />
            ))}
          </div>
          <div className="budget-legend">
            {active.budget.map((line, i) => (
              <div key={line.id}>
                <span
                  className="legend-dot"
                  style={{ background: colors[i % colors.length] }}
                />
                <span>{line.name}</span>
                <strong>{money(line.amount, active.brief.currency)}</strong>
              </div>
            ))}
          </div>
          <button
            className="button secondary full"
            onClick={() => setModal("scenario")}
          >
            <WandSparkles size={16} />
            Explore a different budget
          </button>
        </section>
      </div>
      <div className="bottom-grid">
        <section className="idea-banner">
          <span className="idea-icon">
            <Lightbulb size={26} strokeWidth={1.4} />
          </span>
          <div>
            <span className="eyebrow">A LITTLE INSPIRATION</span>
            <h3>{active.ideas[0]?.title || "Make it your own"}</h3>
            <p>
              {active.ideas[0]?.description ||
                "Add your preferences and personalize your plan with Gemini."}
            </p>
            <button className="text-button" onClick={() => setTab("Ideas")}>
              More ideas for your event
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <section className="panel compact">
          <h3>Keep the plan close</h3>
          <p>Take your checklist with you, wherever the day takes you.</p>
          <button
            className="text-button"
            onClick={() =>
              download(
                calendarFile(active),
                "gather-timeline.ics",
                "text/calendar",
              )
            }
          >
            <CalendarDays size={16} />
            Download calendar
          </button>
          <button
            className="text-button"
            onClick={() =>
              download(
                backupJson([active]),
                "gather-event.json",
                "application/json",
              )
            }
          >
            <Download size={16} />
            Back up this event
          </button>
        </section>
      </div>
    </>
  );
}
