<?php
// Copy this file to config.php and fill in your values.
// config.php is gitignored and must NEVER be committed.

// Supabase project settings (Settings > API in the Supabase dashboard)
const LEXESTATE_SUPABASE_URL   = 'https://your-project-id.supabase.co';
const LEXESTATE_SERVICE_KEY    = 'your-supabase-service-role-key';

// Admin credentials
// Generate the password hash with: php scripts/generate_hash.php your_password
const LEXESTATE_ADMIN_EMAIL         = 'admin@example.com';
const LEXESTATE_ADMIN_PASSWORD_HASH = 'bcrypt_hash_here';
