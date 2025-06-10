// Centralized environment detection for cloud environments like Bolt.new
const isCloudEnvironment = () => {
  return (
    process.env.CLOUD_ENVIRONMENT === 'true' ||
    process.env.HOME === '/home/project' ||
    (typeof process !== 'undefined' && process.cwd && process.cwd().startsWith('/home/project')) ||
    // Additional cloud environment indicators
    process.env.STACKBLITZ_ENV === 'true' ||
    process.env.CODESANDBOX_SSE === 'true' ||
    process.env.GITPOD_WORKSPACE_ID !== undefined
  );
};

module.exports = {
  isCloudEnvironment,
}; 