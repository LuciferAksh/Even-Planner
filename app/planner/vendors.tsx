"use client";
import { ShieldCheck, ClipboardList } from "lucide-react";
import type { EventPlan } from "../../domain/schema";
import { parseMoney } from "../../domain/money";
export function Vendors({
  active,
  changeVendor,
  setError,
}: {
  active: EventPlan;
  changeVendor: (
    id: string,
    patch: Partial<EventPlan["vendors"][number]>,
  ) => void;
  setError: (message: string) => void;
}) {
  return (
    <>
      <div className="section-heading spaced">
        <div>
          <h2>The people who make it happen.</h2>
          <p>
            Research your own vendors, compare quotes, and keep bookings in
            sight.
          </p>
        </div>
      </div>
      <p className="info-line">
        <ShieldCheck size={16} />
        Vendor categories are suggestions. Names, prices, and availability must
        be verified by you.
      </p>
      <div className="vendor-grid">
        {active.vendors.map((vendor) => (
          <section className="panel vendor-card" key={vendor.id}>
            <div className="panel-heading">
              <h3>{vendor.category}</h3>
              <ClipboardList size={18} />
            </div>
            <label>
              Vendor name
              <input
                maxLength={100}
                placeholder="Add a vendor you’ve found"
                defaultValue={vendor.name}
                onBlur={(e) => {
                  if (e.target.value !== vendor.name)
                    changeVendor(vendor.id, {
                      name: e.target.value,
                    });
                }}
              />
            </label>
            <div className="form-grid">
              <label>
                Booking status
                <select
                  value={vendor.status}
                  onChange={(e) =>
                    changeVendor(vendor.id, {
                      status: e.target.value as typeof vendor.status,
                    })
                  }
                >
                  {["To research", "Contacted", "Shortlisted", "Booked"].map(
                    (status) => (
                      <option key={status}>{status}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Quote ({active.brief.currency})
                <input
                  inputMode="decimal"
                  defaultValue={(vendor.quote / 100).toString()}
                  onBlur={(e) => {
                    try {
                      const quote = parseMoney(e.target.value);
                      if (quote !== vendor.quote)
                        changeVendor(vendor.id, { quote });
                    } catch {
                      setError(
                        "Enter a valid quote with up to two decimal places.",
                      );
                      e.target.value = String(vendor.quote / 100);
                    }
                  }}
                />
              </label>
            </div>
            <h4>Good questions to ask</h4>
            <ul>
              {vendor.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
            <p className="small muted">
              Quotes are tracked separately. Record committed costs and payments
              in Budget.
            </p>
          </section>
        ))}
      </div>
    </>
  );
}
