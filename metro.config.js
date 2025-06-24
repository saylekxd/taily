const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

// Ensure proper source map generation
config.resolver.sourceExts.push('ts', 'tsx');

// Add better error handling for source maps
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  sourceMap: {
    includeSources: true,
  },
};

// Ensure source maps are generated for Hermes
config.transformer.hermesCommand = 'hermes';
config.transformer.enableBabelRCLookup = false;

// Ensure consistent module resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;