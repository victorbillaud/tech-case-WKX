import { z } from "zod";

export const DocType = z.enum([
  "invoice",
  "contract",
  "email",
  "calculation_memo",
  "report",
]);

export const SupportingDocument = z.object({
  docId: z.string(),
  docType: DocType.nullable(),
  sourcePath: z.string(),
  raw: z.string(),
  relatedReferences: z.array(z.string()),
  relatedAccounts: z.array(z.string()),
});
export type SupportingDocument = z.infer<typeof SupportingDocument>;
