"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Heart, Cake, Users } from "lucide-react";
import type { Brief } from "../../domain/schema";
import { parseBriefForm, type BriefErrors } from "../../domain/brief-form";
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
  const [fieldErrors, setFieldErrors] = useState<BriefErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [fieldErrors]);
  function fieldProps(name: keyof Brief, label: string) {
    return {
      "aria-label": label,
      "aria-invalid": fieldErrors[name] ? true : undefined,
      "aria-describedby":
        [
          name === "timezone" ? "timezone-help" : "",
          fieldErrors[name] ? `${name}-error` : "",
        ]
          .filter(Boolean)
          .join(" ") || undefined,
    };
  }
  async function submit(form: FormData) {
    setError("");
    setFieldErrors({});
    setBusy(true);
    try {
      const result = parseBriefForm(form, type);
      if (!result.success) {
        setFieldErrors(result.errors);
        setError("Check the highlighted fields before creating your event.");
        return;
      }
      await onCreate(result.brief);
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
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
      ref={formRef}
      className="event-form"
      aria-busy={busy}
    >
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
          {...fieldProps("title", "Event name")}
        />
        <FieldError name="title" errors={fieldErrors} />
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
            {...fieldProps("date", "Event date")}
          />
          <FieldError name="date" errors={fieldErrors} />
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
            {...fieldProps("guests", "Guest count")}
          />
          <FieldError name="guests" errors={fieldErrors} />
        </label>
      </div>
      <label>
        City or location
        <input
          name="location"
          required
          maxLength={120}
          placeholder="e.g. Jaipur, Rajasthan"
          {...fieldProps("location", "City or location")}
        />
        <FieldError name="location" errors={fieldErrors} />
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
            {...fieldProps("budget", "Total budget")}
          />
          <FieldError name="budget" errors={fieldErrors} />
        </label>
        <label>
          Currency
          <select
            name="currency"
            defaultValue="INR"
            {...fieldProps("currency", "Currency")}
          >
            <option value="INR">INR · Indian rupee</option>
            <option value="USD">USD · US dollar</option>
            <option value="EUR">EUR · Euro</option>
            <option value="GBP">GBP · British pound</option>
          </select>
          <FieldError name="currency" errors={fieldErrors} />
        </label>
      </div>
      <label>
        Timezone
        <input
          name="timezone"
          required
          defaultValue="Asia/Kolkata"
          maxLength={80}
          {...fieldProps("timezone", "Timezone")}
        />
        <small id="timezone-help">
          For example, Asia/Kolkata or Europe/London.
        </small>
        <FieldError name="timezone" errors={fieldErrors} />
      </label>
      <label>
        Make it yours <span className="muted">(optional)</span>
        <textarea
          name="preferences"
          maxLength={2000}
          rows={3}
          placeholder="A relaxed garden celebration, vegetarian food, step-free access…"
          {...fieldProps("preferences", "Make it yours (optional)")}
        />
        <FieldError name="preferences" errors={fieldErrors} />
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
function FieldError({
  name,
  errors,
}: {
  name: keyof Brief;
  errors: BriefErrors;
}) {
  return errors[name] ? (
    <small id={`${name}-error`} className="field-error">
      {errors[name]}
    </small>
  ) : null;
}
