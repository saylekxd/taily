const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure proper source map generation
config.resolver.sourceExts.push('ts', 'tsx');

// Add better error handling for source maps
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  sourceMap: {
    includeSources: true,
  },
};

// Ensure consistent module resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config; 