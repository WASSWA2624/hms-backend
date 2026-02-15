#!/usr/bin/env node
/**
 * Verify backend parity with hms-frontend/write-up.md
 *
 * Checks:
 * 1) Module slugs referenced in write-up bullet lists exist in src/modules
 * 2) Every backend module directory is mounted in src/app/router.js
 * 3) Non-auth API global guards are present in router
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const writeUpPath = path.resolve(repoRoot, '..', 'hms-frontend', 'write-up.md');
const modulesRoot = path.resolve(repoRoot, 'src', 'modules');
const routerPath = path.resolve(repoRoot, 'src', 'app', 'router.js');

const MODULE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TICKED_TOKEN_REGEX = /`([^`]+)`/g;

const readText = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
};

const extractWriteUpModules = (markdown) => {
  const modules = new Set();
  const lines = String(markdown).split(/\r?\n/);

  for (const line of lines) {
    if (!line.trimStart().startsWith('-')) continue;

    let match = TICKED_TOKEN_REGEX.exec(line);
    while (match) {
      const token = String(match[1] || '').trim().toLowerCase();
      if (token.length >= 3 && MODULE_SLUG_PATTERN.test(token)) {
        modules.add(token);
      }
      match = TICKED_TOKEN_REGEX.exec(line);
    }

    TICKED_TOKEN_REGEX.lastIndex = 0;
  }

  return Array.from(modules).sort();
};

const readModuleDirs = () => {
  if (!fs.existsSync(modulesRoot)) {
    throw new Error(`Modules directory not found: ${modulesRoot}`);
  }

  return fs
    .readdirSync(modulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
};

const parseRouterMountedModules = (routerContent) => {
  const mounted = new Set();
  const regex = /require\('\.\.\/modules\/([^\/]+)\/routes\//g;
  let match = regex.exec(routerContent);

  while (match) {
    mounted.add(match[1]);
    match = regex.exec(routerContent);
  }

  return Array.from(mounted).sort();
};

const hasGlobalGuard = (routerContent, middlewareCall) =>
  routerContent.includes(`apiV1Router.use(${middlewareCall});`);

const toSet = (arr) => new Set(arr);
const difference = (left, rightSet) => left.filter((item) => !rightSet.has(item));

const printList = (title, list) => {
  console.log(`\n${title}: ${list.length}`);
  if (!list.length) return;
  for (const item of list) {
    console.log(`- ${item}`);
  }
};

const main = () => {
  const writeUpContent = readText(writeUpPath);
  const routerContent = readText(routerPath);

  const writeUpModules = extractWriteUpModules(writeUpContent);
  const backendModules = readModuleDirs();
  const mountedModules = parseRouterMountedModules(routerContent);

  const backendSet = toSet(backendModules);
  const mountedSet = toSet(mountedModules);
  const writeUpSet = toSet(writeUpModules);

  const missingFromBackend = difference(writeUpModules, backendSet);
  const missingFromRouter = difference(backendModules, mountedSet);
  const referencedButUnmounted = difference(
    writeUpModules.filter((slug) => backendSet.has(slug)),
    mountedSet
  );

  const biomedicalFromWriteUp = writeUpModules.filter((slug) => slug.startsWith('equipment-'));
  const missingBiomedical = difference(biomedicalFromWriteUp, backendSet);

  const guardChecks = {
    authenticate: hasGlobalGuard(routerContent, 'authenticate()'),
    hydrateRequestScope: hasGlobalGuard(routerContent, 'hydrateRequestScope()'),
    enforceTenantScope: hasGlobalGuard(routerContent, 'enforceTenantScope()'),
    enforceModuleEntitlement: hasGlobalGuard(routerContent, 'enforceModuleEntitlement()')
  };

  console.log('HMS write-up sync report');
  console.log(`writeup: ${writeUpPath}`);
  console.log(`backend modules: ${backendModules.length}`);
  console.log(`write-up module refs: ${writeUpModules.length}`);
  console.log(`router mounted modules: ${mountedModules.length}`);

  printList('Missing from backend (defined in write-up)', missingFromBackend);
  printList('Backend modules missing router mounts', missingFromRouter);
  printList('Write-up modules present in backend but not mounted', referencedButUnmounted);
  printList('Missing biomedical modules', missingBiomedical);

  console.log('\nGlobal non-auth API guard checks:');
  Object.entries(guardChecks).forEach(([name, passed]) => {
    console.log(`- ${name}: ${passed ? 'ok' : 'missing'}`);
  });

  const failed =
    missingFromBackend.length > 0 ||
    missingFromRouter.length > 0 ||
    referencedButUnmounted.length > 0 ||
    Object.values(guardChecks).some((passed) => !passed);

  if (failed) {
    process.exitCode = 1;
    return;
  }

  console.log('\nResult: in sync for checked conditions.');
};

try {
  main();
} catch (error) {
  console.error(`verify-writeup-sync failed: ${error.message}`);
  process.exitCode = 1;
}
