import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user from the request
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body with better error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }

    console.log('Request body received:', JSON.stringify(requestBody, null, 2));

    const { story_text, personalized_story_id, voice_preference = 'alloy' } = requestBody;

    // More detailed validation with logging
    if (!story_text) {
      console.error('Missing story_text. Received:', { story_text, type: typeof story_text });
      throw new Error('Missing required field: story_text');
    }

    if (!personalized_story_id) {
      console.error('Missing personalized_story_id. Received:', { personalized_story_id, type: typeof personalized_story_id });
      throw new Error('Missing required field: personalized_story_id');
    }

    console.log('Parameters validated successfully:', {
      story_text_length: story_text.length,
      personalized_story_id,
      voice_preference
    });

    // Check current month's usage
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = currentDate.getFullYear();

    const { data: usageData, error: usageError } = await supabaseClient
      .from('audio_generation_usage')
      .select('usage_count')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .single();

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Failed to check usage: ${usageError.message}`);
    }

    const currentUsage = usageData?.usage_count || 0;
    const MONTHLY_LIMIT = 5;

    if (currentUsage >= MONTHLY_LIMIT) {
      return new Response(
        JSON.stringify({ 
          error: 'Monthly audio generation limit reached',
          usage_count: currentUsage,
          limit: MONTHLY_LIMIT
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 429 
        }
      );
    }

    // Create audio generation job
    const { data: jobData, error: jobError } = await supabaseClient
      .from('audio_generation_jobs')
      .insert({
        personalized_story_id,
        user_id: user.id,
        status: 'processing'
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create job: ${jobError.message}`);
    }

    try {
      // Generate audio using ElevenLabs API
      const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
      if (!elevenlabsApiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      // Voice mapping for different preferences
      const voiceMapping: Record<string, string> = {
        'alloy': '21m00Tcm4TlvDq8ikWAM', // Default voice
        'echo': 'AZnzlk1XvdvUeBnXmlld', // Alternative voice
        'nova': 'EXAVITQu4vr4xnSDxMaL', // Child-friendly voice
      };

      const voiceId = voiceMapping[voice_preference] || voiceMapping['alloy'];

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenlabsApiKey,
        },
        body: JSON.stringify({
          text: story_text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioFile = new Uint8Array(audioBuffer);

      // Upload audio to Supabase Storage
      const fileName = `ai_audio/${personalized_story_id}_${Date.now()}.mp3`;
      
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('audio-files')
        .upload(fileName, audioFile, {
          contentType: 'audio/mpeg',
          cacheControl: '3600',
        });

      if (uploadError) {
        throw new Error(`Failed to upload audio: ${uploadError.message}`);
      }

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabaseClient.storage
        .from('audio-files')
        .getPublicUrl(fileName);

      // Calculate approximate duration (rough estimate: 150 words per minute)
      const wordCount = story_text.split(' ').length;
      const estimatedDuration = Math.round((wordCount / 150) * 60); // Duration in seconds

      // Update personalized_stories with audio information
      const { error: storyUpdateError } = await supabaseClient
        .from('personalized_stories')
        .update({
          audio_url: publicUrl,
          audio_duration: estimatedDuration,
          voice_id: voiceId
        })
        .eq('id', personalized_story_id)
        .eq('user_id', user.id);

      if (storyUpdateError) {
        throw new Error(`Failed to update story: ${storyUpdateError.message}`);
      }

      // Update usage count
      if (usageData) {
        // Update existing record
        const { error: updateUsageError } = await supabaseClient
          .from('audio_generation_usage')
          .update({ usage_count: currentUsage + 1 })
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .eq('year', currentYear);

        if (updateUsageError) {
          console.error('Failed to update usage count:', updateUsageError);
        }
      } else {
        // Create new record
        const { error: insertUsageError } = await supabaseClient
          .from('audio_generation_usage')
          .insert({
            user_id: user.id,
            month: currentMonth,
            year: currentYear,
            usage_count: 1
          });

        if (insertUsageError) {
          console.error('Failed to insert usage count:', insertUsageError);
        }
      }

      // Mark job as completed
      await supabaseClient
        .from('audio_generation_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobData.id);

      return new Response(
        JSON.stringify({
          success: true,
          audio_url: publicUrl,
          duration: estimatedDuration,
          usage_count: currentUsage + 1,
          limit: MONTHLY_LIMIT
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (audioError) {
      // Mark job as failed
      await supabaseClient
        .from('audio_generation_jobs')
        .update({
          status: 'failed',
          error_message: audioError instanceof Error ? audioError.message : String(audioError),
          completed_at: new Date().toISOString()
        })
        .eq('id', jobData.id);

      throw audioError;
    }

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.toString() : String(error)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    );
  }
}); 