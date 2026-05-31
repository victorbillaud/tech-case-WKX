import {
  type Account,
  AccountBalance,
  deriveTransactionFlags,
  type Money,
  Transaction,
} from "@repo/domain";

import type { RawBalance } from "./parsers.js";
import type { RawTransaction } from "./types.js";

/** Accounts whose balance increases on a credit (vs a debit). */
const CREDIT_NORMAL = new Set<string>(["Liability", "Equity", "Revenue"]);

function isCreditNormal(type: string): boolean {
  return CREDIT_NORMAL.has(type);
}

/** Sign-normalize a balance to the account's natural side (liabilities positive). */
export function normalizeBalance(
  raw: RawBalance,
  account: Account | undefined,
): AccountBalance {
  const cents = Math.round(raw.dollars * 100);
  // CSV stores credit-normal accounts as negative; flip to natural (positive).
  const natural = account && isCreditNormal(account.type) ? -cents : cents;
  return AccountBalance.parse({
    account: raw.account,
    period: raw.period,
    balance: natural as Money,
  });
}

/**
 * Signed amount in the account's natural balance direction.
 * Most credit-normal accounts ↑ on credit; Accruals in this GL export ↑ on debit.
 */
function transactionSignedAmount(
  raw: RawTransaction,
  account: Account | undefined,
): number {
  if (!account) return raw.debit - raw.credit;

  if (isCreditNormal(account.type)) {
    if (account.category === "Accruals") {
      return raw.debit - raw.credit;
    }
    return raw.credit - raw.debit;
  }

  return raw.debit - raw.credit;
}

/** Sign/direction/flag normalization for a GL line (Layer 1 [3]). */
export function normalizeTransaction(
  raw: RawTransaction,
  account: Account | undefined,
): Transaction {
  const signed = transactionSignedAmount(raw, account);

  return Transaction.parse({
    ...raw,
    signedAmount: signed as Money,
    direction: signed >= 0 ? "addition" : "reduction",
    category: null,
    flags: deriveTransactionFlags(raw, signed),
  });
}
