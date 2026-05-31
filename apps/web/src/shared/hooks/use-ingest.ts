import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchIngestionReport,
  fetchStoreAccountDetail,
  fetchStoreDocument,
  fetchStoreDocuments,
  fetchStoreTransactions,
  ingestPeriod,
  resolveClassifications,
} from "../api/ingestion.js";
import { queryKeys } from "../api/keys.js";
import type { ClassifyResolution, IngestionReport } from "../api/types.js";
import { POC_ACCOUNT } from "../constants.js";

export function useIngestionReport(period: string) {
  return useQuery({
    queryKey: queryKeys.ingestion(period),
    queryFn: () => fetchIngestionReport(period),
  });
}

export function useIngest(period: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (files: File[]) => ingestPeriod(period, files),
    onSuccess: (report) => {
      queryClient.setQueryData(queryKeys.ingestion(period), report);
      void queryClient.invalidateQueries({ queryKey: queryKeys.ingestion(period) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storeTransactions(period),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storeDocuments(period),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storeAccount(period),
      });
    },
  });
}

export function useClassify(period: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resolutions: ClassifyResolution[]) =>
      resolveClassifications(period, resolutions),
    onSuccess: (result) => {
      queryClient.setQueryData<IngestionReport | null>(
        queryKeys.ingestion(period),
        (current) =>
          current
            ? { ...current, unclassified: result.unclassified }
            : null,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storeDocuments(period),
      });
    },
  });
}

export function useStoreTransactions(period: string, account = POC_ACCOUNT) {
  return useQuery({
    queryKey: queryKeys.storeTransactions(period, account),
    queryFn: () => fetchStoreTransactions(period, account),
    retry: false,
  });
}

export function useStoreDocuments(period: string) {
  return useQuery({
    queryKey: queryKeys.storeDocuments(period),
    queryFn: () => fetchStoreDocuments(period),
    retry: false,
  });
}

export function useStoreDocument(period: string, docId: string | null) {
  return useQuery({
    queryKey: queryKeys.storeDocument(period, docId ?? ""),
    queryFn: () => fetchStoreDocument(period, docId!),
    enabled: Boolean(docId),
    retry: false,
  });
}

export function useStoreAccount(period: string, account = POC_ACCOUNT) {
  return useQuery({
    queryKey: queryKeys.storeAccount(period, account),
    queryFn: () => fetchStoreAccountDetail(period, account),
    retry: false,
  });
}
