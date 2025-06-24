export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      EXPO_PUBLIC_REVENUE_CAT_IOS_API_KEY: process.env.EXPO_PUBLIC_REVENUE_CAT_IOS_API_KEY,
      EXPO_PUBLIC_REVENUE_CAT_ANDROID_API_KEY: process.env.EXPO_PUBLIC_REVENUE_CAT_ANDROID_API_KEY,
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
    },
  };
}; 