"use client";
import { useState } from "react";
import { ArrowRight, Heart, Cake, Users } from "lucide-react";
import { briefSchema, type Brief } from "../../domain/schema";
import { parseMoney } from "../../domain/money";
import { localToday, shiftDate } from "../../domain/dates";
export function EventForm({
  onCreate,
  initialType,
}: {
  onCreate: (brief: Brief) => Promise<void>;
  initialType: Brief["type"];
}) {
  const [type, setType] = useState(initialType);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(form: FormData) {
    setError("");
    setBusy(true);
    try {
      const brief = briefSchema.parse({
        title: form.get("title"),
        type,
        date: form.get("date"),
        location: form.get("location"),
        guests: Number(form.get("guests")),
        budget: parseMoney(String(form.get("budget"))),
        currency: form.get("currency"),
        preferences: form.get("preferences"),
        timezone: form.get("timezone"),
      });
      if (brief.date < localToday(brief.timezone))
        throw new Error("Choose today or a future date.");
      await onCreate(brief);
    } catch (error) {
      setError(
        error instanceof Error && !("issues" in error)
          ? error.message
          : "Check all fields. Use a valid date, timezone, and a guest count between 1 and 10,000.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form action={submit} className="event-form">
      <fieldset className="type-picker">
        <legend>What are we celebrating?</legend>
        {(
          [
            { type: "wedding", label: "Wedding", Icon: Heart },
            { type: "birthday", label: "Birthday", Icon: Cake },
            { type: "community", label: "Community", Icon: Users },
          ] as const
        ).map((item) => (
          <label
            key={item.type}
            className={type === item.type ? "selected" : ""}
          >
            <input
              type="radio"
              name="type"
              value={item.type}
              checked={type === item.type}
              onChange={() => setType(item.type)}
            />
            <item.Icon size={20} />
            {item.label}
          </label>
        ))}
      </fieldset>
      <label>
        Event name
        <input
          name="title"
          required
          maxLength={100}
          placeholder="e.g. Maya & Arjun’s wedding"
        />
      </label>
      <div className="form-grid">
        <label>
          Event date
          <input
            type="date"
            name="date"
            required
            min={localToday()}
            defaultValue={shiftDate(localToday(), 90)}
          />
        </label>
        <label>
          Guest count
          <input
            type="number"
            name="guests"
            min="1"
            max="10000"
            defaultValue="80"
            required
          />
        </label>
      </div>
      <label>
        City or location
        <input
          name="location"
          required
          maxLength={120}
          placeholder="e.g. Jaipur, Rajasthan"
        />
      </label>
      <div className="form-grid">
        <label>
          Total budget
          <input
            name="budget"
            inputMode="decimal"
            required
            defaultValue="200000"
            pattern="[0-9]+(\.[0-9]{1,2})?"
          />
        </label>
        <label>
          Currency
          <select name="currency" defaultValue="INR">
            <option value="INR">INR · Indian rupee</option>
            <option value="USD">USD · US dollar</option>
            <option value="EUR">EUR · Euro</option>
            <option value="GBP">GBP · British pound</option>
          </select>
        </label>
      </div>
      <label>
        Timezone
        <input
          name="timezone"
          required
          defaultValue="Asia/Kolkata"
          maxLength={80}
          aria-describedby="timezone-help"
        />
        <small id="timezone-help">
          For example, Asia/Kolkata or Europe/London.
        </small>
      </label>
      <label>
        Make it yours <span className="muted">(optional)</span>
        <textarea
          name="preferences"
          maxLength={2000}
          rows={3}
          placeholder="A relaxed garden celebration, vegetarian food, step-free access…"
        />
      </label>
      <p className="small muted">
        Saved in this browser. Creating a template sends nothing to an AI
        service.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="button primary full" disabled={busy}>
        {busy ? "Creating your plan…" : "Create my event"}
        <ArrowRight size={17} />
      </button>
    </form>
  );
}
