import type { Brief } from "./schema";

export function money(
  amount: number,
  currency: Brief["currency"] = "INR",
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 100 ? 2 : 0,
  }).format(amount / 100);
}

/** All supported currencies have two minor decimal places. Reject, rather than round, excess precision. */
export function parseMoney(value: string): number {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value))
    throw new Error(
      "Enter a non-negative amount with up to two decimal places.",
    );
  const [whole, fraction = ""] = value.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result)) throw new Error("Amount is too large.");
  return result;
}

export function allocate(total: number, weights: number[]): number[] {
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    !weights.length ||
    weights.some((w) => !Number.isSafeInteger(w) || w < 0)
  )
    throw new Error("Invalid allocation");
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) throw new Error("Allocation weights cannot all be zero");
  const result = weights.map((w) =>
    Number((BigInt(total) * BigInt(w)) / BigInt(sum)),
  );
  let remainder = total - result.reduce((a, b) => a + b, 0);
  const order = weights
    .map((w, i) => ({ i, fraction: (BigInt(total) * BigInt(w)) % BigInt(sum) }))
    .sort((a, b) =>
      a.fraction === b.fraction ? a.i - b.i : a.fraction > b.fraction ? -1 : 1,
    );
  for (const item of order) {
    if (!remainder) break;
    result[item.i]++;
    remainder--;
  }
  return result;
}
