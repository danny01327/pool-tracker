-- Move the pg_cron -> Edge Function shared secret into Supabase Vault
-- instead of the plaintext value an earlier local iteration of this
-- migration briefly held (never committed). The secret is generated
-- randomly here — it never appears in source control — so after applying
-- this migration, sync it to the function with:
--
--   select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret';
--   supabase secrets set CRON_SECRET=<that value>

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'cron_secret');
  end if;
end $$;

select cron.schedule(
  'send-pool-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://iqkexziyzzwlgxyqebya.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
