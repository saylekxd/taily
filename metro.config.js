const { getDefaultConfig } = require('expo/metro-config');
const { isCloudEnvironment } = require('./utils/environment');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(process.cwd());

// Basic configuration
config.resolver.sourceExts = ['ts', 'tsx', 'js', 'jsx', 'json'];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Cloud environment specific configuration
if (isCloudEnvironment()) {
  console.log('🌤️  Running in cloud environment - disabling source maps');
  
  // Completely disable ALL source map generation
  config.transformer = {
    ...config.transformer,
    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      sourceMap: false,
      output: {
        comments: false,
      },
    },
    // Disable inline source maps
    inlineSourceMap: false,
    // Disable source map generation in transformer
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
        // Disable source maps at transform level
        sourceMap: false,
      },
    }),
  };
  
  // Disable symbolication entirely
  config.symbolicator = {
    customizeFrame: () => null,
  };
  
  // Override server configuration
  config.server = {
    ...config.server,
    enableSymbolication: false,
    // Disable source map URL comments
    rewriteRequestUrl: (url) => {
      if (url.includes('.map') || url.includes('<anonymous>')) {
        return '/dev/null';
      }
      return url;
    },
  };
  
  // Additional resolver configuration for cloud
  config.resolver = {
    ...config.resolver,
    // Disable source map resolution
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName.includes('.map') || moduleName === '<anonymous>') {
        return { type: 'empty' };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  };
}

module.exports = config; 