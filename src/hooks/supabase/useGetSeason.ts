import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/data/supabase";

export type Season = {
  id: string,
  name: string
};

export const useGetSeasonQueryKey = () => ["season"];

export const useGetSeason = (enabled: boolean = true) => {
  return useQuery({
    queryKey: useGetSeasonQueryKey(),
    queryFn: async (): Promise<Season | null> => {
      const result = await supabase.from("seasons").select().maybeSingle<Season>();
      
      if (result.error != null) throw result.error;
      
      return result.data;
    },
    enabled: enabled,
    staleTime: Infinity
  });
}