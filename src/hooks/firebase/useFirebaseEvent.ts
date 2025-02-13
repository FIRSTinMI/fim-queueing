import { useRealtimeEvent } from "@/hooks/supabase/useRealtimeEvent";
import { useEffect } from "preact/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDatabase, onValue, ref } from "firebase/database";
import { Alliance } from "@/types";
import { Event } from "@shared/DbTypes";

export const useFirebaseEvent = () => {
  const { data } = useRealtimeEvent();
  const queryClient = useQueryClient();
  const firebaseQuery = useQuery<Event>({
    queryKey: ["firebase-event"],
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!data?.seasons?.name || !data?.code) return () => {};
    const dbRef = ref(getDatabase(), `/seasons/${data?.seasons?.name}/events/${data?.code}`);
    const unsubscribe = onValue(dbRef, (snap) => {
      queryClient.setQueryData(["firebase-event"], () => {
        snap.val()
      });
    });
    return () => unsubscribe();
  }, [queryClient, data?.code, data?.seasons?.name]);
  
  return firebaseQuery;
}