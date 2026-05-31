import { useState } from "react";

import { DocType } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldLabel } from "@repo/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";

import type { ClassifyResolution } from "@/shared/api/types.js";

interface ClassifyQueueProps {
  items: { docId: string; filename: string }[];
  onResolve: (resolutions: ClassifyResolution[]) => void;
  isPending: boolean;
}

const DOC_TYPES = DocType.options;

export function ClassifyQueue({
  items,
  onResolve,
  isPending,
}: ClassifyQueueProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  if (items.length === 0) {
    return (
      <Alert>
        <AlertTitle>All documents classified</AlertTitle>
        <AlertDescription>
          No documents are waiting for manual type selection.
        </AlertDescription>
      </Alert>
    );
  }

  function handleSubmit() {
    const resolutions: ClassifyResolution[] = items.map((item) => {
      const selected = selections[item.docId];
      return {
        docId: item.docId,
        docType: selected ? DocType.parse(selected) : null,
      };
    });
    onResolve(resolutions);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unclassified documents</CardTitle>
        <CardDescription>
          The classifier returned null — pick a document type for each file.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Document type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.docId}>
                <TableCell className="font-medium">{item.filename}</TableCell>
                <TableCell>
                  <Field>
                    <FieldLabel className="sr-only">
                      Type for {item.filename}
                    </FieldLabel>
                    <Select
                      value={selections[item.docId] ?? ""}
                      onValueChange={(value: string) =>
                        setSelections((prev) => ({
                          ...prev,
                          [item.docId]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full min-w-48">
                        <SelectValue placeholder="Select type…" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <Button disabled={isPending} onClick={handleSubmit}>
          {isPending ? "Saving…" : "Resolve classifications"}
        </Button>
      </CardFooter>
    </Card>
  );
}
