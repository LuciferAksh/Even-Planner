"use client";
import { Sparkles } from "lucide-react";
import type { EventPlan } from "../../domain/schema";
export function Ideas({ active }: { active: EventPlan }) {
  return (
    <>
      <div className="section-heading spaced">
        <div>
          <h2>A gathering that feels like you.</h2>
          <p>
            {active.source === "gemini"
              ? "Ideas personalized by Gemini from your event brief."
              : "A starting point for inspiration. Gemini can tailor these to your preferences."}
          </p>
        </div>
      </div>
      {active.brief.preferences && (
        <div className="preferences">
          <Sparkles size={20} />
          <div>
            <strong>Your inspiration brief</strong>
            <p>{active.brief.preferences}</p>
          </div>
        </div>
      )}
      <div className="ideas-grid">
        {active.ideas.map((idea, i) => (
          <section className="idea-card" key={idea.title}>
            <span className="idea-number">0{i + 1}</span>
            <span className="badge">{idea.cost} cost</span>
            <h3>{idea.title}</h3>
            <p>{idea.description}</p>
          </section>
        ))}
      </div>
    </>
  );
}
