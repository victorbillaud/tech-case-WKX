# Data Overview

This folder contains anonymized accounting data from TechCorp's month-end close.

## Period Structure

The data covers two monthly periods:

- **November 2025 (Reference Period)**: GL transactions and completed reconciliations are provided.
- **December 2025 (Target Period)**: GL transactions and supporting documents are provided, but no completed reconciliations. 

Prior reconciliations from **October 2025** are also included as an additional reference (note: lower quality, with reviewer feedback on what to improve).

## Structure

- **`chart_of_accounts.csv`** - Complete chart of accounts with account numbers, names, types, and reconciliation requirements
- **`account_balances.csv`** - Monthly account balances for the past 6 months (Jul-Dec 2025)
- **`gl_transactions/`** - Detailed general ledger transactions for November and December 2025
- **`prior_reconciliations/`** - Completed reconciliations from October and November (reference examples)
- **`supporting_documents/`** - Invoices, contracts, emails, and other source documents
- **`reference/`** - Company policies, processes, and other reference materials

## Data Quality

The data is representative of real-world accounting data:
- GL transaction files are **representative samples**, not exhaustive exports — they contain major transactions but not every entry for the period
- Some transaction descriptions are vague or incomplete (realistic)
- Some supporting documents are missing or need to be hunted down
- There are timing differences, manual journal entries, and anomalies to investigate
- Prior reconciliations vary in quality (October is minimal with reviewer feedback; November is thorough and approved)
- Supporting documents may not perfectly match GL amounts — cross-referencing and investigation are required
- Account balances in `account_balances.csv` are the authoritative source for beginning/ending balances

This mirrors the messy reality that accounting teams deal with.
