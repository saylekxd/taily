import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

export interface StoryGenerationParams {
  childName: string;
  age: number;
  interests: string[];
  readingLevel: 'beginner' | 'intermediate' | 'advanced';
  theme?: string;
  language?: 'en' | 'pl';
}

export interface GeneratedStory {
  title: string;
  content: string;
  categories: string[];
  readingTime: number;
  coverImagePrompt: string;
}

/**
 * Generate a personalized story using Gemini AI
 */
export async function generatePersonalizedStory(params: StoryGenerationParams): Promise<GeneratedStory> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const prompt = createStoryPrompt(params);
    console.log('Generating story with prompt:', prompt);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the AI response
    const parsedStory = parseAIResponse(text);
    
    // Validate the story
    validateStory(parsedStory, params);
    
    return parsedStory;
  } catch (error) {
    console.error('Error generating personalized story:', error);
    throw new Error('Failed to generate story. Please try again.');
  }
}

/**
 * Create a detailed prompt for story generation
 */
function createStoryPrompt(params: StoryGenerationParams): string {
  const { childName, age, interests, readingLevel, theme, language = 'en' } = params;
  
  const readingLevelGuidelines = {
    beginner: 'Use simple words, short sentences (5-8 words), and basic vocabulary. Include lots of action and visual descriptions.',
    intermediate: 'Use moderate vocabulary, medium sentences (8-12 words), and some descriptive language. Include dialogue and character development.',
    advanced: 'Use rich vocabulary, complex sentences, detailed descriptions, and sophisticated storytelling techniques.'
  };
  
  const interestsList = interests.join(', ');
  const selectedTheme = theme || interests[Math.floor(Math.random() * interests.length)];
  
  const languageInstruction = language === 'pl' 
    ? 'Write the story in Polish language.' 
    : 'Write the story in English language.';
  
  return `
You are a professional children's story writer. Create a personalized story with the following requirements:

CHILD DETAILS:
- Name: ${childName}
- Age: ${age} years old
- Interests: ${interestsList}
- Reading Level: ${readingLevel}
- Theme: ${selectedTheme}

STORY REQUIREMENTS:
- ${languageInstruction}
- Make ${childName} the main character and hero of the story
- Use ${childName}'s name naturally throughout the story (at least 5 times)
- Incorporate the theme: ${selectedTheme}
- ${readingLevelGuidelines[readingLevel]}
- Story should be age-appropriate for ${age}-year-olds
- Include a positive message or lesson
- Length: 300-600 words for ${readingLevel} level
- Create an engaging adventure where ${childName} overcomes a challenge

RESPONSE FORMAT (return ONLY this JSON structure):
{
  "title": "Story title here",
  "content": "Full story content here with proper paragraphs",
  "categories": ["category1", "category2"],
  "readingTime": estimated_minutes_as_number,
  "coverImagePrompt": "Detailed description for generating a cover image"
}

IMPORTANT:
- Return ONLY the JSON object, no additional text
- Ensure the story is complete and engaging
- Make sure ${childName} is clearly the protagonist
- Include vivid descriptions suitable for the reading level
- The cover image prompt should describe a scene from the story featuring ${childName}
`;
}

/**
 * Parse the AI response and extract story components
 */
function parseAIResponse(response: string): GeneratedStory {
  try {
    // Clean the response - remove any markdown formatting or extra text
    let cleanResponse = response.trim();
    
    // Find JSON object in the response
    const jsonStart = cleanResponse.indexOf('{');
    const jsonEnd = cleanResponse.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('No JSON object found in AI response');
    }
    
    const jsonString = cleanResponse.substring(jsonStart, jsonEnd);
    const parsed = JSON.parse(jsonString);
    
    return {
      title: parsed.title || 'Untitled Story',
      content: parsed.content || '',
      categories: Array.isArray(parsed.categories) ? parsed.categories : ['adventure'],
      readingTime: typeof parsed.readingTime === 'number' ? parsed.readingTime : 5,
      coverImagePrompt: parsed.coverImagePrompt || 'A colorful children\'s book illustration'
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error('Failed to parse story from AI response');
  }
}

/**
 * Validate the generated story
 */
function validateStory(story: GeneratedStory, params: StoryGenerationParams): void {
  const { childName } = params;
  
  // Check if story contains child's name
  const nameCount = (story.content.toLowerCase().match(new RegExp(childName.toLowerCase(), 'g')) || []).length;
  if (nameCount < 3) {
    throw new Error('Story does not adequately feature the child as the main character');
  }
  
  // Check minimum content length
  if (story.content.length < 200) {
    throw new Error('Story content is too short');
  }
  
  // Check if title exists
  if (!story.title || story.title.length < 3) {
    throw new Error('Story title is missing or too short');
  }
}

/**
 * Generate a cover image URL using a placeholder service
 * In a production app, you would integrate with DALL-E, Midjourney, or similar
 */
export function generateCoverImageUrl(coverImagePrompt: string, childName: string): string {
  // For now, we'll use a curated set of child-friendly images from Pexels
  const coverImages = [
    'https://jiqflpvashecttmtyelw.supabase.co/storage/v1/object/public/marketing/personalized-stories/ai-child-reading.png', // Child reading
    'https://jiqflpvashecttmtyelw.supabase.co/storage/v1/object/public/marketing/personalized-stories/ai-adventure-scene.png', // Adventure scene
    'https://jiqflpvashecttmtyelw.supabase.co/storage/v1/object/public/marketing/personalized-stories/ai-fantasy-landscape.png', // Fantasy landscape
    'https://jiqflpvashecttmtyelw.supabase.co/storage/v1/object/public/marketing/personalized-stories/magical-forest.png', // Magical forest
    'https://jiqflpvashecttmtyelw.supabase.co/storage/v1/object/public/marketing/personalized-stories/ai-ocean-adventure.png', // Ocean adventure
    'https://jiqflpvashecttmtyelw.supabase.co/storage/v1/object/public/marketing/personalized-stories/ai-space-theme.png', // Space theme
    'https://jiqflpvashecttmtyelw.supabase.co/storage/v1/object/public/marketing/personalized-stories/ai-animal-friends.png', // Animal friends
    'https://jiqflpvashecttmtyelw.supabase.co/storage/v1/object/public/marketing/personalized-stories/ai-castle-adventure.png', // Castle adventure
  ];
  
  // Select image based on prompt content and child name
  const promptLower = coverImagePrompt.toLowerCase();
  let selectedImage = coverImages[0]; // Default
  
  if (promptLower.includes('space') || promptLower.includes('star')) {
    selectedImage = coverImages[5];
  } else if (promptLower.includes('ocean') || promptLower.includes('sea')) {
    selectedImage = coverImages[4];
  } else if (promptLower.includes('forest') || promptLower.includes('tree')) {
    selectedImage = coverImages[3];
  } else if (promptLower.includes('animal') || promptLower.includes('pet')) {
    selectedImage = coverImages[6];
  } else if (promptLower.includes('castle') || promptLower.includes('princess') || promptLower.includes('knight')) {
    selectedImage = coverImages[7];
  } else {
    // Use child name to create consistent selection
    const nameHash = childName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    selectedImage = coverImages[nameHash % coverImages.length];
  }
  
  return selectedImage;
}

/**
 * Check if user has reached the story generation limit
 */
export async function checkStoryGenerationLimit(userId: string): Promise<{ canGenerate: boolean; currentCount: number; maxCount: number }> {
  // This would typically check the database for existing personalized stories
  // For now, we'll return a simple limit check
  const maxCount = 2;
  
  try {
    // In a real implementation, you would query the database here
    // const { count } = await supabase.from('personalized_stories').select('*', { count: 'exact' }).eq('user_id', userId);
    const currentCount = 0; // Placeholder
    
    return {
      canGenerate: currentCount < maxCount,
      currentCount,
      maxCount
    };
  } catch (error) {
    console.error('Error checking story generation limit:', error);
    return {
      canGenerate: false,
      currentCount: 0,
      maxCount
    };
  }
}