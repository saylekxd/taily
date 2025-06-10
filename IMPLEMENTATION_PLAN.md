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
Add microphone listening during parent reading to trigger sound effects at specific words.

### Permissions & Setup

#### Step 3.1: Audio Permissions
- [ ] Add microphone permissions to app.json
- [ ] Create permission request flow
- [ ] Handle permission denial gracefully

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
  - Initialize speech recognition
  - Real-time word detection
  - Word matching algorithm
  - Performance optimization

#### Step 3.4: Sound Effects Service
- [ ] Create `services/soundEffectsService.ts`
  - Preload common sound effects
  - Play sound effects with low latency
  - Manage audio context
  - Handle multiple simultaneous sounds

#### Step 3.5: Story Analysis Service
- [ ] Create word-to-sound mapping logic
  - Analyze story text for trigger words
  - Generate position mappings
  - Handle word variations (plural, tense)

### Frontend Implementation

#### Step 3.6: Interactive Reading Mode UI
- [ ] Add "Interactive Reading" toggle
- [ ] Show microphone status indicator
- [ ] Highlight trigger words in text
- [ ] Add visual feedback when sound plays

#### Step 3.7: Real-time Processing
- [ ] Implement `hooks/useInteractiveReading.ts`
  - Start/stop listening
  - Process speech in real-time
  - Trigger sound effects
  - Sync with story progress

#### Step 3.8: Sound Effect Library
- [ ] Create sound effect management screen
  - Preview available sounds
  - Enable/disable specific effects
  - Volume control per effect

### Performance Optimization
- [ ] Implement audio buffer pool
- [ ] Optimize speech recognition sampling rate
- [ ] Add debouncing for rapid word detection
- [ ] Memory management for long sessions

### Testing Checklist
- [ ] Test speech recognition accuracy
- [ ] Verify sound effect timing
- [ ] Test with different reading speeds
- [ ] Check performance on older devices
- [ ] Test with background noise

---

## Implementation Order & Timeline

### Phase 1: AI-Personalized Stories (Week 1-2)
1. Database setup
2. AI service integration
3. Basic generation flow
4. UI integration
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
    "openai": "^4.0.0"
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