import { useEffect } from "preact/hooks";
import { supabase } from "@/data/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Ranking, useGetRankings, useGetRankingsQueryKey } from "@/hooks/supabase/useGetRankings";

export const useRealtimeRankings = () => {
  const queryClient = useQueryClient();
  const query = useGetRankings();
  
  useEffect(() => {
    const changes = supabase.channel('ranking-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_rankings'
      }, (payload) => {
        const changeType = payload.eventType;
        if (changeType === 'INSERT') {
          queryClient.setQueryData(useGetRankingsQueryKey(), (oldData: Ranking[]) => {
            return [...oldData, payload.new];
          });
        } else if (changeType === 'DELETE') {
          queryClient.setQueryData(useGetRankingsQueryKey(), (oldData: Ranking[]) => {
            return oldData.filter(m => m.id !== payload.old.id);
          });
        } else if (changeType === 'UPDATE') {
          queryClient.setQueryData(useGetRankingsQueryKey(), (oldData: Ranking[]) => {
            return oldData.map(m => m.id === payload.old.id ? payload.new : m);
          });
        }
      })
      .subscribe();
    
    return async () => { await changes.unsubscribe(); };
  }, []);
  
  return query;
}