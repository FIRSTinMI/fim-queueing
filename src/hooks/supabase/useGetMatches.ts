import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/data/supabase";

export type Match = {
  id: number,
  match_number: number,
  play_number: number | null,
  red_alliance_teams: number[] | null,
  blue_alliance_teams: number[] | null,
  scheduled_start_time: Date | null,
  actual_start_time: Date | null,
  post_result_time: Date | null,
  is_discarded: boolean | null,
};

export type TournamentLevel = 'Qualification' | 'Playoff';

export const useGetMatchesQueryKey = (level: TournamentLevel) => ["matches", level];

export const useGetMatches = (level: TournamentLevel) => {
  return useQuery({
    queryKey: useGetMatchesQueryKey(level),
    queryFn: async () => {
      const result = await supabase
        .from("matches")
        .select("id,match_number,play_number,red_alliance_teams,blue_alliance_teams,scheduled_start_time,actual_start_time,post_result_time,is_discarded")
        .eq('tournament_level', level)
        .returns<Match[]>();
      
      if (result.error != null) throw result.error;
      
      return result.data;
    }
  });
}