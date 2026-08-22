import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extDist = path.resolve(__dirname, '../packages/ext-tour/dist');
const clientPublic = path.resolve(__dirname, '../packages/client/public');
const clientDist = path.resolve(__dirname, '../packages/client/dist');
const targetZip = path.resolve(clientPublic, 'navigate-recorder-extension.zip');

if (!fs.existsSync(clientPublic)) {
  fs.mkdirSync(clientPublic, { recursive: true });
}

if (!fs.existsSync(extDist)) {
  console.log('Building ext-tour first...');
  execSync('npm run build --workspace=packages/ext-tour', { stdio: 'inherit' });
}

try {
  // Zip dist directory
  console.log(`Packaging extension into ${targetZip}...`);
  execSync(`cd "${extDist}" && zip -r "${targetZip}" .`, { stdio: 'inherit' });

  // If client dist directory exists, also mirror the zip there for immediate production bundles
  if (fs.existsSync(clientDist)) {
    const distZip = path.resolve(clientDist, 'navigate-recorder-extension.zip');
    fs.copyFileSync(targetZip, distZip);
    console.log(`Mirrored extension zip to ${distZip}`);
  }

  console.log('✅ Extension ZIP successfully packaged for 1-click download.');
} catch (err) {
  console.error('Failed to create extension zip:', err);
}
