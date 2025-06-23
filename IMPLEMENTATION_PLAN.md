# Taily App - Feature Implementation Plan

## Executive Summary
This document provides a detailed implementation plan for enhancing the Taily children's story app with three major features that will transform the reading experience through personalization, voice narration, and interactive elements.

## Overview
This implementation plan outlines the step-by-step process for adding three major features to the Taily app:
1. **AI-Personalized Stories** - Generate unique stories with the child as the main character
2. **Voice Read Mode with ElevenLabs** - Professional voice narration for all stories
3. **Interactive Reading with Sound Effects** - Real-time sound effects triggered by voice recognition

## Project Context
- **Framework**: React Native with Expo
- **Database**: Supabase (PostgreSQL)
- **Current State**: The app has a story reading system with progress tracking, favorites, and user profiles
- **Existing Tables**: 
  - `profiles` - User profiles with child details (name, age, interests, reading_level)
  - `stories` - Story content with categories and metadata
  - `user_stories` - Tracks reading progress and favorites
  - `reading_sessions` - Records reading time and completion
  - `user_achievements` - Gamification elements

---

## Feature 1: AI-Personalized Stories

### Overview
Generate personalized stories for each child based on their profile data (name, age, interests) where the child is the main character.

### Database Schema Changes

#### Step 1.1: Create personalized_stories table
- [X] Create migration for new table structure
```sql
CREATE TABLE personalized_stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT,
  prompt_used TEXT, -- Store the prompt for debugging/reference
  model_used TEXT, -- Track which AI model was used
  categories TEXT[],
  reading_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE personalized_stories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own personalized stories"
  ON personalized_stories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own personalized stories"
  ON personalized_stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Backend Implementation

#### Step 1.2: Create AI Service Configuration
- [X] Add environment variables for AI service (Gemini 2.5 as free model)
- [X] Create `services/aiStoryService.ts`
  - Configure AI client
  - Implement story generation function
  - Add error handling and retries

#### Step 1.3: Story Generation Logic
- [X] Create story generation prompt template
  - Include child's name, age, interests
  - Define story structure (beginning, middle, end)
  - Set appropriate content guidelines
- [X] Implement story validation
  - Check content appropriateness
  - Verify story length
  - Ensure child's name is properly integrated
  - Add limits - 2 stories for each user

#### Step 1.4: Story Service Updates
- [X] Update `services/storyService.ts`
  - Add `generatePersonalizedStory()` function
  - Add `getPersonalizedStories()` function
  - Integrate with existing story display logic

### Frontend Implementation

#### Step 1.5: UI Components
- [X] Create "Generate New Story" button in profile or main (as a one container)
- [X] Add loading state during generation
- [X] Create personalized story badge/indicator
- [X] Update StoryCard component to show personalized indicator

#### Step 1.6: Navigation Flow
- [X] Add generation screen/modal
- [X] Show theme/topic selection options
- [X] Display generation progress
- [X] Navigate to story view on completion

### Testing Checklist
- [X] Test story generation with various profile combinations
- [X] Verify child's name appears naturally in stories
- [X] Check age-appropriate content
- [X] Test error handling for API failures
- [X] Verify RLS policies work correctly

---

## Feature 2: Voice Read Mode with ElevenLabs

### Overview
Add text-to-speech functionality with two different approaches:
1. **Manual Audio for Regular Stories**: Generate and upload audio files manually for existing stories with ENG & PL language options
2. **Automated Audio for AI Stories**: Generate personalized story audio automatically via ElevenLabs API (limited to 5 times per month per user)

### Backend Setup

#### Step 2.1: Audio Storage Setup
- [ ] Configure Supabase Storage bucket for audio files
- [ ] Set up public access policies for audio files
- [ ] Create separate folders for manual (`manual_audio/`) and AI-generated (`ai_audio/`) audio files

#### Step 2.2: Database Schema Updates
- [ ] Create migration for audio tracking with language support
```sql
-- Add audio fields to stories table with language support
ALTER TABLE stories 
ADD COLUMN audio_url_en TEXT,
ADD COLUMN audio_url_pl TEXT,
ADD COLUMN audio_duration_en INTEGER,
ADD COLUMN audio_duration_pl INTEGER;

-- Add audio fields to personalized_stories table (AI-generated only)
ALTER TABLE personalized_stories 
ADD COLUMN audio_url TEXT,
ADD COLUMN audio_duration INTEGER,
ADD COLUMN voice_id TEXT;

-- Create audio_generation_usage table for tracking monthly limits
CREATE TABLE audio_generation_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL, -- 1-12
  year INTEGER NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(user_id, month, year)
);

-- Enable RLS
ALTER TABLE audio_generation_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own audio usage"
  ON audio_generation_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own audio usage"
  ON audio_generation_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audio usage"
  ON audio_generation_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create audio_generation_jobs table for tracking AI story generation
CREATE TABLE audio_generation_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  personalized_story_id UUID REFERENCES personalized_stories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE audio_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own audio jobs"
  ON audio_generation_jobs FOR SELECT
  USING (auth.uid() = user_id);
```

### Edge Function Implementation (Secure API Key Handling)

#### Step 2.3: Create ElevenLabs Edge Function
- [ ] Create Supabase Edge Function for secure API calls
- [ ] Set up ElevenLabs API key as Edge Function secret
- [ ] Create `supabase/functions/generate-story-audio/index.ts`
  - Text-to-speech conversion function
  - Voice selection logic
  - Audio file upload to Supabase Storage
  - Usage limit validation
  - Error handling and retry logic

```typescript
// Example Edge Function structure
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { story_text, user_id, personalized_story_id } = await req.json()
    
    // Check monthly usage limit
    // Generate audio via ElevenLabs API
    // Upload to storage
    // Update database
    // Return audio URL
    
    return new Response(
      JSON.stringify({ audio_url, duration }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

### Service Implementation

#### Step 2.4: Audio Services
- [ ] Create `services/audioService.ts`
  - Function to call Edge Function for AI story audio generation
  - Usage limit checking
  - Manual audio URL retrieval based on language preference
  - Error handling for API limits

#### Step 2.5: Usage Tracking Service
- [ ] Create `services/usageTrackingService.ts`
  - Check monthly usage limits (5 generations per month)
  - Update usage counters
  - Reset monthly counters
  - Provide usage status to UI

### Frontend Implementation

#### Step 2.6: Language Selection
- [ ] Add language preference to user profile settings
- [ ] Create language selection component for audio playback
- [ ] Update profile service to handle language preferences

#### Step 2.7: Audio Player UI Enhancement
- [ ] Update story viewer controls
  - Language toggle for regular stories (ENG/PL)
  - Generate audio button for AI stories (with usage counter)
  - Play/pause functionality
  - Progress bar for audio
  - Show buffering/generation states
  - Usage limit indicator

#### Step 2.8: Audio Player Logic
- [ ] Create `hooks/useAudioPlayer.ts`
  - Play/pause functionality
  - Progress tracking
  - Speed adjustment
  - Background audio support
  - Language-aware audio selection

#### Step 2.9: Usage Limit UI
- [ ] Create usage tracking component
  - Show monthly usage (X/5 used)
  - Display reset date
  - Warning when approaching limit
  - Error handling when limit exceeded

#### Step 2.10: Manual Audio File Organization
- [ ] Create standardized naming convention for manual audio files in Supabase Storage
  - Format: `manual_audio/{story_id}_en.mp3` and `manual_audio/{story_id}_pl.mp3`
  - Upload files manually through Supabase Storage interface
- [ ] Create database linking script/migration to associate uploaded files with stories
  - Scan storage bucket for audio files
  - Update `stories` table with `audio_url_en` and `audio_url_pl` paths
  - Calculate and store audio duration

### Testing Checklist
- [ ] Test manual audio playback for both languages
- [ ] Test AI story audio generation
- [ ] Verify usage limit enforcement
- [ ] Test Edge Function security
- [ ] Check language switching functionality
- [ ] Test background audio playback
- [ ] Verify monthly usage reset
- [ ] Test error states (API limits, network issues)

---

## Feature 3: Interactive Reading with Sound Effects

### Overview
Add microphone listening during parent reading to trigger sound effects at specific words. The modular DetailedReaderView component structure has been refactored to support this feature.

### ✅ Completed: Component Architecture Preparation

The DetailedReaderView has been refactored into a modular structure that's ready for Feature 3 implementation:

#### Completed Component Structure
```
components/DetailedReaderView/
├── index.tsx                    # ✅ Main component orchestrator
├── types.ts                     # ✅ Type definitions (including Feature 3 types)
├── constants.ts                 # ✅ Font sizes, line heights, and color themes
├── components/
│   ├── ReaderHeader.tsx         # ✅ Header with title and settings button
│   ├── SettingsPanel.tsx        # ✅ Font size, theme, and fullscreen controls
│   ├── ReaderContent.tsx        # ✅ Story content with scroll handling (prepared for word highlighting)
│   ├── FullscreenControls.tsx   # ✅ Fullscreen mode overlay controls
│   └── InteractiveControls.tsx  # ✅ Interactive reading UI controls (placeholder implementation)
└── hooks/
    ├── useReaderSettings.ts     # ✅ Settings management and persistence
    ├── useReaderScroll.ts       # ✅ Scroll behavior and progress tracking
    └── useInteractiveReading.ts # ✅ Interactive reading state management (placeholder)
```

#### Completed Type Definitions
```typescript
// Already defined in types.ts
export interface InteractiveReadingState {
  isListening: boolean;
  isEnabled: boolean;
  recognizedWords: string[];
  currentWord: string | null;
  soundEffectsEnabled: boolean;
}

export interface InteractiveControlsProps {
  state: InteractiveReadingState;
  onToggleListening: () => void;
  onToggleInteractiveMode: () => void;
  onToggleSoundEffects: () => void;
  colorTheme: ColorThemeStyle;
}

export interface WordHighlight {
  word: string;
  position: number;
  soundEffect?: string;
}

export interface ReaderContentProps {
  // ... existing props
  isInteractiveMode?: boolean;
  highlightedWords?: string[];
  onWordSpoken?: (word: string) => void;
}
```

#### Completed UI Components
- ✅ **InteractiveControls.tsx**: Microphone toggle, sound effects toggle, status indicators
- ✅ **ReaderContent.tsx**: Prepared for word highlighting with placeholder rendering logic
- ✅ **useInteractiveReading.ts**: State management structure ready for speech recognition

### 🔧 Implementation Required

#### Step 3.1: Audio Permissions
- [ ] Add microphone permissions to app.json
```json
{
  "expo": {
    "plugins": [
      [
        "expo-av",
        {
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone for interactive reading."
        }
      ]
    ]
  }
}
```
- [ ] Update InteractiveControls.tsx to request microphone permissions
- [ ] Handle permission denial gracefully in useInteractiveReading.ts

#### Step 3.2: Database Schema
- [ ] Create sound effects mapping table
```sql
CREATE TABLE sound_effect_triggers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  word TEXT NOT NULL,
  sound_effect_url TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create story-specific sound mappings
CREATE TABLE story_sound_mappings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id UUID REFERENCES stories(id),
  personalized_story_id UUID REFERENCES personalized_stories(id),
  word TEXT NOT NULL,
  sound_effect_url TEXT NOT NULL,
  position_in_text INTEGER, -- Character position for highlighting
  UNIQUE(story_id, word, position_in_text),
  UNIQUE(personalized_story_id, word, position_in_text)
);
```

### Service Implementation

#### Step 3.3: Speech Recognition Service
- [ ] Create `services/speechRecognitionService.ts`
  - Initialize speech recognition with expo-speech
  - Real-time word detection
  - Word matching algorithm against story content
  - Performance optimization for continuous listening

#### Step 3.4: Sound Effects Service
- [ ] Create `services/soundEffectsService.ts`
  - Preload common sound effects from Supabase Storage
  - Play sound effects with low latency using expo-av
  - Manage audio context and prevent conflicts with voice narration
  - Handle multiple simultaneous sounds

#### Step 3.5: Story Analysis Service
- [ ] Create `services/storyAnalysisService.ts`
  - Analyze story text for trigger words (animals, actions, emotions)
  - Generate position mappings for word highlighting
  - Handle word variations (plural, tense, case-insensitive)
  - Cache analysis results for performance

### Enhanced Frontend Implementation

#### Step 3.6: Complete useInteractiveReading.ts Hook
- [ ] Implement speech recognition integration
```typescript
// Update useInteractiveReading.ts
const toggleListening = async () => {
  if (!interactiveState.isListening) {
    // Request microphone permission
    // Start speech recognition
    // Begin word detection
  } else {
    // Stop speech recognition
    // Clean up resources
  }
};

const onWordRecognized = (word: string) => {
  // Match against story trigger words
  // Trigger sound effect
  // Update highlighting
  // Add to recognized words array
};
```

#### Step 3.7: Enhance ReaderContent.tsx Word Highlighting
- [ ] Implement word highlighting in renderContent()
```typescript
// Update ReaderContent.tsx renderContent method
const renderContent = () => {
  if (isInteractiveMode && highlightedWords.length > 0) {
    // Split content into words
    // Apply highlighting styles to trigger words
    // Add onPress handlers for manual word triggering
    // Return JSX with highlighted text spans
  }
  // ... existing implementation
};
```

#### Step 3.8: Sound Effect Management
- [ ] Create sound effect library management
  - Preview available sounds in settings
  - Enable/disable specific effects
  - Volume control per effect type
  - Sound effect categories (animals, actions, nature, etc.)

### Integration Points

#### Ready Integration Areas
1. **InteractiveControls.tsx**: Update placeholder functions with real implementation
2. **useInteractiveReading.ts**: Replace placeholder state management with speech recognition
3. **ReaderContent.tsx**: Implement word highlighting in existing renderContent method
4. **Main Story Flow**: Interactive mode already integrated in DetailedReaderView/index.tsx

#### Dependencies to Add
```json
{
  "dependencies": {
    "expo-av": "~14.0.7",
    "expo-speech": "~12.0.2",
    "@react-native-voice/voice": "^3.2.4"
  }
}
```

### Performance Optimization
- [ ] Implement audio buffer pool for sound effects
- [ ] Optimize speech recognition sampling rate (16kHz recommended)
- [ ] Add debouncing for rapid word detection (300ms delay)
- [ ] Memory management for long reading sessions
- [ ] Background audio handling when switching between story audio and sound effects

### Testing Strategy

#### Component Testing (Ready)
- [ ] Test InteractiveControls.tsx in isolation
- [ ] Test word highlighting in ReaderContent.tsx
- [ ] Test state management in useInteractiveReading.ts
- [ ] Test settings persistence integration

#### Integration Testing
- [ ] Test speech recognition accuracy with different voices
- [ ] Verify sound effect timing and overlap handling
- [ ] Test with different reading speeds
- [ ] Check performance on older devices
- [ ] Test with background noise and various environments

### Implementation Benefits of Modular Structure

1. **Isolated Development**: Each component can be developed and tested independently
2. **Progressive Enhancement**: Feature can be enabled/disabled without affecting existing functionality  
3. **Clean Integration**: Existing DetailedReaderView flow remains unchanged
4. **Easy Testing**: Components have clear interfaces and single responsibilities
5. **Future Scalability**: Structure supports additional interactive features

### Implementation Order
1. **Phase 1**: Complete speech recognition service and permissions
2. **Phase 2**: Implement word highlighting and sound effect playback
3. **Phase 3**: Add sound effect management and optimization
4. **Phase 4**: Performance tuning and user testing

---

## Feature 4: RevenueCat Paywall System (Freemium to Premium)

### Overview
Implement RevenueCat as the paywall system to create a freemium model with clear usage limits and premium upgrade path. This feature will monetize the app while providing value in both free and premium tiers.

### Business Model Definition

#### Freemium Tier (Free)
- **Daily Stories**: Full access to view daily story rotation
- **AI Story Generation**: 2 stories lifetime limit
- **Story Reading**: Access to all story content but limited to 20% progress (uses existing `progress` column in `user_stories` table)
- **Audio Generation**: No access (premium feature only)

#### Premium Tier ($3.99/month or $37.99/year)
- **Daily Stories**: Full access maintained
- **AI Story Generation**: 2 stories per day (reset every 24 hours)
- **Story Reading**: Full access to complete story content (100% progress)
- **Audio Generation**: 2 AI story audio generations per month

### Database Schema Changes

#### Step 4.1: Create Subscription Management Tables
```sql
-- User subscription status and RevenueCat integration
CREATE TABLE user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_status TEXT CHECK (subscription_status IN ('free', 'premium', 'trial', 'expired')) DEFAULT 'free',
  revenue_cat_customer_id TEXT,
  revenue_cat_subscription_id TEXT,
  product_id TEXT, -- 'premium_monthly', 'premium_yearly'
  purchase_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id)
);

-- Usage tracking for freemium limits and premium quotas
CREATE TABLE user_usage_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  -- AI Story limits
  ai_stories_generated_lifetime INTEGER DEFAULT 0,
  ai_stories_generated_today INTEGER DEFAULT 0,
  ai_stories_last_reset_date DATE DEFAULT CURRENT_DATE,
  -- Audio generation limits (premium only)
  audio_generations_this_month INTEGER DEFAULT 0,
  audio_generations_last_reset_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
  -- Story reading progress tracking handled by existing user_stories.progress
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id)
);

-- RevenueCat webhook events log
CREATE TABLE revenue_cat_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'initial_purchase', 'renewal', 'cancellation', 'billing_issue', etc.
  revenue_cat_customer_id TEXT NOT NULL,
  product_id TEXT,
  subscription_id TEXT,
  event_data JSONB,
  processed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for all tables
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_cat_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own usage limits"
  ON user_usage_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage limits"
  ON user_usage_limits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage limits"
  ON user_usage_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Revenue cat events are system-managed only
CREATE POLICY "Users can view their own revenue cat events"
  ON revenue_cat_events FOR SELECT
  USING (auth.uid() = user_id);
```

#### Step 4.2: Update Existing Tables
```sql
-- Add subscription fields to profiles for quick access
ALTER TABLE profiles 
ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
ADD COLUMN subscription_expires_at TIMESTAMPTZ,
ADD COLUMN revenue_cat_customer_id TEXT;

-- Create index for quick subscription lookups
CREATE INDEX idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX idx_profiles_revenue_cat_customer ON profiles(revenue_cat_customer_id);

-- Initialize usage limits for existing users
INSERT INTO user_usage_limits (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_usage_limits);
```

### Backend Implementation

#### Step 4.3: Install RevenueCat Dependencies
```bash
npm install react-native-purchases
# For iOS
cd ios && pod install
# For Android - add to android/app/build.gradle if needed
```

#### Step 4.4: Create RevenueCat Service
- [ ] Create `services/revenueCatService.ts`
```typescript
import Purchases, { CustomerInfo, PurchaserInfo, PRODUCT_CATEGORY } from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

class RevenueCatService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    
    if (Platform.OS === 'ios') {
      await Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUE_CAT_IOS_API_KEY! });
    } else {
      await Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUE_CAT_ANDROID_API_KEY! });
    }
    
    this.initialized = true;
  }

  async identifyUser(userId: string) {
    await this.initialize();
    await Purchases.logIn(userId);
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    await this.initialize();
    return await Purchases.getCustomerInfo();
  }

  async getProducts() {
    await this.initialize();
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages || [];
  }

  async purchaseProduct(productId: string) {
    await this.initialize();
    const { customerInfo } = await Purchases.purchaseProduct(productId);
    await this.syncSubscriptionStatus(customerInfo);
    return customerInfo;
  }

  async restorePurchases() {
    await this.initialize();
    const customerInfo = await Purchases.restorePurchases();
    await this.syncSubscriptionStatus(customerInfo);
    return customerInfo;
  }

  async syncSubscriptionStatus(customerInfo?: CustomerInfo, retryCount = 0) {
    try {
      if (!customerInfo) {
        customerInfo = await this.getCustomerInfo();
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
      const premiumEntitlement = customerInfo.entitlements.active['premium'];
      const expiryDate = premiumEntitlement?.expirationDate;
      const productId = premiumEntitlement?.productIdentifier;

      // Update profiles table for quick access
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_tier: isPremium ? 'premium' : 'free',
          subscription_expires_at: expiryDate,
          revenue_cat_customer_id: customerInfo.originalAppUserId
        })
        .eq('id', user.id);

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }

      // Update or insert subscription record
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          subscription_status: isPremium ? 'premium' : 'free',
          revenue_cat_customer_id: customerInfo.originalAppUserId,
          product_id: productId,
          expiry_date: expiryDate,
          is_active: isPremium,
          platform: Platform.OS,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (subscriptionError) {
        throw new Error(`Failed to update subscription: ${subscriptionError.message}`);
      }

    } catch (error) {
      console.error('Error syncing subscription status:', error);
      
      // Retry logic for transient failures
      if (retryCount < 3) {
        console.log(`Retrying subscription sync (attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return this.syncSubscriptionStatus(customerInfo, retryCount + 1);
      }
      
      // Log error for monitoring but don't throw to avoid breaking user flow
      console.error('Failed to sync subscription after 3 attempts:', error);
    }
  }

  async checkSubscriptionStatus(userId: string): Promise<{
    isPremium: boolean;
    expiresAt?: Date;
    status: string;
  }> {
    const { data } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', userId)
      .single();

    return {
      isPremium: data?.subscription_tier === 'premium',
      expiresAt: data?.subscription_expires_at ? new Date(data.subscription_expires_at) : undefined,
      status: data?.subscription_tier || 'free'
    };
  }
}

export const revenueCatService = new RevenueCatService();
```

#### Step 4.5: Create Subscription Management Service
- [ ] Create `services/subscriptionService.ts`
```typescript
import { supabase } from '@/lib/supabase';
import { revenueCatService } from './revenueCatService';

export interface SubscriptionStatus {
  isPremium: boolean;
  expiresAt?: Date;
  status: 'free' | 'premium' | 'trial' | 'expired';
}

export interface UsageLimits {
  aiStories: {
    lifetimeUsed: number;
    lifetimeLimit: number;
    todayUsed: number;
    dailyLimit: number;
    canGenerate: boolean;
    resetTime?: Date;
  };
  audioGeneration: {
    monthlyUsed: number;
    monthlyLimit: number;
    canGenerate: boolean;
    resetDate?: Date;
  };
  storyReading: {
    canReadFull: boolean;
    maxProgressAllowed: number;
  };
}

class SubscriptionService {
  async getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const { data } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', userId)
      .single();

    return {
      isPremium: data?.subscription_tier === 'premium',
      expiresAt: data?.subscription_expires_at ? new Date(data.subscription_expires_at) : undefined,
      status: data?.subscription_tier || 'free'
    };
  }

  async checkAIStoryGenerationLimit(userId: string): Promise<{
    canGenerate: boolean;
    reason?: string;
    usageInfo: {
      lifetimeUsed: number;
      todayUsed: number;
      limit: number;
      resetTime?: Date;
    };
  }> {
    const { isPremium } = await this.getUserSubscriptionStatus(userId);
    
    // Get or create usage record
    let { data: usage } = await supabase
      .from('user_usage_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!usage) {
      const { data: newUsage } = await supabase
        .from('user_usage_limits')
        .insert({ user_id: userId })
        .select()
        .single();
      usage = newUsage;
    }

    // Check if daily reset is needed (for premium users)
    const today = new Date().toISOString().split('T')[0];
    const lastReset = usage.ai_stories_last_reset_date ? 
      new Date(usage.ai_stories_last_reset_date).toISOString().split('T')[0] : null;
    
    if (isPremium && lastReset !== today) {
      // Reset daily counter for premium users
      await supabase
        .from('user_usage_limits')
        .update({
          ai_stories_generated_today: 0,
          ai_stories_last_reset_date: today,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      usage.ai_stories_generated_today = 0;
    }

    if (isPremium) {
      // Premium: 2 stories per day
      const canGenerate = usage.ai_stories_generated_today < 2;
      const nextReset = new Date();
      nextReset.setDate(nextReset.getDate() + 1);
      nextReset.setHours(0, 0, 0, 0);

      return {
        canGenerate,
        reason: canGenerate ? undefined : 'Daily limit of 2 AI stories reached. Resets at midnight.',
        usageInfo: {
          lifetimeUsed: usage.ai_stories_generated_lifetime,
          todayUsed: usage.ai_stories_generated_today,
          limit: 2,
          resetTime: nextReset
        }
      };
    } else {
      // Free: 2 lifetime stories
      const canGenerate = usage.ai_stories_generated_lifetime < 2;
      
      return {
        canGenerate,
        reason: canGenerate ? undefined : 'You\'ve used your 2 lifetime AI stories. Upgrade to Premium for 2 stories daily!',
        usageInfo: {
          lifetimeUsed: usage.ai_stories_generated_lifetime,
          todayUsed: usage.ai_stories_generated_today,
          limit: 2
        }
      };
    }
  }

  async incrementAIStoryUsage(userId: string): Promise<void> {
    await supabase.rpc('increment_ai_story_usage', { user_id: userId });
  }

  async checkAudioGenerationLimit(userId: string): Promise<{
    canGenerate: boolean;
    reason?: string;
    usageInfo: {
      monthlyUsed: number;
      monthlyLimit: number;
      resetDate?: Date;
    };
  }> {
    const { isPremium } = await this.getUserSubscriptionStatus(userId);
    
    if (!isPremium) {
      return {
        canGenerate: false,
        reason: 'Audio generation is a Premium feature. Upgrade to generate AI story audio!',
        usageInfo: {
          monthlyUsed: 0,
          monthlyLimit: 0
        }
      };
    }

    // Get usage record
    let { data: usage } = await supabase
      .from('user_usage_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!usage) {
      const { data: newUsage } = await supabase
        .from('user_usage_limits')
        .insert({ user_id: userId })
        .select()
        .single();
      usage = newUsage;
    }

    // Check if monthly reset is needed
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const lastResetMonth = usage.audio_generations_last_reset_date ? 
      new Date(usage.audio_generations_last_reset_date).toISOString().slice(0, 7) : null;
    
    if (currentMonth !== lastResetMonth) {
      await supabase
        .from('user_usage_limits')
        .update({
          audio_generations_this_month: 0,
          audio_generations_last_reset_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      usage.audio_generations_this_month = 0;
    }

    const canGenerate = usage.audio_generations_this_month < 2;
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1, 1);
    nextReset.setHours(0, 0, 0, 0);

    return {
      canGenerate,
      reason: canGenerate ? undefined : 'Monthly limit of 2 audio generations reached. Resets next month.',
      usageInfo: {
        monthlyUsed: usage.audio_generations_this_month,
        monthlyLimit: 2,
        resetDate: nextReset
      }
    };
  }

  async incrementAudioUsage(userId: string): Promise<void> {
    await supabase.rpc('increment_audio_usage', { user_id: userId });
  }

  async checkStoryReadingLimit(userId: string): Promise<{
    canReadFull: boolean;
    maxProgressAllowed: number;
    reason?: string;
  }> {
    const { isPremium } = await this.getUserSubscriptionStatus(userId);
    
    if (isPremium) {
      return {
        canReadFull: true,
        maxProgressAllowed: 1.0,
        reason: undefined
      };
    } else {
      return {
        canReadFull: false,
        maxProgressAllowed: 0.2,
        reason: 'Upgrade to Premium to read complete stories!'
      };
    }
  }

  async getUserUsageLimits(userId: string): Promise<UsageLimits> {
    const [aiStoryCheck, audioCheck, readingCheck] = await Promise.all([
      this.checkAIStoryGenerationLimit(userId),
      this.checkAudioGenerationLimit(userId),
      this.checkStoryReadingLimit(userId)
    ]);

    return {
      aiStories: {
        lifetimeUsed: aiStoryCheck.usageInfo.lifetimeUsed,
        lifetimeLimit: aiStoryCheck.usageInfo.limit,
        todayUsed: aiStoryCheck.usageInfo.todayUsed,
        dailyLimit: aiStoryCheck.usageInfo.limit,
        canGenerate: aiStoryCheck.canGenerate,
        resetTime: aiStoryCheck.usageInfo.resetTime
      },
      audioGeneration: {
        monthlyUsed: audioCheck.usageInfo.monthlyUsed,
        monthlyLimit: audioCheck.usageInfo.monthlyLimit,
        canGenerate: audioCheck.canGenerate,
        resetDate: audioCheck.usageInfo.resetDate
      },
      storyReading: {
        canReadFull: readingCheck.canReadFull,
        maxProgressAllowed: readingCheck.maxProgressAllowed
      }
    };
  }
}

export const subscriptionService = new SubscriptionService();
```

#### Step 4.6: Create Database Functions
- [ ] Create Supabase functions for atomic usage updates
```sql
-- Function to increment AI story usage atomically
CREATE OR REPLACE FUNCTION increment_ai_story_usage(user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_usage_limits (user_id, ai_stories_generated_lifetime, ai_stories_generated_today, updated_at)
  VALUES (user_id, 1, 1, timezone('utc'::text, now()))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    ai_stories_generated_lifetime = user_usage_limits.ai_stories_generated_lifetime + 1,
    ai_stories_generated_today = user_usage_limits.ai_stories_generated_today + 1,
    updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment audio usage atomically
CREATE OR REPLACE FUNCTION increment_audio_usage(user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_usage_limits (user_id, audio_generations_this_month, updated_at)
  VALUES (user_id, 1, timezone('utc'::text, now()))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    audio_generations_this_month = user_usage_limits.audio_generations_this_month + 1,
    updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_ai_story_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_audio_usage(UUID) TO authenticated;
```

#### Step 4.6b: Create RevenueCat Webhook Handler
- [ ] Create Supabase Edge Function `supabase/functions/revenue-cat-webhook/index.ts`
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    const { event } = payload;

    // Verify webhook signature (recommended for production)
    // const signature = req.headers.get('X-RevenueCat-Signature');
    // if (!verifyWebhookSignature(signature, JSON.stringify(payload))) {
    //   return new Response('Invalid signature', { status: 401 });
    // }

    // Log the webhook event
    await supabase
      .from('revenue_cat_events')
      .insert({
        user_id: event.app_user_id,
        event_type: event.type,
        revenue_cat_customer_id: event.app_user_id,
        product_id: event.product_id,
        subscription_id: event.id,
        event_data: event,
        processed_at: new Date().toISOString()
      });

    // Handle different event types
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
        await handleSubscriptionActivation(supabase, event);
        break;
      
      case 'CANCELLATION':
      case 'EXPIRATION':
        await handleSubscriptionDeactivation(supabase, event);
        break;
      
      case 'BILLING_ISSUE':
        await handleBillingIssue(supabase, event);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

async function handleSubscriptionActivation(supabase: any, event: any) {
  const userId = event.app_user_id;
  const expiryDate = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  
  // Update profiles table
  await supabase
    .from('profiles')
    .update({
      subscription_tier: 'premium',
      subscription_expires_at: expiryDate
    })
    .eq('id', userId);

  // Update subscription record
  await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      subscription_status: 'premium',
      revenue_cat_customer_id: event.app_user_id,
      product_id: event.product_id,
      expiry_date: expiryDate,
      is_active: true,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });
}

async function handleSubscriptionDeactivation(supabase: any, event: any) {
  const userId = event.app_user_id;
  
  // Update profiles table
  await supabase
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_expires_at: null
    })
    .eq('id', userId);

  // Update subscription record
  await supabase
    .from('user_subscriptions')
    .update({
      subscription_status: 'expired',
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
}

async function handleBillingIssue(supabase: any, event: any) {
  const userId = event.app_user_id;
  
  // Update subscription status to indicate billing issue
  await supabase
    .from('user_subscriptions')
    .update({
      subscription_status: 'billing_issue',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
  
  // Note: Don't immediately revoke access, give user time to resolve
}
```

### Service Integration Updates

#### Step 4.7: Update Existing Services
- [ ] Update `services/personalizedStoryService.ts`
```typescript
// Replace the limit check in createPersonalizedStory()
const limitCheck = await subscriptionService.checkAIStoryGenerationLimit(userId);
if (!limitCheck.canGenerate) {
  throw new Error(limitCheck.reason || 'Cannot generate story');
}

// After successful generation
await subscriptionService.incrementAIStoryUsage(userId);
```

- [ ] Update `services/audioService.ts`
```typescript
// Replace canGenerateAudio() method
async canGenerateAudio(): Promise<{ canGenerate: boolean; reason?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { canGenerate: false, reason: 'Not authenticated' };
  
  return await subscriptionService.checkAudioGenerationLimit(user.id);
}

// After successful audio generation
async generatePersonalizedStoryAudio(storyText: string, personalizedStoryId: string, voicePreference: string) {
  const limitCheck = await this.canGenerateAudio();
  if (!limitCheck.canGenerate) {
    throw new Error(limitCheck.reason);
  }

  // ... existing generation logic ...

  // After successful generation
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await subscriptionService.incrementAudioUsage(user.id);
  }

  return result;
}
```

### Frontend Implementation

#### Step 4.8: Create Paywall Components
- [ ] Create `components/paywall/PaywallScreen.tsx`
```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { revenueCatService } from '@/services/revenueCatService';
import { LinearGradient } from 'expo-linear-gradient';

export default function PaywallScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const availableProducts = await revenueCatService.getProducts();
      setProducts(availableProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handlePurchase = async (productId: string) => {
    try {
      setLoading(true);
      await revenueCatService.purchaseProduct(productId);
      Alert.alert('Success!', 'Welcome to Premium! 🎉', [
        { text: 'Continue', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Purchase Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      await revenueCatService.restorePurchases();
      Alert.alert('Restored!', 'Your purchases have been restored.');
    } catch (error) {
      Alert.alert('Restore Failed', 'No purchases found to restore.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.title}>✨ Unlock Premium Features</Text>
        <Text style={styles.subtitle}>Give your child the complete Taily experience</Text>
      </LinearGradient>

      <View style={styles.featuresContainer}>
        <FeatureItem 
          icon="🤖" 
          title="2 AI Stories Daily" 
          description="Generate personalized stories every day featuring your child as the hero"
          highlight="vs. 2 lifetime stories"
        />
        <FeatureItem 
          icon="🎵" 
          title="2 Audio Stories Monthly" 
          description="Listen to AI-generated stories with professional voice narration"
          highlight="Exclusive to Premium"
        />
        <FeatureItem 
          icon="📖" 
          title="Full Story Access" 
          description="Read complete stories without any limitations"
          highlight="vs. 20% preview only"
        />
        <FeatureItem 
          icon="🎯" 
          title="Daily Story Access" 
          description="Continue enjoying our curated daily stories"
          highlight="Always free"
        />
      </View>

      <View style={styles.pricingContainer}>
        <TouchableOpacity 
          style={styles.purchaseButton}
          onPress={() => handlePurchase('premium_yearly')}
          disabled={loading}
        >
          <Text style={styles.purchaseButtonText}>
            Start Premium - $37.99/year
          </Text>
          <Text style={styles.purchaseButtonSubtext}>
            Save $9.89 yearly • Cancel anytime
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.purchaseButton, styles.monthlyButton]}
          onPress={() => handlePurchase('premium_monthly')}
          disabled={loading}
        >
          <Text style={styles.purchaseButtonText}>
            Start Premium - $3.99/month
          </Text>
          <Text style={styles.purchaseButtonSubtext}>
            Cancel anytime
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleRestore} disabled={loading}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.back()} disabled={loading}>
          <Text style={styles.cancelText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
  highlight: string;
}

function FeatureItem({ icon, title, description, highlight }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
        <Text style={styles.featureHighlight}>{highlight}</Text>
      </View>
    </View>
  );
}
```

- [ ] Create `components/paywall/PaywallTrigger.tsx`
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface PaywallTriggerProps {
  visible: boolean;
  onClose: () => void;
  feature: 'ai_story' | 'audio_generation' | 'full_reading';
  customMessage?: string;
}

export function PaywallTrigger({ visible, onClose, feature, customMessage }: PaywallTriggerProps) {
  const getFeatureDetails = () => {
    switch (feature) {
      case 'ai_story':
        return {
          icon: '🤖',
          title: 'More AI Stories Available',
          message: customMessage || 'You\'ve used your 2 lifetime AI stories. Upgrade to Premium for 2 new stories every day!',
          benefits: ['2 AI stories daily', 'Unlimited story reading', '2 monthly audio generations']
        };
      case 'audio_generation':
        return {
          icon: '🎵',
          title: 'Audio Generation',
          message: customMessage || 'Audio generation is a Premium feature. Upgrade to bring your stories to life!',
          benefits: ['2 audio stories monthly', '2 AI stories daily', 'Unlimited story reading']
        };
      case 'full_reading':
        return {
          icon: '📖',
          title: 'Read the Full Story',
          message: customMessage || 'Upgrade to Premium to read the complete story without limitations!',
          benefits: ['Full story access', '2 AI stories daily', '2 monthly audio generations']
        };
      default:
        return {
          icon: '✨',
          title: 'Premium Feature',
          message: 'This feature requires Premium subscription.',
          benefits: ['All premium features']
        };
    }
  };

  const details = getFeatureDetails();

  const handleUpgrade = () => {
    onClose();
    router.push('/paywall');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.header}
          >
            <Text style={styles.icon}>{details.icon}</Text>
            <Text style={styles.title}>{details.title}</Text>
          </LinearGradient>
          
          <View style={styles.content}>
            <Text style={styles.message}>{details.message}</Text>
            
            <View style={styles.benefitsList}>
              {details.benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <Text style={styles.checkmark}>✓</Text>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>
          
          <View style={styles.buttons}>
            <TouchableOpacity 
              style={styles.upgradeButton}
              onPress={handleUpgrade}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

#### Step 4.9: Create Usage Display Components
- [ ] Create `components/subscription/UsageIndicator.tsx`
```typescript
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { subscriptionService, UsageLimits } from '@/services/subscriptionService';
import { useUser } from '@/hooks/useUser';

interface UsageIndicatorProps {
  type: 'ai_stories' | 'audio_generation';
  compact?: boolean;
}

export function UsageIndicator({ type, compact = false }: UsageIndicatorProps) {
  const { user } = useUser();
  const [usage, setUsage] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUsage();
    }
  }, [user]);

  const loadUsage = async () => {
    try {
      const usageLimits = await subscriptionService.getUserUsageLimits(user.id);
      setUsage(usageLimits);
    } catch (error) {
      console.error('Error loading usage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usage) {
    return null;
  }

  if (type === 'ai_stories') {
    const { aiStories } = usage;
    const progress = aiStories.dailyLimit > 0 
      ? aiStories.todayUsed / aiStories.dailyLimit 
      : aiStories.lifetimeUsed / aiStories.lifetimeLimit;

    return (
      <View style={compact ? styles.compactContainer : styles.container}>
        <Text style={styles.label}>AI Stories</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.usageText}>
            {aiStories.dailyLimit > 0 
              ? `${aiStories.todayUsed}/${aiStories.dailyLimit} today`
              : `${aiStories.lifetimeUsed}/${aiStories.lifetimeLimit} lifetime`
            }
          </Text>
        </View>
        {aiStories.resetTime && (
          <Text style={styles.resetText}>
            Resets {formatResetTime(aiStories.resetTime)}
          </Text>
        )}
      </View>
    );
  }

  if (type === 'audio_generation') {
    const { audioGeneration } = usage;
    const progress = audioGeneration.monthlyUsed / audioGeneration.monthlyLimit;

    return (
      <View style={compact ? styles.compactContainer : styles.container}>
        <Text style={styles.label}>Audio Generation</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.usageText}>
            {audioGeneration.monthlyUsed}/{audioGeneration.monthlyLimit} this month
          </Text>
        </View>
        {audioGeneration.resetDate && (
          <Text style={styles.resetText}>
            Resets {formatResetTime(audioGeneration.resetDate)}
          </Text>
        )}
      </View>
    );
  }

  return null;
}

function formatResetTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.ceil(diff / (1000 * 60 * 60));
  
  if (hours <= 24) {
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  const days = Math.ceil(hours / 24);
  return `in ${days} day${days !== 1 ? 's' : ''}`;
}
```

#### Step 4.10: Create Subscription Context
- [ ] Create `context/SubscriptionContext.tsx`
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscriptionService, SubscriptionStatus } from '@/services/subscriptionService';
import { revenueCatService } from '@/services/revenueCatService';
import { useUser } from '@/hooks/useUser';

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  loading: true,
  refreshSubscription: async () => {}
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      initializeSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [user]);

  const initializeSubscription = async () => {
    try {
      // Initialize RevenueCat with user
      await revenueCatService.identifyUser(user.id);
      
      // Sync subscription status
      await revenueCatService.syncSubscriptionStatus();
      
      // Load current status
      await refreshSubscription();
    } catch (error) {
      console.error('Error initializing subscription:', error);
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const status = await subscriptionService.getUserSubscriptionStatus(user.id);
      setSubscription(status);
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      refreshSubscription
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};
```

### App Initialization

#### Step 4.10b: Update App Layout
- [ ] Update `app/_layout.tsx` to initialize RevenueCat and SubscriptionProvider
```typescript
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { revenueCatService } from '@/services/revenueCatService';

export default function RootLayout() {
  useEffect(() => {
    // Initialize RevenueCat on app startup
    const initializeApp = async () => {
      try {
        await revenueCatService.initialize();
        console.log('RevenueCat initialized successfully');
      } catch (error) {
        console.error('Failed to initialize RevenueCat:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <SubscriptionProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="paywall" options={{ 
          presentation: 'modal',
          title: 'Upgrade to Premium' 
        }} />
        <Stack.Screen name="story/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      </Stack>
    </SubscriptionProvider>
  );
}
```

#### Step 4.10c: Create Paywall Route
- [ ] Create `app/paywall.tsx` (main paywall screen route)
```typescript
import PaywallScreen from '@/components/paywall/PaywallScreen';

export default function PaywallRoute() {
  return <PaywallScreen />;
}
```

### Integration Points

#### Step 4.11: Update Story Reading Components
- [ ] Update story reading components to check reading limits
```typescript
// In story reading components
const [showPaywall, setShowPaywall] = useState(false);
const [paywallFeature, setPaywallFeature] = useState<'full_reading'>('full_reading');

const handleProgressUpdate = async (newProgress: number) => {
  const { canReadFull, maxProgressAllowed } = await subscriptionService.checkStoryReadingLimit(user.id);
  
  if (!canReadFull && newProgress > maxProgressAllowed) {
    setShowPaywall(true);
    setPaywallFeature('full_reading');
    return; // Don't update progress beyond limit
  }
  
  // Update progress normally
  updateProgress(newProgress);
};

return (
  <>
    {/* Story content */}
    <PaywallTrigger 
      visible={showPaywall}
      onClose={() => setShowPaywall(false)}
      feature={paywallFeature}
    />
  </>
);
```

#### Step 4.12: Update AI Story Generation
- [ ] Update AI story generation to check limits
```typescript
// In AI story generation components
const handleGenerateStory = async () => {
  const limitCheck = await subscriptionService.checkAIStoryGenerationLimit(user.id);
  
  if (!limitCheck.canGenerate) {
    setShowPaywall(true);
    setPaywallFeature('ai_story');
    setPaywallMessage(limitCheck.reason);
    return;
  }
  
  // Proceed with generation
  generateStory();
};
```

#### Step 4.13: Update Audio Generation
- [ ] Update audio generation to check limits
```typescript
// In audio generation components
const handleGenerateAudio = async () => {
  const limitCheck = await subscriptionService.checkAudioGenerationLimit(user.id);
  
  if (!limitCheck.canGenerate) {
    setShowPaywall(true);
    setPaywallFeature('audio_generation');
    setPaywallMessage(limitCheck.reason);
    return;
  }
  
  // Proceed with audio generation
  generateAudio();
};
```

### App Store Configuration

#### Step 4.14: RevenueCat Dashboard Setup
- [ ] Create RevenueCat account and project
- [ ] Set up products:
  - `premium_monthly` - $3.99/month
  - `premium_yearly` - $37.99/year
- [ ] Create entitlements:
  - `premium` - Access to all premium features
- [ ] Configure webhook URL for Supabase integration:
  - URL: `https://your-project.supabase.co/functions/v1/revenue-cat-webhook`
  - Events: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`
- [ ] Set up iOS and Android API keys
- [ ] Deploy webhook edge function:
```bash
supabase functions deploy revenue-cat-webhook --project-ref your-project-ref
```

#### Step 4.15: App Store Connect (iOS)
- [ ] Create in-app purchase products:
  - Auto-renewable subscription: `premium_monthly` ($3.99/month)
  - Auto-renewable subscription: `premium_yearly` ($37.99/year)
  - Set pricing: $3.99/month, $37.99/year
  - Configure subscription groups

#### Step 4.16: Google Play Console (Android)
- [ ] Create subscription products
- [ ] Set up billing integration
- [ ] Configure pricing and availability

### Environment Configuration

#### Step 4.17: Environment Variables
- [ ] Add to `.env`:
```
EXPO_PUBLIC_REVENUE_CAT_IOS_API_KEY=your_ios_api_key
EXPO_PUBLIC_REVENUE_CAT_ANDROID_API_KEY=your_android_api_key
```

#### Step 4.18: App Configuration
- [ ] Update `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "react-native-purchases",
        {
          "useFrameworks": "static"
        }
      ]
    ]
  }
}
```

### Testing Checklist

#### Free User Testing
- [ ] Can view daily story completely ✓
- [ ] Can generate exactly 2 AI stories lifetime
- [ ] Story reading stops at 20% progress and shows paywall
- [ ] Cannot generate audio - shows paywall immediately
- [ ] Paywall appears with correct messaging for each feature
- [ ] Usage indicators show correct limits and progress

#### Premium User Testing  
- [ ] Can generate 2 AI stories daily (resets at midnight)
- [ ] Can generate 2 audio stories monthly (resets monthly)
- [ ] Can read full story content (100% progress)
- [ ] Daily story access maintained (always free)
- [ ] Usage indicators show premium limits
- [ ] Subscription status displays correctly

#### Purchase Flow Testing
- [ ] RevenueCat purchase flow completes successfully
- [ ] Subscription status syncs to Supabase immediately
- [ ] Features unlock immediately after purchase
- [ ] Restore purchases works correctly
- [ ] Subscription expiry handling works properly
- [ ] Error handling for failed purchases

#### Edge Cases
- [ ] Network connectivity issues during purchase
- [ ] App backgrounding during purchase flow
- [ ] Subscription renewal handling
- [ ] Subscription cancellation handling
- [ ] Multiple device synchronization

#### Monitoring & Analytics
- [ ] Track paywall conversion rates by feature trigger
- [ ] Monitor subscription sync success/failure rates
- [ ] Log usage limit hit rates for freemium users
- [ ] Track time-to-upgrade after paywall trigger
- [ ] Monitor webhook delivery success rates
- [ ] Set up alerts for failed subscription syncs

---

## Implementation Order & Timeline

### Phase 1: AI-Personalized Stories (Week 1-2)
1. Database setup
2. AI service integration
3. Basic generation flow
4. UI integration.
5. Testing & refinement

### Phase 2: Voice Read Mode (Week 3-4)
1. ElevenLabs setup
2. Audio generation service
3. Player implementation
4. Offline support
5. Testing & optimization

### Phase 3: Interactive Reading (Week 5-6)
1. Permissions & setup
2. Speech recognition
3. Sound effect system
4. UI implementation
5. Performance optimization

### Phase 4: RevenueCat Paywall System (Week 7-8)
1. RevenueCat setup
2. Subscription management
3. Usage tracking
4. UI integration
5. Testing & optimization

---

## Technical Considerations

### Required Dependencies
```json
{
  "dependencies": {
    "expo-av": "~14.0.7",
    "expo-microphone": "~2.0.0",
    "expo-file-system": "~17.0.1",
    "@react-native-voice/voice": "^3.2.4",
    "openai": "^4.0.0",
    "react-native-purchases": "^8.0.0"
  }
}
```

### API Keys & Security
- Store all API keys in environment variables
- Implement rate limiting
- Add usage monitoring
- Create fallback options

### Performance
- Implement lazy loading for audio files
- Use caching strategically
- Optimize real-time processing
- Monitor memory usage

### Error Handling
- Graceful degradation for each feature
- User-friendly error messages
- Retry mechanisms
- Offline fallbacks

### Analytics
- Track feature usage
- Monitor generation times
- Log error rates
- Measure user engagement

---

## Testing Strategy

### Unit Tests
- AI prompt generation
- Audio processing functions
- Speech recognition logic
- Sound effect triggers

### Integration Tests
- End-to-end story generation
- Audio playback flow
- Interactive reading session
- Offline scenarios

### User Acceptance Testing
- Parent usability testing
- Child engagement metrics
- Performance on various devices
- Accessibility compliance

---

## Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] API rate limits verified
- [ ] Storage quotas checked
- [ ] Performance benchmarks met

### Post-deployment
- [ ] Monitor error rates
- [ ] Track API usage
- [ ] Gather user feedback
- [ ] Plan iterative improvements 