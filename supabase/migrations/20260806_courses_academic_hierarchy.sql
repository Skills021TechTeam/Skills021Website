-- ============================================================================
-- Skills021 — Additive migration
-- Run this ONCE in Supabase → SQL Editor. Safe to run more than once.
--
-- Adds: "Courses panel now uses the same College → Course → Branch →
-- Semester → Subject hierarchy filter as the Resources panel."
--
-- How it works (same pattern already used by the `resources` table):
-- a course only needs to store a single `subject_id` foreign key — the rest
-- of the chain (Branch → Course → College) is derived automatically via the
-- existing `subjects → semesters → branches → courses → colleges` joins.
-- This is purely additive: `subject_id` is nullable, so every existing
-- course keeps working exactly as before until an admin assigns it a
-- hierarchy from the Admin panel.
-- ============================================================================

alter table public.site_courses
  add column if not exists subject_id bigint references public.subjects(id) on delete set null;

create index if not exists site_courses_subject_id_idx on public.site_courses(subject_id);
