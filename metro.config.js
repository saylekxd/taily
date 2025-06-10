const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure proper source map generation
config.resolver.sourceExts.push('ts', 'tsx');

// Add better error handling for source maps and cloud environments
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  sourceMap: {
    includeSources: true,
  },
};

// Ensure consistent module resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add better handling for cloud environments (like Bolt.new)
// This prevents Metro from trying to read anonymous source files
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    return (req, res, next) => {
      // Skip requests for anonymous source files that cause ENOENT errors
      if (req.url && req.url.includes('<anonymous>')) {
        res.writeHead(404);
        res.end('Anonymous source file not found');
        return;
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config; 