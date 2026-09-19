const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');
config.resolver.assetExts.push('db');

// Prefer ES module builds so AWS SDK picks up its react-native runtimeConfig.
config.resolver.resolverMainFields = ['react-native', 'browser', 'module', 'main'];

// Redirect the Node-only http handler to the fetch-based one that works in
// React Native, and stub out any residual node: built-in imports.
const fetchHandlerDist = path.resolve(
  __dirname,
  'node_modules/@smithy/fetch-http-handler/dist-es/index.js',
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@smithy/node-http-handler') {
    return { filePath: fetchHandlerDist, type: 'sourceFile' };
  }
  // Stub residual node: built-ins that have no browser equivalent.
  if (moduleName.startsWith('node:')) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
