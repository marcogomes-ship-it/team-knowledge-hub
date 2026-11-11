import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
    ]);
    const r = (roles ?? []).map((x) => x.role);
    return {
      user: u.user,
      profile,
      roles: r,
      isStaff: r.length > 0,
      canEdit: r.includes("admin") || r.includes("editor"),
      isAdmin: r.includes("admin"),
    };
  },
});

export function useMe() {
  return useQuery(meQuery);
}
