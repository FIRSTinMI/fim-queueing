import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/data/supabase";
import { TournamentLevel } from "@/hooks/supabase/useGetMatches";

export type ScheduleDeviation = {
  id: number,
  description: string | null,
  after_match_id: {
    id: number
  }
  associated_match_id: {
    id: number
  } | null
};

export const useGetScheduleDeviationsQueryKey = (level: TournamentLevel) => ["scheduleDeviations", level];

export const useGetScheduleDeviations = (level: TournamentLevel) => {
  return useQuery({
    queryKey: useGetScheduleDeviationsQueryKey(level),
    queryFn: async () => {
      const result = await supabase
        .from("schedule_deviations")
        .select("id,description,after_match_id(id),associated_match_id(id)")
        .eq('after_match_id.tournament_level', level)
        .returns<ScheduleDeviation[]>();
      
      if (result.error != null) throw result.error;
      
      return result.data;
    }
  });
}