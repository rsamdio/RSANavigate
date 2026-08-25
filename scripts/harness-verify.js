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

// 3. Deep Index Drift & Synchronization Verification
console.log('🗺️  [3/4] Verifying .agents/INDEX.md consistency and full code coverage...');
const indexFile = path.join(rootDir, '.agents/INDEX.md');
if (!fs.existsSync(indexFile) || fs.readFileSync(indexFile, 'utf8').length < 200) {
  console.error('❌ .agents/INDEX.md is missing or too small.');
  hasErrors = true;
} else {
  const indexContent = fs.readFileSync(indexFile, 'utf8');

  // List of critical paths that must be indexed
  const filesToCheck = [];

  function collectFiles(dir, filterFn) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { recursive: true });
    for (const relPath of entries) {
      const fullPath = path.join(dir, relPath);
      if (fs.statSync(fullPath).isFile()) {
        const repoRel = path.relative(rootDir, fullPath);
        if (filterFn(repoRel)) {
          filesToCheck.push(repoRel);
        }
      }
    }
  }

  // Source files in all packages
  collectFiles(path.join(rootDir, 'packages'), (p) => {
    if (p.includes('node_modules') || p.includes('dist') || p.includes('.DS_Store')) return false;
    return p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.js') || p.endsWith('.css') || p.endsWith('.html') || p.endsWith('manifest.json') || p.endsWith('package.json');
  });

  // Scripts
  collectFiles(path.join(rootDir, 'scripts'), (p) => p.endsWith('.js'));

  // Root configs & rules
  const rootSpecifics = [
    'firestore.rules',
    'storage.rules',
    'netlify.toml',
    'firebase.json',
    'package.json',
    'tsconfig.base.json',
    'AGENTS.md',
    '.agents/rules/index-maintenance.md',
    '.agents/rules/architecture-invariants.md',
    '.agents/rules/code-style.md',
    '.agents/memory/decisions.md'
  ];

  for (const rootFile of rootSpecifics) {
    if (fs.existsSync(path.join(rootDir, rootFile))) {
      filesToCheck.push(rootFile);
    }
  }

  const missingFiles = [];
  for (const rel of filesToCheck) {
    // Check if the relative path is present in INDEX.md
    // Either as packages/... or src/... in package sections
    const baseName = path.basename(rel);
    const inIndex = indexContent.includes(rel) || 
      (rel.startsWith('packages/') && indexContent.includes(rel.replace(/^packages\/[^/]+\//, '')));

    if (!inIndex) {
      missingFiles.push(rel);
    }
  }

  if (missingFiles.length > 0) {
    console.error(`❌ Index drift detected! ${missingFiles.length} file(s) are missing from .agents/INDEX.md:`);
    for (const mf of missingFiles) {
      console.error(`   - ${mf}`);
    }
    console.error('👉 Please update .agents/INDEX.md according to .agents/rules/index-maintenance.md.\n');
    hasErrors = true;
  } else {
    console.log(`✅ .agents/INDEX.md verified! All ${filesToCheck.length} key source and config files are accurately indexed.\n`);
  }
}

// 4. Memory and Rules Check
console.log('🧠 [4/4] Verifying Agent Harness memory and invariant rules...');
const rulesDir = path.join(rootDir, '.agents/rules');
const skillsDir = path.join(rootDir, '.agents/skills');
const indexMaintenanceRule = path.join(rulesDir, 'index-maintenance.md');

if (!fs.existsSync(rulesDir) || !fs.existsSync(skillsDir)) {
  console.error('❌ .agents/rules or .agents/skills directory is missing.');
  hasErrors = true;
} else if (!fs.existsSync(indexMaintenanceRule)) {
  console.error('❌ .agents/rules/index-maintenance.md is missing.');
  hasErrors = true;
} else {
  console.log('✅ Agent Harness rules, index maintenance rule, and skill registry verified.\n');
}

if (hasErrors) {
  console.error('💥 Harness verification FAILED with errors.');
  process.exit(1);
} else {
  console.log('🎉 ALL HARNESS CHECKS PASSED: Environment is 100% healthy and consistent!\n');
  process.exit(0);
}
