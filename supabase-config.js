// Buylance Supabase client config.
// Loaded on every page that needs login/signup/reviews/promo codes.
// The publishable key below is safe to expose publicly — it only works
// alongside Row Level Security policies, which are already set up.

const SUPABASE_URL = 'https://ihaokyisxukyghfpisut.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WRbpdxFH89j-_NqQwL82qw_CpngK6ZK';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
