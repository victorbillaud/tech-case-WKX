import Papa from "papaparse";

import { Account, dollarsToCents } from "@repo/domain";

import type { RawTransaction } from "./types.js";

function parseCsv(text: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return result.data;
}

/** chart_of_accounts.csv → Account[] (validated). */
export function parseChart(text: string): Account[] {
  return parseCsv(text).map((row) =>
    Account.parse({
      number: row.account_number,
      name: row.account_name,
      type: row.account_type,
      category: row.category,
      reconciliationFrequency: row.reconciliation_frequency,
      preparer: row.preparer,
      reviewer: row.reviewer,
      riskLevel: row.risk_level,
      description: row.description || undefined,
    }),
  );
}

/** A balance row before sign normalization (raw dollars from the CSV). */
export interface RawBalance {
  account: string;
  period: string; // "2025-12"
  dollars: number;
}

const MONTH_COLUMN = /^([a-z]{3})_(\d{4})$/;
const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** account_balances.csv → long form RawBalance[] (wide month columns → rows). */
export function parseBalances(text: string): RawBalance[] {
  const rows = parseCsv(text);
  const balances: RawBalance[] = [];

  for (const row of rows) {
    const account = row.account_number;
    for (const [column, value] of Object.entries(row)) {
      const match = MONTH_COLUMN.exec(column);
      if (!match) continue;
      const [, mon, year] = match;
      const month = MONTHS[mon];
      if (!month) continue;
      balances.push({
        account,
        period: `${year}-${month}`,
        dollars: Number(value),
      });
    }
  }

  return balances;
}

/** gl_transactions/*.csv → RawTransaction[] (debit/credit converted to cents). */
export function parseGl(text: string): RawTransaction[] {
  return parseCsv(text).map((row) => ({
    txnDate: row.transaction_date,
    postDate: row.post_date,
    account: row.account_number,
    description: row.description,
    reference: row.reference,
    debit: dollarsToCents(Number(row.debit || 0)),
    credit: dollarsToCents(Number(row.credit || 0)),
    source: row.source,
    enteredBy: row.entered_by,
    department: row.department,
  }));
}
