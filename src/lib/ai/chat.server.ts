import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "./run-id.server";

const MODEL = "openai/gpt-6-astra";

function userClient(token: string) {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        h.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const json = (status: number, message: string) => Response.json({ error: message }, { status });

function textOf(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
}

export async function handleChat(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, "Please sign in.");
  const supabase = userClient(token);
  const { data: u, error: uErr } = await supabase.auth.getUser(token);
  if (uErr || !u.user) return json(401, "Please sign in.");
  const userId = u.user.id;

  const body = (await request.json().catch(() => null)) as { messages?: UIMessage[]; threadId?: string } | null;
  const messages = body?.messages;
  const threadId = body?.threadId;
  if (!Array.isArray(messages) || !messages.length || !threadId) return json(400, "Invalid request.");

  const { data: thread } = await supabase.from("chat_threads").select("id, title").eq("id", threadId).maybeSingle();
  if (!thread) return json(404, "Conversation not found.");

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return json(500, "The assistant isn't configured yet.");

  const last = messages[messages.length - 1];
  const question = textOf(last);
  if (last.role === "user") {
    const { error } = await supabase.from("chat_messages").upsert(
      { thread_id: threadId, user_id: userId, message_id: last.id, role: "user", message: last as never },
      { onConflict: "thread_id,message_id" },
    );
    if (error) console.error("save user message", error);
    if (thread.title === "New conversation" && question) {
      await supabase.from("chat_threads").update({ title: question.slice(0, 70), updated_at: new Date().toISOString() }).eq("id", threadId);
    }
  }

  // Retrieve relevant library content for grounding.
  const recent = messages.filter((m) => m.role === "user").slice(-2).map(textOf).join(" ");
  const terms = recent.replace(/[^\p{L}\p{N}\s.-]/gu, " ").split(/\s+/).filter((w) => w.length > 2).slice(0, 12).join(" or ");
  const { data: hits } = terms ? await supabase.rpc("search_library", { q: terms, max_results: 8 }) : { data: [] };
  const articleSlugs = (hits ?? []).filter((h) => h.kind === "article").slice(0, 5).map((h) => h.slug);
  const wfSlugs = (hits ?? []).filter((h) => h.kind === "workflow").slice(0, 3).map((h) => h.slug);
  const [{ data: arts }, { data: wfs }] = await Promise.all([
    articleSlugs.length ? supabase.from("articles").select("slug, title, content").in("slug", articleSlugs) : Promise.resolve({ data: [] as { slug: string; title: string; content: string }[] }),
    wfSlugs.length ? supabase.from("workflows").select("slug, title, steps").in("slug", wfSlugs) : Promise.resolve({ data: [] as { slug: string; title: string; steps: unknown }[] }),
  ]);
  const context = [
    ...(arts ?? []).map((a) => `### Article: ${a.title}\nLink: /articles/${a.slug}\n${a.content.slice(0, 7000)}`),
    ...(wfs ?? []).map((w) => `### Workflow: ${w.title}\nLink: /workflows/${w.slug}\n${JSON.stringify(w.steps).slice(0, 4000)}`),
  ].join("\n\n---\n\n");

  const instructions = `You are the Hostify Library assistant, helping Hostify staff and new joiners (Sales, Customer Success, Support, Finance).
Hostify is a property management system (PMS) and channel manager for short-term rentals.
Answer using ONLY the library excerpts below. Be concise and practical; use short steps or bullet points for procedures.
Always cite the sources you used as markdown links using their Link path, e.g. [Booking.com Integration Training Guide](/articles/bookingcom-guide).
If the excerpts don't contain the answer, say so plainly and suggest who or what to check (e.g. ask the Support team or search the library). Never invent features, prices, names or policies.

LIBRARY EXCERPTS:
${context || "(no matching content found)"}`;

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses(MODEL),
    instructions,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    providerOptions: {
      openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
    },
  });

  const response = result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    onError: (e) => {
      const msg = e instanceof Error ? e.message : String(e);
      if (/429|rate/i.test(msg)) return "The assistant is busy right now. Please try again in a minute.";
      if (/402|credit/i.test(msg)) return "AI credits have run out for this workspace. An admin needs to top up.";
      return "Something went wrong while answering. Please try again.";
    },
    onFinish: async ({ responseMessage }) => {
      const { error } = await supabase.from("chat_messages").upsert(
        { thread_id: threadId, user_id: userId, message_id: responseMessage.id, role: "assistant", message: responseMessage as never },
        { onConflict: "thread_id,message_id" },
      );
      if (error) console.error("save assistant message", error);
      await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    },
  });
  return withLovableAiGatewayRunIdHeader(response, runIdFetch);
}
