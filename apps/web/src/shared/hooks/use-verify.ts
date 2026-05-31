import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { queryKeys } from "../api/keys.js";
import {
  approveReconciliation,
  getLintReport,
  verifyReconciliationStream,
} from "../api/verify.js";
import {
  applyVerifyProgressEvent,
  INITIAL_VERIFY_PROGRESS,
  type VerifyProgressState,
} from "../api/verify-progress.js";
import type { ApprovalInput } from "../api/types.js";
import { POC_ACCOUNT } from "../constants.js";

export function useLintReport(period: string, account = POC_ACCOUNT) {
  return useQuery({
    queryKey: queryKeys.lint(period, account),
    queryFn: () => getLintReport(period, account),
    retry: false,
  });
}

export function useVerify(period: string, account = POC_ACCOUNT) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<VerifyProgressState>(
    INITIAL_VERIFY_PROGRESS,
  );

  return {
    ...useMutation({
      mutationFn: () =>
        verifyReconciliationStream(period, account, (event) => {
          setProgress((current) => applyVerifyProgressEvent(current, event));
          if (event.type === "complete") {
            queryClient.setQueryData(
              queryKeys.reconciliation(period, account),
              event.reconciliation,
            );
          }
        }),
      onMutate: () => {
        setProgress(INITIAL_VERIFY_PROGRESS);
      },
      onSuccess: (report) => {
        queryClient.setQueryData(queryKeys.lint(period, account), report);
        void queryClient.invalidateQueries({
          queryKey: queryKeys.reconciliation(period, account),
        });
      },
    }),
    progress,
  };
}

export function useApprove(period: string, account = POC_ACCOUNT) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApprovalInput) =>
      approveReconciliation(period, account, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.reconciliation(period, account),
      });
    },
  });
}
