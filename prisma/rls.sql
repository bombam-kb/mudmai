-- Also applied by prisma/migrations/20260815020000_security_hardening.
-- Prisma uses DATABASE_URL (postgres) with an owner_all policy.
-- PostgREST (anon / authenticated) is denied even if the Data API is on.
-- FORCE ROW LEVEL SECURITY applies RLS to the table owner unless BYPASSRLS.

REVOKE ALL ON SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO postgres;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User',
    'ReminderPreference',
    'ReminderLog',
    'PastYearReflection',
    'VisionCanvas',
    'VisionBoardItem',
    'QuarterlyGoal',
    'Milestone',
    'DailyTodo',
    'DailyMood',
    'MonthlyPlan',
    'MonthlyReview',
    'QuarterlyReview',
    'AiNudgeLog',
    'BillingCheckout',
    'RateLimitBucket',
    'Referral',
    'PointsLedger',
    'ReferralEventLog',
    'LineAccount',
    'LineWebhookEvent'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS deny_postgrest ON %I', t);
    EXECUTE format(
      'CREATE POLICY deny_postgrest ON %I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      t
    );
    EXECUTE format('DROP POLICY IF EXISTS owner_all ON %I', t);
    EXECUTE format(
      'CREATE POLICY owner_all ON %I FOR ALL TO postgres USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- Vision-board Storage: insert/delete only under {auth.uid()}/...
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS vision_board_insert_own ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS vision_board_delete_own ON storage.objects';
    EXECUTE $p$
      CREATE POLICY vision_board_insert_own ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'vision-board'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
    $p$;
    EXECUTE $p$
      CREATE POLICY vision_board_delete_own ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'vision-board'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
    $p$;
  END IF;
END $$;
