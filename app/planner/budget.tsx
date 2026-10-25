"use client";
import { Download, LockKeyhole, Unlock, WandSparkles } from "lucide-react";
import type { EventPlan } from "../../domain/schema";
import { money, parseMoney } from "../../domain/money";
import { planStats } from "../../domain/planner";
import { budgetCsv, download } from "../../exports/files";
export function Budget({
  event,
  commit,
  onScenario,
  onError,
  readOnly = false,
}: {
  event: EventPlan;
  commit: (update: (current: EventPlan) => EventPlan) => void;
  onScenario: () => void;
  onError: (message: string) => void;
  readOnly?: boolean;
}) {
  const stats = planStats(event);
  function edit(
    id: string,
    field: "amount" | "paid",
    value: string,
    input: HTMLInputElement,
  ) {
    const line = event.budget.find((line) => line.id === id);
    if (!line) return;
    try {
      const amount = parseMoney(value);
      if (line[field] !== amount)
        commit((current) => ({
          ...current,
          budget: current.budget.map((item) =>
            item.id === id ? { ...item, [field]: amount } : item,
          ),
        }));
    } catch {
      onError("Enter an amount with up to two decimal places.");
      input.value = String(line[field] / 100);
    }
  }
  return (
    <>
      <div className="section-heading spaced">
        <div>
          <h2>Good memories. A comfortable budget.</h2>
          <p>Set allocations, record payments, and protect your priorities.</p>
        </div>
        <div className="inline-actions">
          <button
            className="button secondary"
            onClick={() =>
              download(budgetCsv(event), "gather-budget.csv", "text/csv")
            }
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            className="button primary"
            disabled={readOnly}
            onClick={onScenario}
          >
            <WandSparkles size={16} />
            Compare a scenario
          </button>
        </div>
      </div>
      <div className="budget-summary">
        <div>
          <span>Total budget</span>
          <strong>{money(event.brief.budget, event.brief.currency)}</strong>
        </div>
        <div>
          <span>Allocated</span>
          <strong>{money(stats.allocated, event.brief.currency)}</strong>
        </div>
        <div>
          <span>Paid so far</span>
          <strong>{money(stats.paid, event.brief.currency)}</strong>
        </div>
        <div className={stats.remaining < 0 ? "late" : ""}>
          <span>{stats.remaining < 0 ? "Over budget" : "Unallocated"}</span>
          <strong>
            {money(Math.abs(stats.remaining), event.brief.currency)}
          </strong>
        </div>
      </div>
      {stats.paid > event.brief.budget && (
        <p role="alert" className="error">
          Recorded payments exceed your total budget. Review costs or increase
          the budget; payments have been preserved.
        </p>
      )}
      {stats.remaining < 0 && (
        <p role="alert" className="error">
          Your allocations exceed the budget by{" "}
          {money(-stats.remaining, event.brief.currency)}. Review categories or
          compare a larger budget.
        </p>
      )}
      <div
        className="panel table-scroll"
        role="region"
        aria-label="Budget allocations"
        tabIndex={0}
      >
        <table className="budget-table">
          <caption className="sr-only">
            Editable budget in {event.brief.currency}. Values save when you
            leave each field.
          </caption>
          <thead>
            <tr>
              <th scope="col">CATEGORY</th>
              <th scope="col">PLANNED / COMMITTED</th>
              <th scope="col">PAID</th>
              <th scope="col">PROTECT</th>
            </tr>
          </thead>
          <tbody>
            {event.budget.map((line) => (
              <tr key={line.id}>
                <th scope="row">
                  {line.name}
                  {line.paid > line.amount && (
                    <small className="late">Payments exceed allocation</small>
                  )}
                </th>
                <td>
                  <label className="money-input">
                    <span>{event.brief.currency}</span>
                    <input
                      aria-label={`Planned ${line.name}`}
                      inputMode="decimal"
                      defaultValue={String(line.amount / 100)}
                      key={`${line.id}-amount-${line.amount}`}
                      disabled={line.locked || readOnly}
                      onBlur={(e) =>
                        edit(line.id, "amount", e.target.value, e.target)
                      }
                    />
                  </label>
                </td>
                <td>
                  <label className="money-input">
                    <span>{event.brief.currency}</span>
                    <input
                      aria-label={`Paid ${line.name}`}
                      disabled={readOnly}
                      inputMode="decimal"
                      defaultValue={String(line.paid / 100)}
                      onBlur={(e) =>
                        edit(line.id, "paid", e.target.value, e.target)
                      }
                    />
                  </label>
                </td>
                <td>
                  <button
                    className={`lock-button ${line.locked ? "locked" : ""}`}
                    aria-label={`${line.locked ? "Unlock" : "Protect"} ${line.name}`}
                    aria-pressed={line.locked}
                    disabled={readOnly}
                    onClick={() =>
                      commit((current) => ({
                        ...current,
                        budget: current.budget.map((item) =>
                          item.id === line.id
                            ? { ...item, locked: !item.locked }
                            : item,
                        ),
                      }))
                    }
                  >
                    {line.locked ? (
                      <LockKeyhole size={17} />
                    ) : (
                      <Unlock size={17} />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted spaced">
        Protected allocations are preserved during scenario comparisons. Quotes
        stay in Vendors; enter agreed costs here. Payments are never reduced
        automatically.
      </p>
    </>
  );
}
