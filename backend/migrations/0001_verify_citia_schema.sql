-- 0001_verify_citia_schema.sql
--
-- WHAT: Checks the rules created by 0001_citia_initial_schema.sql by
--   trying allowed and forbidden actions as citia_api, anon,
--   authenticated, service_role and the owner.
--
-- SAFE ON THE REAL DATABASE:
--   - Everything runs inside ONE statement that always ends with an
--     error on purpose, so PostgreSQL rolls back every change it made:
--     no test report, photo, review, recommendation or profile is kept.
--   - It never changes or deletes Auth users, Storage objects or any
--     existing data. It only READS auth.users to borrow one user ID for
--     a temporary staff profile, which is rolled back too.
--   - The "cannot delete" checks target only this script's own test
--     rows, and are expected to be refused.
--
-- ONE SIDE EFFECT THAT IS NOT ROLLED BACK: PostgreSQL never returns
--   sequence numbers, so each test report insert uses up a reference
--   number. One run uses six, so the first real report will be
--   CITS-000007 instead of CITS-000001. This is accepted: gaps in
--   reference numbers are harmless, and the counter is not reset.
--
-- HOW TO RUN:
--   1. Apply 0001_citia_initial_schema.sql.
--   2. Make sure at least one user exists in Authentication → Users.
--   3. Paste this whole file into the SQL Editor and run it.
--   4. The run ends with an error that starts with
--      "CITIA-IS 0001 verification finished". That message is the
--      report: one PASS, FAIL or NOT TESTABLE line per check.

do $verify$
declare
  results     text[] := '{}';
  v_passed    integer;
  v_failed    integer;
  v_untested  integer;
  v_owner     text := current_user;
  v_staff     uuid;
  v_report    uuid := gen_random_uuid();
  v_photo     uuid := gen_random_uuid();
  v_client    uuid := gen_random_uuid();
  v_big       uuid := gen_random_uuid();
  v_big_photo uuid := gen_random_uuid();
  v_text      text;
  v_bool      boolean;
  v_count     integer;
begin
  -- ── Helper: run one statement as a role and compare the outcome ──────
  -- 'PASS' when the statement succeeds and 'ok' was expected, or when it
  -- fails with exactly the expected SQLSTATE. Switching role is checked
  -- separately, because "permission denied to set role" has the same
  -- SQLSTATE (42501) as the permission errors being tested.
  --
  -- The caller's role is restored explicitly (not with RESET ROLE, which
  -- returns to the session's default role and so would only be correct
  -- if session_user equalled current_user).
  execute $fn$
    create function pg_temp.try_sql(p_role text, p_sql text, p_expect text)
    returns text
    language plpgsql
    as $body$
    declare
      v_original text := current_user;
      v_state    text;
      v_message  text;
    begin
      begin
        execute format('set local role %I', p_role);
      exception when others then
        return format('NOT TESTABLE (cannot act as %s: %s)', p_role, sqlerrm);
      end;

      begin
        execute p_sql;
      exception when others then
        v_state := sqlstate;
        v_message := sqlerrm;
        execute format('set local role %I', v_original);
        if v_state = p_expect then
          return 'PASS';
        end if;
        return format('FAIL (expected %s, got %s: %s)', p_expect, v_state, v_message);
      end;

      execute format('set local role %I', v_original);
      if p_expect = 'ok' then
        return 'PASS';
      end if;
      return format('FAIL (expected %s, but the statement succeeded)', p_expect);
    end
    $body$
  $fn$;

  -- ── Setup (as the owner; all rolled back) ────────────────────────────
  select id into v_staff from auth.users order by created_at limit 1;
  if v_staff is null then
    raise exception 'Setup needed: create one user in Authentication → Users, then run this script again.';
  end if;

  -- staff_profiles is empty right after the migration; this temporary
  -- profile disappears with the final rollback.
  insert into citia.staff_profiles (id, full_name, role)
  values (v_staff, 'Verification Admin', 'administrator');

  -- Lets the owner act as citia_api for these checks (rolled back too).
  -- If Supabase refuses it, the run continues and every citia_api check
  -- reports NOT TESTABLE or FAIL with the reason, instead of stopping.
  begin
    execute format('grant citia_api to %I', v_owner);
  exception when others then
    results := results || format('NOT TESTABLE (could not let %s act as citia_api: %s) — S01 setup', v_owner, sqlerrm);
  end;

  -- ── A. Community submission as citia_api ─────────────────────────────
  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.sighting_reports
      (id, client_submission_id, study_area, observation_type, consent_confirmed,
       latitude, longitude, gps_accuracy_m, reporter_name, reporter_contact)
    values (%L, %L, 'palao', 'single_tree', true, 8.2215, 124.2482, 12.5,
            'Verification Reporter', 'verify@example.invalid')$s$, v_report, v_client), 'ok')
    || ' — A01 citia_api can insert a report, with a FastAPI-generated id');

  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.sighting_photos
      (id, report_id, storage_path, mime_type, byte_size, width_px, height_px, sha256)
    values (%L, %L, %L, 'image/jpeg', 123456, 1024, 768, repeat('a', 64))$s$,
    v_photo, v_report, 'reports/' || v_report || '/' || v_photo || '.jpg'), 'ok')
    || ' — A02 citia_api can insert the report''s photo');

  select reference_number into v_text from citia.sighting_reports where id = v_report;
  results := results || (case when v_text ~ '^CITS-[0-9]{6}$' then 'PASS' else 'FAIL (got ' || coalesce(v_text, 'null') || ')' end
    || ' — A03 the reference number is generated as CITS-######');

  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.sighting_photos
      (id, report_id, storage_path, mime_type, byte_size, width_px, height_px, sha256)
    select g, %L, 'reports/' || %L || '/' || g || '.jpg', 'image/jpeg', 1, 1, 1, repeat('b', 64)
    from gen_random_uuid() g$s$, v_report, v_report), '23505')
    || ' — A04 a second photo for the same report is rejected');

  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.sighting_photos
      (id, report_id, storage_path, mime_type, byte_size, width_px, height_px, sha256)
    values (gen_random_uuid(), %L, 'reports/../../secret.jpg', 'image/jpeg', 1, 1, 1, repeat('c', 64))$s$, v_report), '23514')
    || ' — A05 a storage path not built from the two IDs is rejected');

  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.sighting_reports
      (client_submission_id, study_area, observation_type, consent_confirmed)
    values (%L, 'dalipuga', 'single_tree', true)$s$, v_client), '23505')
    || ' — A06 a repeated client_submission_id (duplicate submission) is rejected');

  results := results || (pg_temp.try_sql('citia_api', $s$
    insert into citia.sighting_reports
      (client_submission_id, study_area, observation_type, consent_confirmed, latitude)
    values (gen_random_uuid(), 'npc', 'single_tree', true, 8.2)$s$, '23514')
    || ' — A07 latitude without longitude is rejected');

  results := results || (pg_temp.try_sql('citia_api', $s$
    insert into citia.sighting_reports
      (client_submission_id, study_area, observation_type, consent_confirmed)
    values (gen_random_uuid(), 'npc', 'single_tree', false)$s$, '23514')
    || ' — A08 a report without consent is rejected');

  results := results || (pg_temp.try_sql('citia_api', $s$
    insert into citia.sighting_reports
      (client_submission_id, study_area, observation_type, consent_confirmed)
    values (gen_random_uuid(), 'iligan', 'single_tree', true)$s$, '23514')
    || ' — A09 an unknown study area is rejected');

  -- A report saved without any photo must fail when the deferred check runs.
  begin
    set local role citia_api;
    insert into citia.sighting_reports (client_submission_id, study_area, observation_type, consent_confirmed)
    values (gen_random_uuid(), 'palao', 'multiple_trees', true);
    set constraints citia.report_requires_photo immediate;
    execute format('set local role %I', v_owner);
    results := results || 'FAIL (a report without a photo was accepted) — A10 a report must have a photo';
  exception
    when sqlstate '23514' then
      results := results || 'PASS — A10 a report must have a photo';
    when others then
      results := results || format('FAIL (got %s: %s) — A10 a report must have a photo', sqlstate, sqlerrm);
  end;
  set constraints citia.report_requires_photo deferred;

  -- ── B. What citia_api must NOT be able to do ─────────────────────────
  results := results || (pg_temp.try_sql('citia_api', $s$
    insert into citia.sighting_reports
      (client_submission_id, study_area, observation_type, consent_confirmed, review_status)
    values (gen_random_uuid(), 'palao', 'single_tree', true, 'verified')$s$, '42501')
    || ' — B01 a submission cannot set its review status');

  results := results || (pg_temp.try_sql('citia_api', $s$
    insert into citia.sighting_reports
      (client_submission_id, study_area, observation_type, consent_confirmed, submitted_at)
    values (gen_random_uuid(), 'palao', 'single_tree', true, '2000-01-01')$s$, '42501')
    || ' — B02 a submission cannot set its own timestamp');

  results := results || (pg_temp.try_sql('citia_api', format(
    $s$update citia.sighting_reports set review_status = 'verified' where id = %L$s$, v_report), '42501')
    || ' — B03 citia_api cannot update reports');

  results := results || (pg_temp.try_sql('citia_api', format(
    $s$delete from citia.sighting_reports where id = %L$s$, v_report), '42501')
    || ' — B04 citia_api cannot delete reports');

  results := results || (pg_temp.try_sql('citia_api', format(
    $s$delete from citia.sighting_photos where id = %L$s$, v_photo), '42501')
    || ' — B05 citia_api cannot delete photos');

  results := results || (pg_temp.try_sql('citia_api', $s$
    insert into citia.staff_profiles (id, full_name) values (gen_random_uuid(), 'Intruder')$s$, '42501')
    || ' — B06 citia_api cannot create staff profiles');

  results := results || (pg_temp.try_sql('citia_api', 'select 1 from auth.users limit 1', '42501')
    || ' — B07 citia_api cannot read auth.users');

  results := results || (pg_temp.try_sql('citia_api', 'select count(*) from citia.staff_profiles', 'ok')
    || ' — B08 citia_api can read staff profiles (needed for role checks)');

  -- ── C. AI classification history ─────────────────────────────────────
  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.ai_classifications (photo_id, outcome) values (%L, 'unavailable')$s$, v_photo), 'ok')
    || ' — C01 an unavailable attempt can be recorded');

  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.ai_classifications (photo_id, outcome, label, confidence, confidence_threshold)
    values (%L, 'unavailable', 'Mahogany', 90, 70)$s$, v_photo), '23514')
    || ' — C02 an unavailable attempt cannot carry a label or confidence');

  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.ai_classifications (photo_id, outcome, label, confidence)
    values (%L, 'failed', 'Non-Tree', 50)$s$, v_photo), '23514')
    || ' — C03 a failed attempt cannot carry a label or confidence');

  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.ai_classifications (photo_id, outcome, label, confidence, confidence_threshold)
    values (%L, 'succeeded', 'Mahogany', 90, 70)$s$, v_photo), '23514')
    || ' — C04 a successful attempt needs a model version');

  begin
    set local role citia_api;
    select is_classified into v_bool from citia.report_overview where id = v_report;
    execute format('set local role %I', v_owner);
    results := results || (case when v_bool is false then 'PASS' else 'FAIL (is_classified = ' || coalesce(v_bool::text, 'null') || ')' end
      || ' — C05 the overview shows Not classified after only an unavailable attempt');
  exception when others then
    results := results || format('FAIL (got %s: %s) — C05 the overview shows Not classified', sqlstate, sqlerrm);
  end;

  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.ai_classifications
      (photo_id, outcome, label, confidence, confidence_threshold, model_version)
    values (%L, 'succeeded', 'Mahogany', 65.0, 70.0, 'verification-test')$s$, v_photo), 'ok')
    || ' — C06 a successful attempt can be recorded');

  begin
    set local role citia_api;
    select ai_label || '/' || ai_low_confidence::text || '/' || is_classified::text
      into v_text from citia.report_overview where id = v_report;
    execute format('set local role %I', v_owner);
    results := results || (case when v_text = 'Mahogany/true/true' then 'PASS' else 'FAIL (got ' || coalesce(v_text, 'null') || ')' end
      || ' — C07 the overview shows the latest result, flagged low confidence (65 < 70)');
  exception when others then
    results := results || format('FAIL (got %s: %s) — C07 the overview shows the latest result', sqlstate, sqlerrm);
  end;

  results := results || (pg_temp.try_sql('citia_api', format(
    $s$delete from citia.ai_classifications where photo_id = %L$s$, v_photo), '42501')
    || ' — C08 classification history cannot be deleted');

  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.ai_classifications (photo_id, trigger_source, outcome)
    values (%L, 'rerun', 'unavailable')$s$, v_photo), '23514')
    || ' — C09 a re-run must name the staff member who requested it');

  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.ai_classifications (photo_id, trigger_source, requested_by, outcome)
    values (%L, 'submission', %L, 'unavailable')$s$, v_photo, v_staff), '23514')
    || ' — C10 a submission attempt cannot name a requester');

  -- ── D. Review history and the status trigger ─────────────────────────
  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.report_reviews (report_id, decision, staff_notes, reviewed_by)
    values (%L, 'verified', 'Verification test', %L)$s$, v_report, v_staff), 'ok')
    || ' — D01 citia_api can record a review');

  select review_status || '/' || (reviewed_by = v_staff)::text into v_text
  from citia.sighting_reports where id = v_report;
  results := results || (case when v_text = 'verified/true' then 'PASS' else 'FAIL (got ' || coalesce(v_text, 'null') || ')' end
    || ' — D02 the review trigger updated the report''s status and reviewer');

  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.report_reviews (report_id, decision, reviewed_by)
    values (%L, 'rejected', %L)$s$, v_report, v_staff), '23514')
    || ' — D03 a rejection without a reason is rejected');

  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.report_reviews (report_id, decision, rejection_reason, reviewed_by)
    values (%L, 'rejected', 'Duplicate of an earlier report', %L)$s$, v_report, v_staff), 'ok')
    || ' — D04 a second decision is added as history');

  select count(*) into v_count from citia.report_reviews where report_id = v_report;
  select review_status into v_text from citia.sighting_reports where id = v_report;
  results := results || (case when v_count = 2 and v_text = 'rejected' then 'PASS'
                              else format('FAIL (reviews %s, status %s)', v_count, coalesce(v_text, 'null')) end
    || ' — D05 both decisions are kept and the report shows the latest');

  results := results || (pg_temp.try_sql('citia_api', format(
    $s$delete from citia.report_reviews where report_id = %L$s$, v_report), '42501')
    || ' — D06 review history cannot be deleted');

  -- ── E. Management Recommendations ────────────────────────────────────
  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.sighting_recommendations (report_id, recommendation_key, title_snapshot, status, recorded_by)
    values (%L, 'rec-mah-01', 'Field Verification of Community Sighting Reports', 'proposed', %L)$s$, v_report, v_staff), 'ok')
    || ' — E01 a recommendation can be recorded');

  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.sighting_recommendations (report_id, recommendation_key, title_snapshot, status, recorded_by)
    values (%L, 'rec-mah-01', 'Field Verification', 'unknown_status', %L)$s$, v_report, v_staff), '23514')
    || ' — E02 an unknown recommendation status is rejected');

  results := results || (pg_temp.try_sql('citia_api', format($s$
    insert into citia.sighting_recommendations (report_id, recommendation_key, title_snapshot, status, recorded_by)
    values (%L, 'mahogany-1', 'Field Verification', 'proposed', %L)$s$, v_report, v_staff), '23514')
    || ' — E03 a malformed recommendation key is rejected');

  -- ── F. Other roles cannot reach the schema ───────────────────────────
  results := results || (pg_temp.try_sql('anon', 'select 1 from citia.sighting_reports limit 1', '42501')
    || ' — F01 anon cannot read reports');
  results := results || (pg_temp.try_sql('authenticated', 'select 1 from citia.sighting_reports limit 1', '42501')
    || ' — F02 authenticated cannot read reports');
  results := results || (pg_temp.try_sql('service_role', 'select 1 from citia.sighting_reports limit 1', '42501')
    || ' — F03 service_role cannot read reports');
  results := results || (pg_temp.try_sql('anon', 'select 1 from citia.report_overview limit 1', '42501')
    || ' — F04 anon cannot read the overview view');

  -- ── G. Catalogue checks ──────────────────────────────────────────────
  select count(*) into v_count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'citia' and c.relkind = 'r' and c.relrowsecurity;
  results := results || (case when v_count = 6 then 'PASS' else 'FAIL (tables with RLS: ' || v_count || ')' end
    || ' — G01 row level security is enabled on all 6 tables');

  select coalesce('security_invoker=true' = any (c.reloptions), false) into v_bool
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'citia' and c.relname = 'report_overview';
  results := results || (case when v_bool then 'PASS' else 'FAIL' end
    || ' — G02 the overview view uses security_invoker');

  select rolbypassrls into v_bool from pg_roles where rolname = 'citia_api';
  results := results || (case when v_bool is false then 'PASS' else 'FAIL' end
    || ' — G03 citia_api does not bypass row level security');

  -- ── H. Reference-number overflow (as the owner; rolled back) ─────────
  -- An explicit report_number does not use the sequence.
  begin
    insert into citia.sighting_reports
      (report_number, id, client_submission_id, study_area, observation_type, consent_confirmed)
    overriding system value
    values (1000000, v_big, gen_random_uuid(), 'npc', 'single_tree', true);
    insert into citia.sighting_photos
      (id, report_id, storage_path, mime_type, byte_size, width_px, height_px, sha256)
    values (v_big_photo, v_big, 'reports/' || v_big || '/' || v_big_photo || '.jpg', 'image/jpeg', 1, 1, 1, repeat('d', 64));
    select reference_number into v_text from citia.sighting_reports where id = v_big;
    results := results || (case when v_text = 'CITS-1000000' then 'PASS' else 'FAIL (got ' || coalesce(v_text, 'null') || ')' end
      || ' — H01 report 1,000,000 becomes CITS-1000000 instead of colliding');
  exception when others then
    results := results || format('FAIL (got %s: %s) — H01 reference-number overflow', sqlstate, sqlerrm);
  end;

  -- ── I. Supabase Auth link ────────────────────────────────────────────
  results := results || (pg_temp.try_sql(v_owner, $s$
    insert into citia.staff_profiles (id, full_name) values (gen_random_uuid(), 'No Auth User')$s$, '23503')
    || ' — I01 a staff profile needs an existing Supabase Auth user');

  select confdeltype::text into v_text
  from pg_constraint
  where conrelid = 'citia.staff_profiles'::regclass and contype = 'f';
  results := results || (case when v_text = 'r' then 'PASS' else 'FAIL (delete rule ' || coalesce(v_text, 'none') || ')' end
    || ' — I02 deleting an Auth user who has a staff profile is blocked (ON DELETE RESTRICT; checked in the catalogue, nothing is deleted)');

  -- ── Report (and roll everything back) ────────────────────────────────
  select count(*) filter (where x like 'PASS%'),
         count(*) filter (where x like 'FAIL%'),
         count(*) filter (where x like 'NOT TESTABLE%')
    into v_passed, v_failed, v_untested
  from unnest(results) as x;

  raise exception '%', format(
    E'CITIA-IS 0001 verification finished: %s PASS, %s FAIL, %s NOT TESTABLE. All test changes have been rolled back (only sequence numbers are used up).\n\n%s',
    v_passed, v_failed, v_untested, array_to_string(results, E'\n'));
end
$verify$;
