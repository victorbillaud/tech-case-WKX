# ADR-0009 — Represent money as integer cents

**Status:** accepted

## Context

TypeScript has no native decimal type, and JavaScript `number` is IEEE-754
floating point. Reconciliations require **exact** arithmetic — the rollforward
must tie to $0.00 (Rule 1.1), and rounding drift is unacceptable.

## Decision

Represent all monetary values as **integer minor units (cents)**, modeled as a
**branded** Zod type (`z.number().int().brand<"Cents">()`) so cents cannot be
accidentally mixed with raw numbers. Formatting to `$X,XXX.XX` happens only at
the presentation boundary.

## Rationale

- Integer arithmetic is exact and fast; no float drift in sums/ties.
- Branding prevents unit-confusion bugs at compile time.
- Source amounts in the data are whole dollars, well within safe integer range
  even expressed as cents.

## Alternatives considered

- **`number` (float dollars):** simplest but risks rounding errors on sums —
  rejected for an accounting system.
- **`decimal.js` / big.js:** maximal precision but heavier ergonomics; overkill
  given amounts fit safely in `Number.MAX_SAFE_INTEGER` as cents. Can revisit if
  we ever handle FX/fractional rates beyond display.

## Consequences

- A small `Money` helper module (parse, add, subtract, format) wraps the branded
  type; all arithmetic goes through it.
- CSV parsing converts dollars → cents at ingestion; presentation converts back.
