import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";

interface ApproveFormProps {
  onApprove: (input: { reviewer: string; role: string; comments: string }) => void;
  isPending: boolean;
  isSuccess: boolean;
  error: Error | null;
  disabled?: boolean;
  disabledReason?: string;
}

export function ApproveForm({
  onApprove,
  isPending,
  isSuccess,
  error,
  disabled = false,
  disabledReason,
}: ApproveFormProps) {
  const [reviewer, setReviewer] = useState("");
  const [role, setRole] = useState("Controller");
  const [comments, setComments] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Human approval</CardTitle>
        <CardDescription>
          Reviewer must differ from preparer (agent) — Rule 6.1.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="reviewer">Reviewer</FieldLabel>
              <Input
                id="reviewer"
                value={reviewer}
                onChange={(event) => setReviewer(event.target.value)}
                placeholder="Sarah Chen"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="role">Role</FieldLabel>
              <Input
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="comments">Comments</FieldLabel>
            <Textarea
              id="comments"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              rows={4}
            />
            <FieldDescription>
              Optional notes recorded in the audit trail.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="flex-col items-start gap-3">
        <Button
          disabled={!reviewer || isPending || isSuccess || disabled}
          onClick={() => onApprove({ reviewer, role, comments })}
        >
          {isSuccess
            ? "Approved"
            : isPending
              ? "Submitting…"
              : "Approve reconciliation"}
        </Button>
        {disabled && disabledReason && (
          <Alert className="w-full">
            <AlertTitle>Approval unavailable</AlertTitle>
            <AlertDescription>{disabledReason}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="w-full">
            <AlertTitle>Approval failed</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        {isSuccess && (
          <Alert className="w-full">
            <AlertTitle>Approved</AlertTitle>
            <AlertDescription>
              Reconciliation approved and recorded.
            </AlertDescription>
          </Alert>
        )}
      </CardFooter>
    </Card>
  );
}
