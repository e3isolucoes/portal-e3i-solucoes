import fs from 'fs';
import path from 'path';

export function recordReleaseMetadata() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const metadata = {
    version: pkg.version || '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    nodeVersion: process.version
  };
  const releaseFilePath = path.join(process.cwd(), 'dist', 'release-metadata.json');
  if (!fs.existsSync(path.join(process.cwd(), 'dist'))) {
    fs.mkdirSync(path.join(process.cwd(), 'dist'), { recursive: true });
  }
  fs.writeFileSync(releaseFilePath, JSON.stringify(metadata, null, 2));
  console.log('[INFO] Metadados de release gerados com sucesso:', metadata);
}

if (process.argv[1] && process.argv[1].endsWith('release.ts')) {
  recordReleaseMetadata();
}
