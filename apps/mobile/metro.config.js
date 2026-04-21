// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in that order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Add source extensions to support Flow
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx', 'json'];

// 4. Force a single React instance — intercept ALL react imports
//    and redirect them to apps/mobile/node_modules/react (React 19).
//    The monorepo root has React 18 which is incompatible with RN 0.81.5.
//    This also fixes "Cannot read property 'useId' of null" caused by
//    nested react inside e.g. expo-keep-awake/node_modules/react.
const rootReact = path.resolve(projectRoot, 'node_modules/react');
const rootReactNative = path.resolve(projectRoot, 'node_modules/react-native');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Block Node-only modules
  if (moduleName === 'ws' || moduleName === 'stream') {
    return { type: 'empty' };
  }
  // Force single React instance
  if (moduleName === 'react') {
    return { filePath: path.join(rootReact, 'index.js'), type: 'sourceFile' };
  }
  if (moduleName === 'react/jsx-runtime') {
    return { filePath: path.join(rootReact, 'jsx-runtime.js'), type: 'sourceFile' };
  }
  if (moduleName === 'react/jsx-dev-runtime') {
    return { filePath: path.join(rootReact, 'jsx-dev-runtime.js'), type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
