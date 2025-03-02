import { useEffect } from "preact/hooks";
import { supabase } from "@/data/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Event, useGetEvent, useGetEventQueryKey } from "@/hooks/supabase/useGetEvent";

/**
 * Note! This will not update data in related tables. E.g., if the season name changes, this won't
 * pick it up.
 */
export const useRealtimeEvent = () => {
  const queryClient = useQueryClient();
  const query = useGetEvent();
  
  // This table is a special case: DB rules prevent fim-queueing from seeing any events
  // other than the one its token is associated with. Therefore, we can assume any changes
  // we hear about pertain to the current event.
  useEffect(() => {
    const changes = supabase.channel('event-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'events'
      }, (payload) => {
        console.log('event rt', payload);
        const changeType = payload.eventType;
        if (changeType === 'INSERT') {
          queryClient.setQueryData(useGetEventQueryKey(), (old: Event | undefined) => {
            return {
              ...old,
              id: payload.new.id,
              key: payload.new.key,
              code: payload.new.code,
              name: payload.new.name,
              status: payload.new.status
            } as Event;
          });
        } else if (changeType === 'DELETE') {
          queryClient.setQueryData(useGetEventQueryKey(), () => {
            return null;
          });
        } else if (changeType === 'UPDATE') {
          queryClient.setQueryData(useGetEventQueryKey(), (old: Event | undefined) => {
            return {
              ...old,
              id: payload.new.id,
              key: payload.new.key,
              code: payload.new.code,
              name: payload.new.name,
              status: payload.new.status
            } as Event;
          });
        }
      })
      .subscribe();
    
    return async () => { await changes.unsubscribe(); };
  }, []);
  
  return query;
}