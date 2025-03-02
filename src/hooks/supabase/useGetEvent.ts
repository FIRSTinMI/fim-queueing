import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/data/supabase";

export type EventStatus =
  'NotStarted' |
  'AwaitingQuals' |
  'QualsInProgress' |
  'AwaitingAlliances' |
  'AwaitingPlayoffs' |
  'PlayoffsInProgress' |
  'WinnerDetermined' |
  'Completed';

export type Event = {
  id: string,
  key: string,
  code: string,
  name: string,
  status: EventStatus,
  seasons?: {
    name: string
  }
};

export const useGetEventQueryKey = () => ["events"];

export const useGetEvent = (enabled: boolean = true) => {
  return useQuery({
    queryKey: useGetEventQueryKey(),
    queryFn: async (): Promise<Event | null> => {
      const result = await supabase
        .from("events")
        .select("id,key,code,name,status,seasons(name)")
        .maybeSingle<Event>();
      
      if (result.error != null) throw result.error;
      
      return result.data;
    },
    staleTime: Infinity,
    enabled: enabled,
  });
}