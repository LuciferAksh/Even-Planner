"use client";
import {
  CalendarDays,
  ClipboardList,
  Download,
  LayoutDashboard,
  Lightbulb,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import type { EventPlan } from "../../domain/schema";
import { dateLabel } from "../../domain/dates";
export type PlannerTab =
  "Overview" | "Budget" | "Timeline" | "Vendors" | "Ideas";
const tabs: { name: PlannerTab; Icon: typeof LayoutDashboard }[] = [
  { name: "Overview", Icon: LayoutDashboard },
  { name: "Budget", Icon: Wallet },
  { name: "Timeline", Icon: CalendarDays },
  { name: "Vendors", Icon: ClipboardList },
  { name: "Ideas", Icon: Lightbulb },
];
export function EventHeader({
  active,
  generating,
  readOnly,
  onChat,
  onPersonalize,
}: {
  active: EventPlan;
  generating: boolean;
  readOnly: boolean;
  onChat: () => void;
  onPersonalize: () => void;
}) {
  return (
    <div className="event-heading">
      <div>
        <div className="inline-actions">
          <span className={`badge ${active.brief.type}`}>
            {active.brief.type}
          </span>
          <span className="source-label">
            <span />
            {active.source === "gemini"
              ? "Gemini personalized"
              : "Template plan"}
          </span>
        </div>
        <h1>{active.brief.title}</h1>
        <div className="event-meta">
          <span>
            <CalendarDays size={15} />
            {dateLabel(active.brief.date)}
          </span>
          <span>
            <MapPin size={15} />
            {active.brief.location}
          </span>
          <span>
            <Users size={15} />
            {active.brief.guests} guests
          </span>
        </div>
      </div>
      <div className="inline-actions">
        <button className="button secondary" onClick={() => window.print()}>
          <Download size={16} />
          Print plan
        </button>
        <div className="ai-actions" role="group" aria-label="AI planning tools">
          <button
            className="button primary"
            disabled={generating || readOnly}
            onClick={() => {
              onChat();
            }}
          >
            <MessageCircle size={17} />
            Chat with Gather
          </button>
          <button
            className="button secondary"
            disabled={generating || readOnly}
            onClick={() => onPersonalize()}
          >
            {generating ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Sparkles size={17} />
            )}
            {generating ? "Personalizing…" : "Personalize with AI"}
          </button>
        </div>
      </div>
    </div>
  );
}
export function EventTabs({
  tab,
  onTab,
}: {
  tab: PlannerTab;
  onTab: (tab: PlannerTab) => void;
}) {
  return (
    <nav className="event-tabs" aria-label="Event sections">
      {tabs.map(({ name, Icon }) => (
        <button
          key={name}
          aria-current={tab === name ? "page" : undefined}
          onClick={() => {
            onTab(name);
          }}
        >
          <Icon size={16} />
          {name}
        </button>
      ))}
    </nav>
  );
}
