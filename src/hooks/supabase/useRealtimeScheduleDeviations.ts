import { useEffect } from "preact/hooks";
import { Match, TournamentLevel, useGetMatches, useGetMatchesQueryKey } from "@/hooks/supabase/useGetMatches";
import { supabase } from "@/data/supabase";
import { useQueryClient } from "@tanstack/react-query";
import {
  ScheduleDeviation,
  useGetScheduleDeviations,
  useGetScheduleDeviationsQueryKey
} from "@/hooks/supabase/useGetScheduleDeviations";

export const useRealtimeScheduleDeviations = (level: TournamentLevel) => {
  const queryClient = useQueryClient();
  const query = useGetScheduleDeviations(level);
  
  useEffect(() => {
    const changes = supabase.channel('schedule-deviation-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'schedule_deviations',
        filter: 'tournament_level=eq.' + encodeURIComponent(level)
      }, (payload) => {
        const changeType = payload.eventType;
        if (changeType === 'INSERT') {
          queryClient.setQueryData(useGetScheduleDeviationsQueryKey(level), (oldData: ScheduleDeviation[]) => {
            return [...oldData, payload.new];
          });
        } else if (changeType === 'DELETE') {
          queryClient.setQueryData(useGetScheduleDeviationsQueryKey(level), (oldData: ScheduleDeviation[]) => {
            return oldData.filter(m => m.id !== payload.old.id);
          });
        } else if (changeType === 'UPDATE') {
          queryClient.setQueryData(useGetScheduleDeviationsQueryKey(level), (oldData: ScheduleDeviation[]) => {
            return oldData.map(m => m.id === payload.old.id ? payload.new : m);
          });
        }
      })
      .subscribe();
    
    return async () => { await changes.unsubscribe(); };
  }, []);
  
  return query;
}