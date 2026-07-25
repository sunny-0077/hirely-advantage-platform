
## This request doesn't match the current project

Hirely is a resume/career app (Resume Analyzer, ATS Optimizer, Gap Analysis, Resume Builder, Cover Letter, Interview Prep). There is no inbox, Gmail integration, label list, or `unreadCount` field anywhere in the codebase — no component consumes mock unread counts today.

Confirmed by inspecting the file tree in context: no `Inbox*`, `Labels*`, `Gmail*`, or unread-count component exists under `src/components/` or `src/pages/`, and no Gmail edge function exists under `supabase/functions/`.

## Recommended next step

Pick one so I can produce a real plan:

1. **Wrong project** — skip this task; make no changes. (Recommended — nothing here matches.)
2. **Build a new Gmail inbox page for Hirely** — connect the Gmail App User Connector so each signed-in user links their own Gmail, add a server route that lists labels with `messagesUnread`, and render a labels sidebar/list that shows real per-label unread counts. This is a net-new feature (~1 page + 1 edge function + connector setup), not a "wiring" change.
3. **You'll point me at the component** — paste the file path or component code that currently uses mock unread counts and I'll wire it to real label data.

I won't guess between these — options 2 and 3 lead to very different work, and option 1 means no code changes at all.
