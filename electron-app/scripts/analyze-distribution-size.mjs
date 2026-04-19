import { createHash } from 'crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { getRawHeader } from '@electron/asar';

const __dirname = dirname(fileURLToPath(import.meta.url));
const electronAppDir = resolve(__dirname, '..');
const buildOutputDir = join(electronAppDir, 'build-output');
const winUnpackedDir = join(buildOutputDir, 'win-unpacked');
const resourcesDir = join(winUnpackedDir, 'resources');
const outputPath = join(buildOutputDir, 'distribution-size-analysis.local.json');

const appAsarPath = join(resourcesDir, 'app.asar');
const phpRuntimeRoot = join(resourcesDir, 'portable', 'runtime', 'php');
const nestedPhpRuntimeRoot = join(phpRuntimeRoot, 'windowsXamppPhp');
const vendorRoot = join(resourcesDir, 'laravel', 'vendor');
const pintBinaryPath = join(vendorRoot, 'laravel', 'pint', 'builds', 'pint');

function assertExists(targetPath, label) {
  if (!existsSync(targetPath)) {
    throw new Error(`Missing ${label}: ${targetPath}`);
  }
}

function toPosixPath(targetPath) {
  return targetPath.replace(/\\/g, '/');
}

function bytesToMiB(bytes) {
  return Number((bytes / (1024 * 1024)).toFixed(2));
}

function hashFile(targetPath) {
  return createHash('sha256').update(readFileSync(targetPath)).digest('hex');
}

function walkFiles(rootPath) {
  const results = [];

  function visit(currentPath) {
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      const entryPath = join(currentPath, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      results.push({
        relativePath: toPosixPath(relative(rootPath, entryPath)),
        absolutePath: entryPath,
        size: statSync(entryPath).size,
      });
    }
  }

  if (existsSync(rootPath)) {
    visit(rootPath);
  }

  return results;
}

function sortSizedEntries(entries) {
  return [...entries].sort((left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path));
}

function mapToSizedArray(sizeMap) {
  return sortSizedEntries(
    [...sizeMap.entries()].map(([path, bytes]) => ({
      path,
      bytes,
      mebibytes: bytesToMiB(bytes),
    }))
  );
}

function summarizeGroupedFiles(files, groupSelector) {
  const totals = new Map();

  for (const file of files) {
    const key = groupSelector(file);
    totals.set(key, (totals.get(key) || 0) + file.size);
  }

  return mapToSizedArray(totals);
}

function summarizeAppAsar() {
  const files = [];
  const rawHeader = getRawHeader(appAsarPath);

  function visitEntry(entry, currentPath = '') {
    if (entry && typeof entry.size === 'number') {
      files.push({
        path: currentPath,
        size: entry.size,
      });
      return;
    }

    if (!entry || !entry.files || typeof entry.files !== 'object') {
      return;
    }

    for (const [childName, childEntry] of Object.entries(entry.files)) {
      const childPath = currentPath ? `${currentPath}/${childName}` : childName;
      visitEntry(childEntry, childPath);
    }
  }

  visitEntry(rawHeader.header);

  const topLevelBySize = summarizeGroupedFiles(files, (file) => file.path.split('/')[0] || '(root)');
  const largestFiles = sortSizedEntries(
    files.map((file) => ({
      path: file.path,
      bytes: file.size,
      mebibytes: bytesToMiB(file.size),
    }))
  ).slice(0, 25);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  return {
    path: appAsarPath,
    totalBytes,
    totalMebibytes: bytesToMiB(totalBytes),
    fileCount: files.length,
    topLevelBySize: topLevelBySize.slice(0, 25),
    largestFiles,
  };
}

function summarizePhpRuntime() {
  const runtimeFiles = walkFiles(phpRuntimeRoot);
  const nestedFiles = walkFiles(nestedPhpRuntimeRoot);
  const topLevelBySize = summarizeGroupedFiles(runtimeFiles, (file) => file.relativePath.split('/')[0] || '(root)');
  const duplicates = [];

  for (const nestedFile of nestedFiles) {
    const counterpartPath = join(phpRuntimeRoot, nestedFile.relativePath);
    if (!existsSync(counterpartPath)) {
      continue;
    }

    const counterpartStats = statSync(counterpartPath);
    if (counterpartStats.size !== nestedFile.size) {
      continue;
    }

    const nestedHash = hashFile(nestedFile.absolutePath);
    const counterpartHash = hashFile(counterpartPath);
    if (nestedHash !== counterpartHash) {
      continue;
    }

    duplicates.push({
      path: nestedFile.relativePath,
      bytes: nestedFile.size,
      mebibytes: bytesToMiB(nestedFile.size),
    });
  }

  const exactDuplicateBytes = duplicates.reduce((sum, file) => sum + file.bytes, 0);
  const candidateDirectories = topLevelBySize.filter((entry) =>
    ['windowsXamppPhp', 'CompatInfo', 'scripts', 'tests', 'docs', 'dev', 'pear', 'extras', 'data'].includes(entry.path)
  );
  const totalBytes = runtimeFiles.reduce((sum, file) => sum + file.size, 0);
  const nestedTotalBytes = nestedFiles.reduce((sum, file) => sum + file.size, 0);

  return {
    path: phpRuntimeRoot,
    totalBytes,
    totalMebibytes: bytesToMiB(totalBytes),
    topLevelBySize,
    candidateDirectories,
    nestedWindowsXamppPhp: {
      path: nestedPhpRuntimeRoot,
      totalBytes: nestedTotalBytes,
      totalMebibytes: bytesToMiB(nestedTotalBytes),
      exactDuplicateFileCount: duplicates.length,
      exactDuplicateBytes,
      exactDuplicateMebibytes: bytesToMiB(exactDuplicateBytes),
      largestExactDuplicates: sortSizedEntries(duplicates).slice(0, 25),
    },
  };
}

function summarizeVendorPayload() {
  const vendorFiles = walkFiles(vendorRoot);
  const totalBytes = vendorFiles.reduce((sum, file) => sum + file.size, 0);
  const packageSizes = summarizeGroupedFiles(vendorFiles, (file) => {
    const segments = file.relativePath.split('/');
    return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : segments[0] || '(root)';
  });

  const pintBytes = existsSync(pintBinaryPath) ? statSync(pintBinaryPath).size : 0;

  return {
    path: vendorRoot,
    totalBytes,
    totalMebibytes: bytesToMiB(totalBytes),
    largestPackages: packageSizes.slice(0, 25),
    pintBinary: existsSync(pintBinaryPath)
      ? {
          path: pintBinaryPath,
          bytes: pintBytes,
          mebibytes: bytesToMiB(pintBytes),
        }
      : null,
  };
}

function buildCandidateSummary({ appAsar, phpRuntime, vendorPayload }) {
  const candidates = [];

  const addCandidate = (kind, path, bytes, reason) => {
    if (!bytes) {
      return;
    }

    candidates.push({
      kind,
      path,
      bytes,
      mebibytes: bytesToMiB(bytes),
      reason,
    });
  };

  addCandidate(
    'app-asar-top-level',
    appAsar.topLevelBySize[0]?.path || '',
    appAsar.topLevelBySize[0]?.bytes || 0,
    'Largest app.asar top-level segment in the current packaged build.'
  );

  addCandidate(
    'php-runtime-duplicate',
    phpRuntime.nestedWindowsXamppPhp.path,
    phpRuntime.nestedWindowsXamppPhp.exactDuplicateBytes,
    'Exact duplicate bytes found between php/windowsXamppPhp and the main php runtime root.'
  );

  for (const entry of phpRuntime.candidateDirectories) {
    addCandidate(
      'php-runtime-directory',
      join(phpRuntime.path, entry.path),
      entry.bytes,
      `Top-level PHP runtime directory "${entry.path}" packaged in the current build.`
    );
  }

  if (vendorPayload.pintBinary) {
    addCandidate(
      'vendor-tooling',
      vendorPayload.pintBinary.path,
      vendorPayload.pintBinary.bytes,
      'Laravel Pint build artifact packaged inside vendor payload.'
    );
  }

  return sortSizedEntries(candidates).slice(0, 20);
}

function main() {
  assertExists(winUnpackedDir, 'win-unpacked directory');
  assertExists(appAsarPath, 'packaged app.asar');
  assertExists(phpRuntimeRoot, 'packaged PHP runtime');
  assertExists(vendorRoot, 'packaged Laravel vendor directory');

  const appAsar = summarizeAppAsar();
  const phpRuntime = summarizePhpRuntime();
  const vendorPayload = summarizeVendorPayload();

  const analysis = {
    metricScope: 'local-size-analysis',
    generatedAt: new Date().toISOString(),
    sourceRoot: winUnpackedDir,
    appAsar,
    phpRuntime,
    vendorPayload,
    candidates: buildCandidateSummary({ appAsar, phpRuntime, vendorPayload }),
  };

  writeFileSync(outputPath, `${JSON.stringify(analysis, null, 2)}\n`, 'utf8');

  console.log('[analyze-distribution-size] Wrote local size analysis.');
  console.log(` - Output: ${outputPath}`);
  console.log(` - app.asar: ${appAsar.totalBytes} bytes across ${appAsar.fileCount} files`);
  console.log(
    ` - app.asar largest segment: ${appAsar.topLevelBySize[0]?.path || 'n/a'} (${appAsar.topLevelBySize[0]?.bytes || 0} bytes)`
  );
  console.log(
    ` - Exact duplicate PHP bytes under windowsXamppPhp: ${phpRuntime.nestedWindowsXamppPhp.exactDuplicateBytes} bytes`
  );
  if (vendorPayload.pintBinary) {
    console.log(` - Laravel Pint build artifact: ${vendorPayload.pintBinary.bytes} bytes`);
  }
}

main();
