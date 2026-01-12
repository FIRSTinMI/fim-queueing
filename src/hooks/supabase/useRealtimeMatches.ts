import { useEffect } from "preact/hooks";
import { Match, TournamentLevel, useGetMatches, useGetMatchesQueryKey } from "@/hooks/supabase/useGetMatches";
import { supabase } from "@/data/supabase";
import { useQueryClient } from "@tanstack/react-query";

export const useRealtimeMatches = (level: TournamentLevel) => {
  const queryClient = useQueryClient();
  const query = useGetMatches(level);
  
  useEffect(() => {
    const changes = supabase.channel('match-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: 'tournament_level=eq.' + encodeURIComponent(level)
      }, (payload) => {
        const changeType = payload.eventType;
        if (changeType === 'INSERT') {
          queryClient.setQueryData(useGetMatchesQueryKey(level), (oldData: Match[]) => {
            return [...oldData, payload.new];
          });
        } else if (changeType === 'DELETE') {
          queryClient.setQueryData(useGetMatchesQueryKey(level), (oldData: Match[]) => {
            return oldData.filter(m => m.id !== payload.old.id);
          });
        } else if (changeType === 'UPDATE') {
          queryClient.setQueryData(useGetMatchesQueryKey(level), (oldData: Match[]) => {
            return oldData.map(m => m.id === payload.old.id ? payload.new : m);
          });
        }
      })
      .subscribe();
    
    return async () => { await changes.unsubscribe(); };
  }, []);
  
  return query;
}