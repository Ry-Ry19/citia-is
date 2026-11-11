-- 0001_citia_initial_schema.sql
--
-- WHAT: The initial CITIA-IS database schema (Stage 14A): six tables in
--   a dedicated "citia" schema, append-only history tables, row level
--   security, and a least-privilege role (citia_api) for FastAPI.
--
-- WHERE IT RUNS: the CITIA-IS Supabase project (the real thesis
--   database), once, in the SQL Editor, as the project owner
--   ("postgres"). It only CREATES new objects. It does not change or
--   delete anything that already exists, and it runs in one
--   transaction: if any statement fails, nothing is kept.
--
-- NOT IN THIS FILE (done separately, never committed):
--   - the citia_api password:  alter role citia_api with password '...';
--   - the private Storage bucket for report photos;
--   - Supabase Auth settings.
--
-- NO DOWNGRADE: report records must never be destroyed, so there is
--   deliberately no "drop" script for this migration.

begin;

-- ── 1. Schema ──────────────────────────────────────────────────────────────
-- Not added to the Data API's exposed schemas (public, graphql_public),
-- so the Supabase Data API cannot reach these tables.

create schema citia;
comment on schema citia is
  'CITIA-IS application data. Not exposed through the Supabase Data API; accessed only by FastAPI as citia_api.';

-- ── 2. Application role ───────────────────────────────────────────────────
-- Created without a password, so nobody can sign in as it until the
-- owner sets one. No BYPASSRLS: row level security applies to it.

create role citia_api with login noinherit nocreatedb nocreaterole nobypassrls;

-- ── 3. Shared trigger function ────────────────────────────────────────────
-- Functions set an empty search_path and use schema-qualified names.

create function citia.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── 4. staff_profiles ─────────────────────────────────────────────────────
-- One row per CENRO staff member. Credentials, sessions and email live in
-- Supabase Auth (auth.users). Each Auth user has zero or one profile
-- (auth.users 1 ── 0..1 staff_profiles): only users with an active
-- profile may use the staff portal. A profile is never created
-- automatically: inserting one is the deliberate act of granting staff
-- access.

create table citia.staff_profiles (
  id             uuid primary key
                   references auth.users (id) on delete restrict,
  full_name      text not null
                   constraint staff_full_name_length
                   check (length(btrim(full_name)) between 1 and 100),
  role           text not null default 'cenro_staff'
                   constraint staff_role_valid
                   check (role in ('administrator', 'cenro_staff')),
  account_status text not null default 'active'
                   constraint staff_account_status_valid
                   check (account_status in ('active', 'disabled')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table citia.staff_profiles is
  'CENRO staff profiles. id = auth.users.id. Disable accounts instead of deleting them.';

create trigger staff_profiles_touch_updated_at
  before update on citia.staff_profiles
  for each row execute function citia.touch_updated_at();

-- ── 5. sighting_reports ───────────────────────────────────────────────────
-- One row per community Report a Sighting submission.

create table citia.sighting_reports (
  id                   uuid primary key default gen_random_uuid(),  -- FastAPI supplies it
  report_number        bigint not null generated always as identity
                         constraint sighting_reports_report_number_key unique,
  -- CITS-000001. Six digits minimum; grows to seven digits instead of
  -- truncating (plain lpad would cut 1000000 to 100000 and collide).
  reference_number     text not null generated always as (
                         'CITS-' || case
                           when report_number < 1000000
                             then lpad(report_number::text, 6, '0')
                           else report_number::text
                         end
                       ) stored
                         constraint sighting_reports_reference_number_key unique,
  -- Created once by the report form; a retried submission with the same
  -- key returns the existing report instead of creating a duplicate.
  client_submission_id uuid not null
                         constraint sighting_reports_client_submission_id_key unique,
  submitted_at         timestamptz not null default now(),
  study_area           text not null
                         constraint report_study_area_valid
                         check (study_area in ('palao', 'dalipuga', 'npc')),
  barangay             text
                         constraint report_barangay_length
                         check (length(btrim(barangay)) between 1 and 100),
  landmark             text
                         constraint report_landmark_length
                         check (length(btrim(landmark)) between 1 and 200),
  latitude             double precision
                         constraint report_latitude_range
                         check (latitude between -90 and 90),
  longitude            double precision
                         constraint report_longitude_range
                         check (longitude between -180 and 180),
  gps_accuracy_m       real
                         constraint report_gps_accuracy_range
                         check (gps_accuracy_m > 0 and gps_accuracy_m <= 10000),
  observation_type     text not null
                         constraint report_observation_type_valid
                         check (observation_type in ('single_tree', 'multiple_trees', 'seedlings_saplings')),
  community_notes      text
                         constraint report_community_notes_length
                         check (length(community_notes) <= 2000),
  reporter_name        text
                         constraint report_reporter_name_length
                         check (length(btrim(reporter_name)) between 1 and 100),
  reporter_contact     text
                         constraint report_reporter_contact_length
                         check (length(btrim(reporter_contact)) between 1 and 150),
  consent_confirmed    boolean not null
                         constraint report_consent_required
                         check (consent_confirmed),
  -- Cached copy of the latest review, changed only by the report_reviews
  -- trigger; citia_api cannot write these columns.
  review_status        text not null default 'pending_review'
                         constraint report_review_status_valid
                         check (review_status in ('pending_review', 'verified', 'rejected')),
  reviewed_by          uuid references citia.staff_profiles (id) on delete restrict,
  reviewed_at          timestamptz,
  updated_at           timestamptz not null default now(),

  constraint report_coordinates_together
    check ((latitude is null) = (longitude is null)),
  constraint report_accuracy_needs_coordinates
    check (gps_accuracy_m is null or latitude is not null),
  constraint report_review_matches_status
    check (
      (review_status = 'pending_review' and reviewed_by is null and reviewed_at is null)
      or (review_status <> 'pending_review' and reviewed_by is not null and reviewed_at is not null)
    )
);

comment on table citia.sighting_reports is
  'Community sighting reports. Never deleted. review_status is maintained from citia.report_reviews.';

create index sighting_reports_status_submitted_idx
  on citia.sighting_reports (review_status, submitted_at desc);
create index sighting_reports_area_submitted_idx
  on citia.sighting_reports (study_area, submitted_at desc);
create index sighting_reports_mapped_idx
  on citia.sighting_reports (submitted_at desc)
  where latitude is not null;

create trigger sighting_reports_touch_updated_at
  before update on citia.sighting_reports
  for each row execute function citia.touch_updated_at();

-- ── 6. sighting_photos ────────────────────────────────────────────────────
-- Exactly one photo per report: UNIQUE (report_id) allows at most one,
-- and the deferred trigger below requires at least one by commit time.

create table citia.sighting_photos (
  id           uuid primary key default gen_random_uuid(),  -- FastAPI supplies it
  report_id    uuid not null
                 constraint sighting_photos_report_id_key unique
                 references citia.sighting_reports (id) on delete restrict,
  storage_path text not null,
  mime_type    text not null
                 constraint photo_mime_type_valid
                 check (mime_type in ('image/jpeg', 'image/png')),
  byte_size    integer not null
                 constraint photo_byte_size_positive check (byte_size > 0),
  width_px     integer not null
                 constraint photo_width_positive check (width_px > 0),
  height_px    integer not null
                 constraint photo_height_positive check (height_px > 0),
  sha256       text not null
                 constraint photo_sha256_format check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_at  timestamptz not null default now(),

  -- The object key is always built from the two IDs, so it can never be
  -- a user-supplied name or a path outside the report's folder.
  constraint photo_storage_path_matches
    check (
      storage_path = 'reports/' || report_id::text || '/' || id::text
        || case mime_type when 'image/jpeg' then '.jpg' else '.png' end
    )
);

comment on table citia.sighting_photos is
  'The one photo of each report. Image bytes live in a private Supabase Storage bucket.';

-- Lets staff spot the same photo submitted more than once.
create index sighting_photos_sha256_idx on citia.sighting_photos (sha256);

create function citia.check_report_has_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from citia.sighting_photos p where p.report_id = new.id
  ) then
    raise exception 'A sighting report must have exactly one photo.'
      using errcode = '23514', constraint = 'report_requires_photo';
  end if;
  return null;
end;
$$;

create constraint trigger report_requires_photo
  after insert on citia.sighting_reports
  deferrable initially deferred
  for each row execute function citia.check_report_has_photo();

-- ── 7. ai_classifications ─────────────────────────────────────────────────
-- Every AI classification attempt on a photo, never overwritten. The
-- latest result is the newest row with outcome = 'succeeded'.

create table citia.ai_classifications (
  id                   uuid primary key default gen_random_uuid(),
  photo_id             uuid not null
                         references citia.sighting_photos (id) on delete restrict,
  trigger_source       text not null default 'submission'
                         constraint classification_trigger_source_valid
                         check (trigger_source in ('submission', 'rerun')),
  requested_by         uuid references citia.staff_profiles (id) on delete restrict,
  outcome              text not null
                         constraint classification_outcome_valid
                         check (outcome in ('succeeded', 'unavailable', 'failed')),
  label                text
                         constraint classification_label_valid
                         check (label in ('Mahogany', 'Non-Mahogany', 'Non-Tree')),
  -- Same 0–100 scale, one decimal, as the /classify response.
  confidence           numeric(4, 1)
                         constraint classification_confidence_range
                         check (confidence between 0 and 100),
  -- LOW_CONFIDENCE_THRESHOLD in force when this attempt ran.
  confidence_threshold numeric(4, 1)
                         constraint classification_threshold_range
                         check (confidence_threshold between 0 and 100),
  low_confidence       boolean generated always as (confidence < confidence_threshold) stored,
  model_version        text
                         constraint classification_model_version_length
                         check (length(btrim(model_version)) between 1 and 100),
  weights_sha256       text
                         constraint classification_weights_sha256_format
                         check (weights_sha256 ~ '^[0-9a-f]{64}$'),
  classified_at        timestamptz not null default clock_timestamp(),

  -- A successful attempt has a full result; any other attempt has none,
  -- so a failed or unavailable attempt can never look like an analysis.
  constraint classification_result_matches_outcome
    check (
      (outcome = 'succeeded'
        and num_nulls(label, confidence, confidence_threshold, model_version) = 0)
      or (outcome <> 'succeeded'
        and num_nulls(label, confidence, confidence_threshold) = 3)
    ),
  -- A submission attempt has no requester; a re-run must name the staff
  -- member who requested it.
  constraint classification_requester_matches_source
    check (
      (trigger_source = 'submission' and requested_by is null)
      or (trigger_source = 'rerun' and requested_by is not null)
    )
);

comment on table citia.ai_classifications is
  'Append-only history of AI classification attempts per photo. Never updated or deleted.';

create index ai_classifications_photo_time_idx
  on citia.ai_classifications (photo_id, classified_at desc);

-- ── 8. report_reviews ─────────────────────────────────────────────────────
-- Every CENRO review decision, never overwritten. The latest one is
-- copied onto sighting_reports by the trigger below.

create table citia.report_reviews (
  id               uuid primary key default gen_random_uuid(),
  report_id        uuid not null
                     references citia.sighting_reports (id) on delete restrict,
  decision         text not null
                     constraint review_decision_valid
                     check (decision in ('verified', 'rejected')),
  rejection_reason text
                     constraint review_rejection_reason_length
                     check (length(btrim(rejection_reason)) between 1 and 1000),
  staff_notes      text
                     constraint review_staff_notes_length
                     check (length(staff_notes) <= 2000),
  reviewed_by      uuid not null
                     references citia.staff_profiles (id) on delete restrict,
  reviewed_at      timestamptz not null default clock_timestamp(),

  constraint review_reason_matches_decision
    check (
      (decision = 'rejected' and rejection_reason is not null)
      or (decision = 'verified' and rejection_reason is null)
    )
);

comment on table citia.report_reviews is
  'Append-only history of CENRO review decisions. Never updated or deleted.';

create index report_reviews_report_time_idx
  on citia.report_reviews (report_id, reviewed_at desc);
create index report_reviews_reviewer_idx
  on citia.report_reviews (reviewed_by);

-- Copies the new decision onto the report. SECURITY DEFINER: it runs as
-- the owner, so citia_api never needs UPDATE on sighting_reports, and a
-- report's status can only change by writing a review row.
create function citia.apply_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update citia.sighting_reports
     set review_status = new.decision,
         reviewed_by   = new.reviewed_by,
         reviewed_at   = new.reviewed_at
   where id = new.report_id;
  return null;
end;
$$;

create trigger report_reviews_apply
  after insert on citia.report_reviews
  for each row execute function citia.apply_review();

-- ── 9. sighting_recommendations ───────────────────────────────────────────
-- Management Recommendations recorded for a report. Every status change is
-- a new row; the current status of a recommendation is the newest row for
-- its (report_id, recommendation_key).

create table citia.sighting_recommendations (
  id                 uuid primary key default gen_random_uuid(),
  report_id          uuid not null
                       references citia.sighting_reports (id) on delete restrict,
  -- ID from the staff catalogue in lib/species-data.ts (e.g. rec-mah-01).
  -- FastAPI accepts only the confirmed rec-mah-* keys.
  recommendation_key text not null
                       constraint recommendation_key_format
                       check (recommendation_key ~ '^rec-[a-z]{3}-[0-9]{2}$'),
  title_snapshot     text not null
                       constraint recommendation_title_length
                       check (length(btrim(title_snapshot)) between 1 and 200),
  -- PROVISIONAL values, pending confirmation with CENRO. No user
  -- interface writes to this table until they are confirmed.
  status             text not null
                       constraint recommendation_status_valid
                       check (status in ('proposed', 'in_progress', 'completed', 'withdrawn')),
  notes              text
                       constraint recommendation_notes_length
                       check (length(notes) <= 2000),
  recorded_by        uuid not null
                       references citia.staff_profiles (id) on delete restrict,
  recorded_at        timestamptz not null default clock_timestamp()
);

comment on table citia.sighting_recommendations is
  'Append-only history of Management Recommendations per report. Status values are provisional.';

create index sighting_recommendations_report_key_time_idx
  on citia.sighting_recommendations (report_id, recommendation_key, recorded_at desc);

-- ── 10. report_overview view ──────────────────────────────────────────────
-- Report + photo + latest successful classification, for the queue,
-- dashboard and map. No reporter details. security_invoker makes the
-- view obey the caller's privileges and row level security.

create view citia.report_overview
with (security_invoker = true)
as
select
  r.id,
  r.reference_number,
  r.submitted_at,
  r.study_area,
  r.barangay,
  r.landmark,
  r.latitude,
  r.longitude,
  r.gps_accuracy_m,
  r.observation_type,
  r.review_status,
  r.reviewed_by,
  r.reviewed_at,
  p.id                  as photo_id,
  p.storage_path,
  c.label               as ai_label,
  c.confidence          as ai_confidence,
  c.low_confidence      as ai_low_confidence,
  c.model_version       as ai_model_version,
  c.classified_at       as ai_classified_at,
  (c.label is not null) as is_classified
from citia.sighting_reports r
left join citia.sighting_photos p on p.report_id = r.id
left join lateral (
  select ac.label, ac.confidence, ac.low_confidence, ac.model_version, ac.classified_at
  from citia.ai_classifications ac
  where ac.photo_id = p.id
    and ac.outcome = 'succeeded'
  order by ac.classified_at desc, ac.id desc
  limit 1
) c on true;

comment on view citia.report_overview is
  'Reports with their photo and latest successful AI classification. Excludes reporter details.';

-- ── 11. Privileges ────────────────────────────────────────────────────────
-- Only the owner and citia_api can reach the schema. Supabase's API
-- roles (anon, authenticated, service_role) get nothing.

revoke all on schema citia from public, anon, authenticated, service_role;
revoke all on all tables    in schema citia from public, anon, authenticated, service_role;
revoke all on all sequences in schema citia from public, anon, authenticated, service_role;
revoke all on all functions in schema citia from public, anon, authenticated, service_role;

-- FOR FUTURE MIGRATIONS: a per-schema "alter default privileges ...
-- revoke" cannot remove privileges granted by default globally (such
-- as EXECUTE on new functions for PUBLIC), so it is not used. Every
-- later migration that creates an object in citia must repeat the
-- matching revoke above for that object.

grant usage on schema citia to citia_api;

grant select on
  citia.staff_profiles,
  citia.sighting_reports,
  citia.sighting_photos,
  citia.ai_classifications,
  citia.report_reviews,
  citia.sighting_recommendations,
  citia.report_overview
to citia_api;

-- Insert access, column by column. Server-set columns (timestamps,
-- reference number, review status, reviewer) are not insertable. id is
-- included where FastAPI generates it (it is part of the photo path).
grant insert (
  id, client_submission_id, study_area, barangay, landmark,
  latitude, longitude, gps_accuracy_m, observation_type,
  community_notes, reporter_name, reporter_contact, consent_confirmed
) on citia.sighting_reports to citia_api;

grant insert (
  id, report_id, storage_path, mime_type, byte_size, width_px, height_px, sha256
) on citia.sighting_photos to citia_api;

grant insert (
  photo_id, trigger_source, requested_by, outcome, label,
  confidence, confidence_threshold, model_version, weights_sha256
) on citia.ai_classifications to citia_api;

grant insert (
  report_id, decision, rejection_reason, staff_notes, reviewed_by
) on citia.report_reviews to citia_api;

grant insert (
  report_id, recommendation_key, title_snapshot, status, notes, recorded_by
) on citia.sighting_recommendations to citia_api;

-- citia_api has no UPDATE, DELETE or TRUNCATE on any table.

-- ── 12. Row level security ────────────────────────────────────────────────
-- Enabled on every table. citia_api gets one policy per command it is
-- granted; every other role has no policy and is denied. The owner (used
-- for this migration and the SECURITY DEFINER trigger functions) is not
-- subject to these policies.

alter table citia.staff_profiles           enable row level security;
alter table citia.sighting_reports         enable row level security;
alter table citia.sighting_photos          enable row level security;
alter table citia.ai_classifications       enable row level security;
alter table citia.report_reviews           enable row level security;
alter table citia.sighting_recommendations enable row level security;

create policy citia_api_select on citia.staff_profiles           for select to citia_api using (true);
create policy citia_api_select on citia.sighting_reports         for select to citia_api using (true);
create policy citia_api_select on citia.sighting_photos          for select to citia_api using (true);
create policy citia_api_select on citia.ai_classifications       for select to citia_api using (true);
create policy citia_api_select on citia.report_reviews           for select to citia_api using (true);
create policy citia_api_select on citia.sighting_recommendations for select to citia_api using (true);

create policy citia_api_insert on citia.sighting_reports         for insert to citia_api with check (true);
create policy citia_api_insert on citia.sighting_photos          for insert to citia_api with check (true);
create policy citia_api_insert on citia.ai_classifications       for insert to citia_api with check (true);
create policy citia_api_insert on citia.report_reviews           for insert to citia_api with check (true);
create policy citia_api_insert on citia.sighting_recommendations for insert to citia_api with check (true);

commit;
