import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/data/supabase";

export type Ranking = {
  id: number,
  team_number: number,
  rank: number,
  sort_orders: number[],
  wins: number,
  ties: number,
  losses: number,
  qual_average: number,
  disqualifications: number,
  matches_played: number
};

export const useGetRankingsQueryKey = () => ["rankings"];

export const useGetRankings = (enabled: boolean = true) => {
  return useQuery({
    queryKey: useGetRankingsQueryKey(),
    queryFn: async (): Promise<Ranking[] | null> => {
      const result = await supabase
        .from("event_rankings")
        .select("*")
        .returns<Ranking[]>();
      
      if (result.error != null) throw result.error;
      
      return result.data;
    },
    staleTime: Infinity,
    enabled: enabled,
  });
}