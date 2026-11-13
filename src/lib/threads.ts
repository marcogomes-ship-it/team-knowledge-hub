import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const threadsQuery = queryOptions({
  queryKey: ["threads"],
  queryFn: async () => {
    const { data, error } = await supabase.from("chat_threads").select("id, title, updated_at").order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export async function createThread() {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("chat_threads").insert({ user_id: u.user!.id }).select("id").single();
  if (error) throw error;
  return data.id;
}
