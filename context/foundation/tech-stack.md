---
starter_id: next
package_manager: npm
project_name: slacklans
hints:
  language_family: js
  team_size: solo
  deployment_target: vercel
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: custom
  quality_override: false
  self_check_answers:
    typed: true
    from_official_starter: true
    conventions: true
    docs_current: true
    can_judge_agent: false
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack

Solo after-hours ship of a Polish Gdynia web app in three weeks, on Vercel, with TypeScript and PostgreSQL as soft preferences. You walked the custom path and picked Next.js over the JS web default (Astro + Supabase + Cloudflare) and over T3: Next is the mainstream full-stack React starter, Vercel is its default host, and scaffolding has been run end-to-end. Login is in scope; payments, realtime, AI, and background jobs are not. Auth, Postgres, spot photos, and the map place-picker are extra assembly on Next — they are not first-class in this starter. GitHub Actions auto-deploys on merge to main.
