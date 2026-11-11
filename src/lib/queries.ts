import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const articleListQuery = queryOptions({
  queryKey: ["articles", "list"],
  queryFn: async () => {
    const { data, error } = await supabase.from("articles").select("id, slug, title, category, summary, source, audience, updated_at").order("title");
    if (error) throw error;
    return data;
  },
});

export const articleQuery = (slug: string) => queryOptions({
  queryKey: ["articles", slug],
  queryFn: async () => {
    const { data, error } = await supabase.from("articles").select("*").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const workflowListQuery = queryOptions({
  queryKey: ["workflows", "list"],
  queryFn: async () => {
    const { data, error } = await supabase.from("workflows").select("id, slug, title, summary, category, steps, article_slug").order("title");
    if (error) throw error;
    return data;
  },
});

export const workflowQuery = (slug: string) => queryOptions({
  queryKey: ["workflows", slug],
  queryFn: async () => {
    const { data, error } = await supabase.from("workflows").select("*").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const onboardingQuery = queryOptions({
  queryKey: ["onboarding"],
  queryFn: async () => {
    const [{ data: steps, error }, { data: progress }] = await Promise.all([
      supabase.from("onboarding_steps").select("*").order("position"),
      supabase.from("onboarding_progress").select("step_id"),
    ]);
    if (error) throw error;
    return { steps: steps ?? [], done: new Set((progress ?? []).map((p) => p.step_id)) };
  },
});

export type Step = { title: string; detail: string };
