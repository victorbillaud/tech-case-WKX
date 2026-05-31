import { z } from "zod";

import type { Money } from "./money.js";
import { TransactionFlag } from "./transaction.js";

export type TransactionFlagValue = z.infer<typeof TransactionFlag>;

/** Minimal fields needed to derive deterministic transaction flags. */
export interface FlaggableTransaction {
    source: string;
    description: string;
}

const OVER_100K = 100_000_00; // cents
const ROUND_STEP = 50_000_00; // cents

const KEYWORD_ADJUSTMENT = /true-?up|adjustment|correction/i;
const KEYWORD_PLUG = /\bplug\b|to balance|to tie|balancing/i;

interface FlagRule {
    flag: TransactionFlagValue;
    test: (txn: FlaggableTransaction, magnitude: number) => boolean;
}

const FLAG_RULES: FlagRule[] = [
    { flag: "manual_je", test: (txn) => txn.source === "Manual JE" },
    { flag: "over_100k", test: (_, magnitude) => magnitude > OVER_100K },
    {
        flag: "round_number",
        test: (_, magnitude) => magnitude !== 0 && magnitude % ROUND_STEP === 0,
    },
    {
        flag: "keyword_adjustment",
        test: (txn) => KEYWORD_ADJUSTMENT.test(txn.description),
    },
    { flag: "keyword_plug", test: (txn) => KEYWORD_PLUG.test(txn.description) },
];

/** Derive deterministic risk flags from a transaction and its signed amount. */
export function deriveTransactionFlags(
    txn: FlaggableTransaction,
    signedAmount: Money | number,
): TransactionFlagValue[] {
    const magnitude = Math.abs(signedAmount);
    return FLAG_RULES.filter((rule) => rule.test(txn, magnitude)).map(
        (rule) => rule.flag,
    );
}
