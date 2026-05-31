import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { queryKeys } from "../api/keys.js";
import { getReconciliation, reconcileAccountStream } from "../api/reconcile.js";
import {
  applyReconcileProgressEvent,
  INITIAL_RECONCILE_PROGRESS,
  type ReconcileProgressState,
} from "../api/reconcile-progress.js";
import { POC_ACCOUNT } from "../constants.js";

export function useReconciliation(period: string, account = POC_ACCOUNT) {
  return useQuery({
    queryKey: queryKeys.reconciliation(period, account),
    queryFn: () => getReconciliation(period, account),
    retry: false,
  });
}

export function useReconcile(period: string, account = POC_ACCOUNT) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<ReconcileProgressState>(
    INITIAL_RECONCILE_PROGRESS,
  );

  const mutation = useMutation({
    mutationFn: () =>
      reconcileAccountStream(period, account, (event) => {
        setProgress((current) => applyReconcileProgressEvent(current, event));
      }),
    onMutate: () => {
      setProgress(INITIAL_RECONCILE_PROGRESS);
    },
    onSuccess: (reconciliation) => {
      queryClient.setQueryData(
        queryKeys.reconciliation(period, account),
        reconciliation,
      );
    },
  });

  return { ...mutation, progress };
}
