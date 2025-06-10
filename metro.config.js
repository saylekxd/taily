const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure proper source map generation
config.resolver.sourceExts.push('ts', 'tsx');

// Add better error handling for source maps
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
    output: {
      ascii_only: true,
      quote_style: 3,
      wrap_iife: true,
    },
    sourceMap: {
      includeSources: false,
    },
  },
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Add resolver configuration for better module resolution
config.resolver = {
  ...config.resolver,
  unstable_enableSymlinks: true,
  unstable_enablePackageExports: true,
  platforms: ['ios', 'android', 'native', 'web'],
};

// Ensure watchman is configured properly for cloud environments
config.watchFolders = [__dirname];
config.resetCache = true;

module.exports = config; 