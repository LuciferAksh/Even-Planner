"use client";
import {
  ChevronRight,
  CircleHelp,
  Flower2,
  LayoutDashboard,
  Leaf,
  Plus,
  ShieldCheck,
} from "lucide-react";
import type { EventPlan } from "../../domain/schema";
type NavigationProps = {
  events: EventPlan[];
  active: EventPlan | null;
  ready: boolean;
  onHome: () => void;
  onCreate: () => void;
  onHelp: () => void;
  onOpen: (id: string) => void;
};
export function Sidebar({
  events,
  active,
  ready,
  onHome,
  onCreate,
  onHelp,
  onOpen,
}: NavigationProps) {
  return (
    <aside className="sidebar">
      <button
        className="brand"
        onClick={() => {
          onHome();
        }}
        aria-label="Gather home"
      >
        <span className="brand-symbol">
          <Flower2 size={25} strokeWidth={1.4} />
        </span>
        gather<span className="brand-dot">.</span>
      </button>
      <div className="workspace-label">YOUR PLANNING STUDIO</div>
      <nav aria-label="Main navigation">
        <button
          className={`nav-item ${!active ? "active" : ""}`}
          aria-current={!active ? "page" : undefined}
          onClick={() => onHome()}
        >
          <LayoutDashboard size={18} />
          My events<span className="nav-count">{events.length}</span>
        </button>
        <button
          className="nav-item"
          disabled={!ready}
          onClick={() => onCreate()}
        >
          <Plus size={18} />
          Create an event
        </button>
      </nav>
      <div className="sidebar-divider" />
      <div className="workspace-label">YOUR EVENTS</div>
      <div className="sidebar-events">
        {events.map((event) => (
          <button
            className={`event-link ${active?.id === event.id ? "current" : ""}`}
            aria-current={active?.id === event.id ? "page" : undefined}
            onClick={() => onOpen(event.id)}
            key={event.id}
          >
            <span className={`event-dot ${event.brief.type}`} />
            <span>{event.brief.title}</span>
          </button>
        ))}
        {ready && !events.length && (
          <p className="sidebar-empty">
            Good things start
            <br />
            with a little planning.
          </p>
        )}
      </div>
      <div className="sidebar-bottom">
        <div className="little-note">
          <Leaf size={21} />
          <strong>
            More moments.
            <br />
            Less overwhelm.
          </strong>
          <p>
            A little help for the things
            <br />
            worth bringing people together.
          </p>
        </div>
        <button className="nav-item" onClick={() => onHelp()}>
          <CircleHelp size={17} />
          Help & privacy
        </button>
        <div className="profile">
          <span>Y</span>
          <div>
            Your workspace<small>Saved on this device</small>
          </div>
          <ShieldCheck size={16} />
        </div>
      </div>
    </aside>
  );
}
export function Topbar({
  active,
  saving,
  onHelp,
}: {
  active: EventPlan | null;
  saving: boolean;
  onHelp: () => void;
}) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        My workspace
        <ChevronRight size={13} />
        <strong>
          {active
            ? active.brief.type.charAt(0).toUpperCase() +
              active.brief.type.slice(1)
            : "My events"}
        </strong>
      </div>
      <div className="topbar-right">
        <span className="save-indicator">
          <span />
          {saving ? "Saving…" : "Local workspace"}
        </span>
        <button
          className="avatar"
          onClick={() => onHelp()}
          aria-label="Workspace information"
        >
          Y
        </button>
      </div>
    </header>
  );
}
