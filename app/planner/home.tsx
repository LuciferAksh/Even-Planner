"use client";
import {
  Plus,
  Sparkles,
  ArrowRight,
  Flower2,
  CheckCheck,
  Heart,
  Cake,
  Users,
  ArrowDownToLine,
  Download,
  CalendarDays,
  MapPin,
} from "lucide-react";
import type { Brief, EventPlan } from "../../domain/schema";
import { dateLabel } from "../../domain/dates";
import { download, backupJson } from "../../exports/files";
export function HomeScreen({
  events,
  openCreate,
  explore,
  onImport,
  openEvent,
}: {
  events: EventPlan[];
  openCreate: (type?: Brief["type"]) => void;
  explore: () => Promise<void>;
  onImport: () => void;
  openEvent: (id: string) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE ROOM FOR GOOD TIMES</span>
          <h1>
            Every great gathering
            <br />
            starts with a little plan.
          </h1>
          <p>Your ideas, budget, and to-dos. Happily in one place.</p>
        </div>
        <button className="button primary" onClick={() => openCreate()}>
          <Plus size={17} />
          Create an event
        </button>
      </div>
      <section className="welcome-banner" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <span className="pill light">
            <Sparkles size={13} /> A THOUGHTFUL LITTLE ASSISTANT
          </span>
          <h2 id="welcome-title">
            You bring the occasion.
            <br />
            <em>We’ll bring the plan.</em>
          </h2>
          <p>
            From the first idea to the final toast, turn your next
            <br className="desktop-break" /> gathering into something that feels
            like you.
          </p>
          <button className="button cream" onClick={explore}>
            Explore a wedding example
            <ArrowRight size={16} />
          </button>
          <small>Editable, saved locally, and ready to make your own.</small>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-flower">
            <Flower2 size={115} strokeWidth={0.8} />
          </div>
          <div className="art-card card-one">
            <CheckCheck size={18} />
            <div>
              A little more organized<small>A lot more present.</small>
            </div>
          </div>
          <div className="art-card card-two">
            <Heart size={16} />
            Made for your moments
          </div>
          <span className="art-spark">✧</span>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>What’s the occasion?</h2>
            <p>Different celebrations. The same peace of mind.</p>
          </div>
          <span className="caption">A PLAN FOR EVERY KIND OF TOGETHER</span>
        </div>
        <div className="occasion-grid">
          {(
            [
              {
                type: "wedding",
                title: "Weddings",
                desc: "For your day, your way.",
                Icon: Heart,
                detail: "Ceremonies, vendors & all the little details",
              },
              {
                type: "birthday",
                title: "Birthdays",
                desc: "Another year. A little more joy.",
                Icon: Cake,
                detail: "Cake, activities & memorable moments",
              },
              {
                type: "community",
                title: "Community events",
                desc: "Good things happen together.",
                Icon: Users,
                detail: "Volunteers, logistics & shared experiences",
              },
            ] as const
          ).map((item) => (
            <button
              className={`occasion-card ${item.type}`}
              key={item.type}
              onClick={() => openCreate(item.type)}
            >
              <span className="occasion-icon">
                <item.Icon size={25} strokeWidth={1.5} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              <small>{item.detail}</small>
              <span className="occasion-arrow">
                <ArrowRight size={18} />
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>
              Your events <span className="count">{events.length}</span>
            </h2>
            <p>Pick up where you left off.</p>
          </div>
          <div className="inline-actions">
            <button className="text-button" onClick={onImport}>
              <ArrowDownToLine size={15} />
              Import backup
            </button>
            {events.length > 0 && (
              <button
                className="text-button"
                onClick={() =>
                  download(
                    backupJson(events),
                    "gather-backup.json",
                    "application/json",
                  )
                }
              >
                <Download size={15} />
                Back up all
              </button>
            )}
          </div>
        </div>
        {events.length ? (
          <div className="event-grid">
            {events.map((event) => (
              <button
                className="saved-event"
                key={event.id}
                onClick={() => openEvent(event.id)}
              >
                <span className={`badge ${event.brief.type}`}>
                  {event.brief.type}
                </span>
                <h3>{event.brief.title}</h3>
                <p>
                  <MapPin size={14} />
                  {event.brief.location}
                </p>
                <div>
                  <span>{dateLabel(event.brief.date)}</span>
                  <ArrowRight size={17} />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-events">
            <CalendarDays size={27} strokeWidth={1.3} />
            <div>
              <strong>Your next good memory starts here.</strong>
              <p>
                Create an event above, or explore the example to get a feel for
                Gather.
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
