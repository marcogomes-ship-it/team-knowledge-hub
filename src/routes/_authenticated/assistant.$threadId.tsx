import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import mark from "@/assets/hostify-mark.png";

export const Route = createFileRoute("/_authenticated/assistant/$threadId")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({ q: typeof s["q"] === "string" ? (s["q"] as string) : undefined }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_messages").select("message").eq("thread_id", threadId).order("created_at");
      if (error) throw error;
      return (data ?? []).map((r) => r.message as unknown as UIMessage);
    },
    staleTime: Infinity,
  });
  if (isLoading || !data) return <div className="m-auto text-muted-foreground">Loading conversation…</div>;
  return <ChatWindow key={threadId} threadId={threadId} initial={data} />;
}

function ChatWindow({ threadId, initial }: { threadId: string; initial: UIMessage[] }) {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const sentQ = useRef(false);
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    body: { threadId },
    headers: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.auth.getSession();
      return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
    },
  }), [threadId]);

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (e) => toast.error(e.message || "The assistant couldn't answer. Please try again."),
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      qc.setQueryData(["thread-messages", threadId], undefined);
    },
  });

  useEffect(() => {
    if (q && !sentQ.current && initial.length === 0) {
      sentQ.current = true;
      sendMessage({ text: q });
      navigate({ to: "/assistant/$threadId", params: { threadId }, search: { q: undefined }, replace: true });
    }
  }, [q, initial.length, sendMessage, navigate, threadId]);

  const busy = status === "submitted" || status === "streaming";
  const lastIsUser = messages[messages.length - 1]?.role === "user";

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <img src={mark} alt="" className="mx-auto h-12 w-12" />
              <p className="mt-3">Ask anything about Hostify, our processes or the platform.</p>
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              {m.role === "assistant" && <img src={mark} alt="Hostify assistant" className="mt-1 h-7 w-7 shrink-0" />}
              <MessageContent>
                {m.parts.map((p, i) => {
                  if (p.type === "text") return m.role === "assistant" ? <MessageResponse key={i}>{p.text}</MessageResponse> : <span key={i} className="whitespace-pre-wrap">{p.text}</span>;
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {busy && lastIsUser && (
            <Message from="assistant">
              <img src={mark} alt="" className="mt-1 h-7 w-7 shrink-0" />
              <MessageContent><Shimmer>Searching the library…</Shimmer></MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <PromptInput
        className="mt-3"
        onSubmit={(msg) => {
          if (!msg.text.trim() || busy) return;
          sendMessage({ text: msg.text });
        }}
      >
        <PromptInputTextarea autoFocus placeholder="Ask about a process, channel, feature…" />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={status} onStop={stop} />
        </PromptInputFooter>
      </PromptInput>
      <p className="mt-2 text-center text-xs text-muted-foreground">Answers are based on the library and can be wrong. Check the linked source.</p>
    </div>
  );
}
