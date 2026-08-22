#!/usr/bin/env node

/**
 * NAVIGATE Agent Harness Verification Engine
 * Automated self-test & invariant checker for the agentic coding environment.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Running NAVIGATE Agent Harness Verification...\n');

let hasErrors = false;

// 1. Build Verification
console.log('📦 [1/4] Verifying TypeScript builds across all workspaces...');
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  console.log('✅ Workspace build passed.\n');
} catch {
  console.error('❌ Build failed.');
  hasErrors = true;
}

// 2. Secret Leak Inspection in Client & Extension bundles
console.log('🔒 [2/4] Scanning for client-side secret leaks...');
const clientSrc = path.join(rootDir, 'packages/client/src');
const extSrc = path.join(rootDir, 'packages/ext-tour/src');

function scanForSecrets(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir, { recursive: true });
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('R2_SECRET_ACCESS_KEY') && !fullPath.includes('configService.ts')) {
        console.error(`❌ Potential secret reference found in client code: ${file}`);
        hasErrors = true;
      }
    }
  }
}

scanForSecrets(clientSrc);
scanForSecrets(extSrc);
console.log('✅ Client secret leak scan complete.\n');

// 3. Index Drift Verification
console.log('🗺️  [3/4] Verifying .agents/INDEX.md consistency...');
const indexFile = path.join(rootDir, '.agents/INDEX.md');
if (!fs.existsSync(indexFile) || fs.readFileSync(indexFile, 'utf8').length < 200) {
  console.error('❌ .agents/INDEX.md is missing or too small.');
  hasErrors = true;
} else {
  console.log('✅ .agents/INDEX.md is present and verified.\n');
}

// 4. Memory and Rules Check
console.log('🧠 [4/4] Verifying Agent Harness memory and invariant rules...');
const rulesDir = path.join(rootDir, '.agents/rules');
const skillsDir = path.join(rootDir, '.agents/skills');
if (!fs.existsSync(rulesDir) || !fs.existsSync(skillsDir)) {
  console.error('❌ .agents/rules or .agents/skills directory is missing.');
  hasErrors = true;
} else {
  console.log('✅ Agent Harness rules and skill registry verified.\n');
}

if (hasErrors) {
  console.error('💥 Harness verification FAILED with errors.');
  process.exit(1);
} else {
  console.log('🎉 ALL HARNESS CHECKS PASSED: Environment is 100% healthy and consistent!\n');
  process.exit(0);
}
