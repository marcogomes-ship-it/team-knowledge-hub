<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Library content (articles, workflows, onboarding_steps) lives in the database and is read client-side under RLS; staff = any row in user_roles, editors/admins write. Why: one source editors can update in-app.
- Sign-up is restricted to @hostify.com by a trigger on auth.users; roles are granted only after email confirmation, and the first confirmed user becomes admin. Why: prevents privilege escalation via unverified emails.
- The assistant streams from src/routes/api/chat.ts (src/lib/ai/chat.server.ts), verifies the bearer token, grounds answers with search_library results, and persists UIMessages per thread in chat_messages. Why: answers must cite library sources and history must reload per thread.
- Content imports are one-off scripts kept in the gitignored .import-cache/ folder; re-imports upsert by slug. Why: imported source data should not be committed.
