#!/usr/bin/env node

/**
 * Helper script to generate correct Supabase connection pooler URL
 * Usage: node scripts/generate-supabase-url.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function urlEncode(str) {
  return encodeURIComponent(str);
}

async function main() {
  console.log('\n🔧 Supabase Connection String Generator\n');
  console.log('This will help you create the correct DATABASE_URL for Vercel.\n');

  const poolerHost = await question('Enter your Supabase pooler host (e.g., aws-1-us-east-1.pooler.supabase.com): ');
  const projectRef = await question('Enter your Supabase project ref (the part before .supabase.co): ');
  const password = await question('Enter your database password: ');
  const database = await question('Enter database name (usually "postgres"): ') || 'postgres';

  const encodedPassword = urlEncode(password);
  
  // For connection pooler, username format is: postgres.{projectRef}
  const username = `postgres.${projectRef}`;
  
  // Connection pooler uses port 6543
  const poolerUrl = `postgresql://${username}:${encodedPassword}@${poolerHost}:6543/${database}?pgbouncer=true`;
  
  // Direct connection (for migrations only, port 5432)
  const directUrl = `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/${database}`;

  console.log('\n✅ Generated Connection Strings:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📦 CONNECTION POOLER URL (Use this for Vercel DATABASE_URL):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(poolerUrl);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🔌 DIRECT CONNECTION URL (For migrations only, optional):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(directUrl);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📋 Steps to fix Vercel:');
  console.log('1. Copy the CONNECTION POOLER URL above');
  console.log('2. Go to Vercel → Your Project → Settings → Environment Variables');
  console.log('3. Update DATABASE_URL with the pooler URL');
  console.log('4. Make sure it\'s set for Production, Preview, and Development');
  console.log('5. Redeploy your app\n');

  rl.close();
}

main().catch(console.error);
