"use client";
import type { ReactNode } from "react";
import { Download, Search } from "lucide-react";
import type { EventPlan } from "../../domain/schema";
import type { TaskFilter } from "../../domain/tasks";
import { calendarFile, download } from "../../exports/files";
export function Timeline({
  active,
  search,
  onSearch,
  taskFilter,
  onFilter,
  hasTasks,
  children,
}: {
  active: EventPlan;
  search: string;
  onSearch: (value: string) => void;
  taskFilter: TaskFilter;
  onFilter: (value: TaskFilter) => void;
  hasTasks: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <div className="section-heading spaced">
        <div>
          <h2>A little closer, one task at a time.</h2>
          <p>
            Preparation deadlines use {active.brief.timezone}. Complete
            prerequisites first.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            download(
              calendarFile(active),
              "gather-timeline.ics",
              "text/calendar",
            )
          }
        >
          <Download size={16} />
          Calendar
        </button>
      </div>
      <div className="filter-row">
        <div className="filter-buttons">
          {(["All", "To do", "Done"] as const).map((filter) => (
            <button
              key={filter}
              aria-pressed={taskFilter === filter}
              onClick={() => onFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Find a task…"
            aria-label="Search tasks"
          />
        </label>
      </div>
      <section className="panel">
        {children}
        {!hasTasks && <p className="empty-inline">No tasks match this view.</p>}
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>On the day</h2>
            <p>
              A suggested run of show, in local event time. Confirm timings with
              your team.
            </p>
          </div>
        </div>
        <div className="run-of-show">
          {active.runOfShow.map((item, i) => (
            <div key={i}>
              <time>{item.time}</time>
              <span />
              <strong>{item.title}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
