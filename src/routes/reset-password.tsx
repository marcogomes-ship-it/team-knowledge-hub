import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Hostify Library" },
      { name: "description", content: "Choose a new password for the Hostify Library." },
      { property: "og:title", content: "Reset password — Hostify Library" },
      { property: "og:description", content: "Choose a new password for the Hostify Library." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/library" });
  };
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 shadow-soft">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <Input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" />
        <Button className="w-full">Save password</Button>
      </form>
    </div>
  );
}
