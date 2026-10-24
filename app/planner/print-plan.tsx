import type { EventPlan } from "../../domain/schema";
import { money } from "../../domain/money";
import { dateLabel } from "../../domain/dates";
export function PrintPlan({ event }: { event: EventPlan }) {
  return (
    <article className="print-report">
      <h1>{event.brief.title}</h1>
      <p>
        {dateLabel(event.brief.date)} · {event.brief.location} ·{" "}
        {event.brief.guests} guests · {event.brief.timezone}
      </p>
      <p>
        {event.source === "gemini"
          ? "Gemini personalized plan"
          : "Template plan"}{" "}
        · Total budget: {money(event.brief.budget, event.brief.currency)}
      </p>
      <h2>Budget</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Planned</th>
            <th>Paid</th>
            <th>Protected</th>
          </tr>
        </thead>
        <tbody>
          {event.budget.map((line) => (
            <tr key={line.id}>
              <td>{line.name}</td>
              <td>{money(line.amount, event.brief.currency)}</td>
              <td>{money(line.paid, event.brief.currency)}</td>
              <td>{line.locked ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Preparation timeline</h2>
      <ul>
        {event.tasks
          .slice()
          .sort((a, b) => a.due.localeCompare(b.due))
          .map((task) => (
            <li key={task.id}>
              {task.done ? "☑" : "☐"} {dateLabel(task.due)} — {task.title}
              {task.owner ? ` · ${task.owner}` : ""}
            </li>
          ))}
      </ul>
      <h2>Vendor checklist</h2>
      {event.vendors.map((vendor) => (
        <section key={vendor.id}>
          <h3>{vendor.category}</h3>
          <p>
            {vendor.name || "Vendor to research"} · {vendor.status} · Quote:{" "}
            {money(vendor.quote, event.brief.currency)}
          </p>
          <ul>
            {vendor.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>
      ))}
      <h2>Event-day schedule</h2>
      <ul>
        {event.runOfShow.map((item, index) => (
          <li key={index}>
            {item.time} — {item.title}
          </li>
        ))}
      </ul>
      <h2>Ideas for your event</h2>
      {event.ideas.map((idea) => (
        <section key={idea.title}>
          <h3>
            {idea.title} · {idea.cost} cost
          </h3>
          <p>{idea.description}</p>
        </section>
      ))}
      <h2>Preferences and assumptions</h2>
      <p>{event.brief.preferences}</p>
      <ul>
        {event.assumptions.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </article>
  );
}
