import { QueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { fetchHistory, fetchRanking, submitMatch } from "./api";
import { removePending } from "./pending";
import type { MatchRecord } from "./contracts";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  ranking: (page: number) => ["ranking", page] as const,
  history: (playerId: string, page: number) => ["history", playerId, page] as const,
};

export function useRanking(page: number) {
  return useQuery({
    queryKey: queryKeys.ranking(page),
    queryFn: () => fetchRanking(page),
    placeholderData: (prev) => prev,
  });
}

export function useHistory(playerId: string, page: number) {
  return useQuery({
    queryKey: queryKeys.history(playerId, page),
    queryFn: () => fetchHistory(playerId, page),
    placeholderData: (prev) => prev,
  });
}

export function useSubmitMatch() {
  return useMutation({
    mutationFn: (record: MatchRecord) => submitMatch(record),
    onSuccess: (saved) => {
      removePending(saved.id);
      void queryClient.invalidateQueries({ queryKey: ["ranking"] });
      void queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}
