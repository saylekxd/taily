const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure proper source map generation
config.resolver.sourceExts.push('ts', 'tsx');

// Disable source map symbolication to prevent anonymous file errors in cloud environments
config.symbolicator = {
  customizeFrame: () => null,
};

// Ensure consistent module resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config; 