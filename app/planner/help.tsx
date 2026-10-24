"use client";
import { ArrowRight } from "lucide-react";
export function Help({ onClose }: { onClose: () => void }) {
  return (
    <div className="dialog-copy">
      <h3>Make a plan, then make it yours</h3>
      <p>
        Create a wedding, birthday, or community event. Edit budget amounts,
        complete tasks, track vendors, and download your plan. Lock budget
        categories before comparing scenarios.
      </p>
      <h3>Your data stays close</h3>
      <p>
        Plans are saved in this browser using IndexedDB. They do not sync across
        devices and may be lost if browser storage is cleared. Download JSON
        backups regularly. Imports create separate copies.
      </p>
      <h3>AI is optional</h3>
      <p>
        Personalizing a plan or sending a chat message shares your event brief
        with Google Gemini. Chat also shares recent messages and a summary of
        tasks, allocations, and vendor categories. Vendor names, quotes,
        payments, and task owners are excluded from event context. Template
        plans are labeled clearly. Gemini suggestions and allocations are
        estimates; verify vendors and local requirements yourself.
      </p>
      <h3>Free-tier limits</h3>
      <p>
        The server accepts up to four AI requests per minute across the
        workspace. Google applies additional project limits. Your plan stays
        editable during outages.
      </p>
      <a
        className="text-button"
        href="https://ai.google.dev/gemini-api/docs/pricing"
        target="_blank"
        rel="noreferrer"
      >
        Google Gemini data and pricing details
        <ArrowRight size={14} />
      </a>
      <button className="button primary full" onClick={() => onClose()}>
        Back to planning
      </button>
    </div>
  );
}
