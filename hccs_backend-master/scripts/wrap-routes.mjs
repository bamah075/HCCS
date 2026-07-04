#!/usr/bin/env node
// Bulk-transform admin API route handlers:
//   1. Replace `import { createClient } from '@supabase/supabase-js'` with createAdminClient import
//   2. Add requireAdmin/requireStaff import based on category
//   3. Insert guard at the top of every exported handler function body
//   4. Replace `createClient(URL, NEXT_PUBLIC_SUPABASE_SERVICE_ROLE, ...)` with `createAdminClient()`
//
// Idempotent: if the file already has requireAdmin import, the transform is skipped.
//
// Run from hccs_backend-master/ root.

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = 'src/app/api';

// Routes that only READ data: requireStaff
const READ_ONLY = new Set([
  'compliance_scan/route.js',
  'compliance_scan/detail/route.js',
  'compliance_scan/action_report/route.js',
  'consultation/route.js',
  'media/route.js',
  'mini_quiz_completions/route.js',
  'news/route.js',
  'news_category/route.js',
  'orders/route.js',
  'resources/route.js',
  'services/route.js',
  'subscription_plan/route.js',
  'user_tier/route.js',
  'users/route.js',
  'users/detail/route.js',
  'users/subscriptions/route.js',
]);

async function walk(dir) {
  const out = [];
  for (const it of await readdir(dir)) {
    const full = join(dir, it);
    const s = await stat(full);
    if (s.isDirectory()) out.push(...(await walk(full)));
    else if (it === 'route.js') out.push(full);
  }
  return out;
}

function categorize(relPath) {
  return READ_ONLY.has(relPath) ? 'requireStaff' : 'requireAdmin';
}

function transform(src, guard) {
  // Skip if already transformed
  if (src.includes('require-role') || src.includes('createAdminClient')) {
    return { src, changed: false, reason: 'already transformed' };
  }

  let out = src;

  // 1. Remove the old supabase-js createClient import (the create-from-supabase-js pattern)
  out = out.replace(
    /import\s*\{\s*createClient\s*\}\s*from\s*['"]@supabase\/supabase-js['"]\s*;?\s*\n/g,
    ''
  );

  // 2. Find an existing import block end to insert our imports after.
  // Insert after the LAST import line.
  const importRegex = /^import\s.+?from\s.+?;?\s*$/gm;
  const matches = [...out.matchAll(importRegex)];
  const newImports = `\nimport { ${guard} } from 'src/lib/auth/require-role';\nimport { createAdminClient } from 'src/lib/supabase/admin';\n`;
  if (matches.length) {
    const last = matches[matches.length - 1];
    const insertAt = last.index + last[0].length;
    out = out.slice(0, insertAt) + newImports + out.slice(insertAt);
  } else {
    out = newImports.trimStart() + out;
  }

  // 3. Replace createClient(URL, NEXT_PUBLIC_SUPABASE_SERVICE_ROLE, ...) with createAdminClient()
  // Tolerant pattern — multiline createClient call ending in );
  out = out.replace(
    /const\s+supabase\s*=\s*createClient\s*\([\s\S]*?\)\s*;/g,
    'const supabase = createAdminClient();'
  );

  // 4. Insert the guard at the top of every export async function HANDLER body.
  // Handles GET, POST, PUT, DELETE, PATCH with or without (request) arg.
  out = out.replace(
    /(export\s+async\s+function\s+(?:GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*\{\s*\n)/g,
    (m) => `${m}    const { error: __authError } = await ${guard}();\n    if (__authError) return __authError;\n\n`
  );

  return { src: out, changed: true };
}

const files = await walk(ROOT);
let changed = 0, skipped = 0;
for (const f of files) {
  const rel = f.replace(`${ROOT}/`, '');
  const guard = categorize(rel);
  const original = await readFile(f, 'utf8');
  const result = transform(original, guard);
  if (result.changed) {
    await writeFile(f, result.src);
    console.log(`  ${guard.padEnd(13)}  ${rel}`);
    changed++;
  } else {
    console.log(`  ${'skip'.padEnd(13)}  ${rel}  (${result.reason ?? 'no change'})`);
    skipped++;
  }
}
console.log(`\n${changed} transformed, ${skipped} skipped.`);
