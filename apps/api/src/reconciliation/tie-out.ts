import { Money, Rollforward, sumMoney } from "@repo/domain";

import type { CanonicalStore } from "../ingestion/types.js";
import { priorPeriod } from "./period.js";

export class TieOutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TieOutError";
  }
}

export function tieOut(
  account: string,
  period: string,
  store: CanonicalStore,
): Rollforward {
  const prior = priorPeriod(period);
  const beginBal = store.balance(account, prior);
  const endBal = store.balance(account, period);

  if (!beginBal) {
    throw new TieOutError(
      `missing beginning balance for account ${account} in period ${prior}`,
    );
  }
  if (!endBal) {
    throw new TieOutError(
      `missing GL ending balance for account ${account} in period ${period}`,
    );
  }

  const txns = store.transactions({ account, period });
  const additions = sumMoney(
    txns
      .filter((t) => t.direction === "addition")
      .map((t) => t.signedAmount),
  );
  const reductions = sumMoney(
    txns
      .filter((t) => t.direction === "reduction")
      .map((t) => Math.abs(t.signedAmount) as typeof t.signedAmount),
  );

  const begin = beginBal.balance;
  const glEnd = endBal.balance;
  const endComputed = Money.parse(begin + additions - reductions);
  const unexplainedDifference = Money.parse(glEnd - endComputed);

  return Rollforward.parse({
    beginningBalance: begin,
    additions,
    reductions,
    endingBalance: endComputed,
    glBalance: glEnd,
    ties: endComputed === glEnd,
    unexplainedDifference,
  });
}
