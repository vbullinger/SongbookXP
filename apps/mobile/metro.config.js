// Metro config tuned for the pnpm monorepo so that workspace packages
// (e.g. @songbook/book-model) resolve correctly from their source .ts files.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the workspace root so edits to packages/* trigger rebuilds.
config.watchFolders = [workspaceRoot];

// Resolve modules from both the app and workspace roots so hoisted and
// per-package installs both work.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

// Workspace packages use TS NodeNext-style imports (`./schema.js` referring to
// `schema.ts`). Metro's default resolver appends source extensions to the
// literal `.js`, so it ends up looking for `schema.js.ts`. Strip `.js` from
// failing relative imports and let Metro find the `.ts` sibling.
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolveRequest ?? context.resolveRequest;
  if (
    moduleName.endsWith('.js') &&
    (moduleName.startsWith('./') || moduleName.startsWith('../'))
  ) {
    try {
      return resolve(context, moduleName, platform);
    } catch {
      return resolve(context, moduleName.slice(0, -3), platform);
    }
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
