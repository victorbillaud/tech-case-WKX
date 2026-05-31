import { z } from "zod";

export const Money = z.number().int().brand<"Cents">();
export type Money = z.infer<typeof Money>;

export const Period = z.string().regex(/^\d{4}-\d{2}$/);
export type Period = z.infer<typeof Period>;

/** Convert whole-dollar amounts from CSV into branded cents. */
export function dollarsToCents(dollars: number): Money {
  return Money.parse(Math.round(dollars * 100));
}

/** Format cents as `$X,XXX.XX` (parentheses for negatives deferred). */
export function formatMoney(cents: Money): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = abs / 100;

  return `${sign}$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function sumMoney(values: Money[]): Money {
  return Money.parse(values.reduce((total, value) => total + value, 0));
}
