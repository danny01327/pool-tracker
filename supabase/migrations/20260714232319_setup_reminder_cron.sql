-- Enable the extensions needed to run the send-reminders Edge Function on a
-- schedule. The actual cron job (and its secret, via Supabase Vault) is set
-- up in the next migration.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
