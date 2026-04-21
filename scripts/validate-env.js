#!/usr/bin/env node
/**
 * Validates that all required environment variables are set before starting.
 * Run: node scripts/validate-env.js [mobile|admin|supabase]
 */

const target = process.argv[2] || 'all';

const REQUIRED = {
  mobile: [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_MAPBOX_TOKEN',
  ],
  admin: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'NEXTAUTH_SECRET',
  ],
  supabase: [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ],
};

// Load .env files
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const vars = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    vars[key] = value;
  });
  return vars;
}

const rootDir = path.resolve(__dirname, '..');
const envVars = {
  ...loadEnvFile(path.join(rootDir, '.env')),
  ...loadEnvFile(path.join(rootDir, '.env.local')),
  ...process.env,
};

const checks = target === 'all'
  ? Object.values(REQUIRED).flat()
  : REQUIRED[target] || [];

const missing = [];
const placeholder = [];

checks.forEach(key => {
  const val = envVars[key];
  if (!val) {
    missing.push(key);
  } else if (val.includes('your_') || val === 'TODO' || val.startsWith('sk_test_REPLACE') || val.startsWith('pk_test_REPLACE')) {
    placeholder.push(key);
  }
});

console.log(`\n🔍 Trainly env validation — target: ${target}\n`);

if (missing.length === 0 && placeholder.length === 0) {
  console.log('✅ All environment variables are set!\n');
  process.exit(0);
}

if (missing.length > 0) {
  console.log('❌ Missing variables:');
  missing.forEach(k => console.log(`   • ${k}`));
  console.log('');
}

if (placeholder.length > 0) {
  console.log('⚠️  Placeholder values (need real values):');
  placeholder.forEach(k => console.log(`   • ${k}`));
  console.log('');
}

console.log('📋 Copy .env.example to .env and fill in the values.\n');
process.exit(1);
