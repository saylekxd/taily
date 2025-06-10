const { isCloudEnvironment } = require('./utils/environment');

module.exports = function(api) {
  api.cache(true);
  
  const isCloud = isCloudEnvironment();
  
  return {
    presets: ['babel-preset-expo'],
    // Disable source maps in cloud environments
    sourceMaps: !isCloud,
    // Simplify output for cloud environments
    compact: isCloud,
    comments: !isCloud,
  };
}; 