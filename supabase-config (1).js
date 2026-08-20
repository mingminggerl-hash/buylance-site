// Buylance Supabase connection config
// This file connects every page on your site to your Supabase project.
// Safe to be public — the publishable key only works within the
// permissions (RLS policies) already set up in your database.

const SUPABASE_URL = 'https://ihaokyisxukyghfpisut.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WRbpdxFH89j-_NqQwL82qw_CpngK6ZK';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
