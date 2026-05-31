import { useState } from "react";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldDescription, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";

interface UploadPanelProps {
  onUpload: (files: File[]) => void;
  isPending: boolean;
}

export function UploadPanel({ onUpload, isPending }: UploadPanelProps) {
  const [selected, setSelected] = useState<File[]>([]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSelected(Array.from(event.target.files ?? []));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload period files</CardTitle>
        <CardDescription>
          Drop the case CSVs and supporting documents (individual files, no zip).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel htmlFor="period-files">Files</FieldLabel>
          <Input
            id="period-files"
            type="file"
            multiple
            onChange={handleChange}
          />
          {selected.length > 0 && (
            <FieldDescription>
              {selected.length} file(s) selected
            </FieldDescription>
          )}
        </Field>
      </CardContent>
      <CardFooter>
        <Button
          disabled={selected.length === 0 || isPending}
          onClick={() => onUpload(selected)}
        >
          {isPending ? "Ingesting…" : `Ingest ${selected.length || ""} file(s)`}
        </Button>
      </CardFooter>
    </Card>
  );
}
