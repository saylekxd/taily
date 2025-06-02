import { supabase } from '@/lib/supabase';
import { Story, UserProfile } from '@/types';
import { storyTemplates } from '@/constants/storyTemplates';

/**
 * Get a list of recommended stories based on user profile
 */
export async function getRecommendedStories(profile: UserProfile | null): Promise<Story[]> {
  if (!profile) {
    return getMockStories();
  }
  
  // In a real app, this would make API calls to get personalized stories
  // For this MVP, we'll use mock data based on the profile
  
  // Filter story templates based on age and interests
  const filteredTemplates = storyTemplates.filter(template => {
    const ageMatch = profile.age >= template.age_range[0] && profile.age <= template.age_range[1];
    const interestMatch = profile.interests.some(interest => 
      template.category === interest || template.category.includes(interest)
    );
    
    return ageMatch && interestMatch;
  });
  
  // Mock the personalized stories
  return filteredTemplates.map(template => ({
    id: template.id,
    title: template.title,
    content: template.template.replace('[CHILD_NAME]', profile.child_name),
    cover_image: `https://source.unsplash.com/random/800x600/?${template.category}`,
    categories: [template.category],
    reading_time: template.reading_time,
    is_new: Math.random() > 0.7, // Randomly mark some as new
  }));
}

/**
 * Get stories that the user has started but not completed
 */
export async function getInProgressStories(userId: string | undefined): Promise<Story[]> {
  if (!userId) {
    return [];
  }
  
  // In a real app, fetch from Supabase
  // For MVP, return mock data
  return getMockStories().slice(0, 3).map(story => ({
    ...story,
    progress: Math.random() * 0.8, // Random progress between 0-80%
  }));
}

/**
 * Get a specific story by ID
 */
export async function getStoryById(storyId: string): Promise<Story | null> {
  // In a real app, fetch from Supabase
  // For MVP, return mock data
  const mockStories = getMockStories();
  const story = mockStories.find(s => s.id === storyId);
  
  if (!story) {
    return null;
  }
  
  // Add more detailed content for the full story view
  return {
    ...story,
    content: generateMockStoryContent(story.title),
    progress: Math.random() > 0.7 ? Math.random() : 0,
  };
}

/**
 * Get all stories
 */
export async function getAllStories(): Promise<Story[]> {
  // In a real app, fetch from Supabase with pagination
  // For MVP, return mock data
  return getMockStories();
}

/**
 * Search stories by query
 */
export async function searchStories(query: string): Promise<Story[]> {
  const allStories = getMockStories();
  const lowercaseQuery = query.toLowerCase();
  
  return allStories.filter(story => 
    story.title.toLowerCase().includes(lowercaseQuery) ||
    (story.categories && story.categories.some(c => c.toLowerCase().includes(lowercaseQuery)))
  );
}

/**
 * Get stories for a specific user
 */
export async function getUserStories(userId: string): Promise<Story[]> {
  // In a real app, fetch from Supabase
  // For MVP, return mock data with some completed and some favorites
  return getMockStories().map(story => ({
    ...story,
    progress: Math.random(),
    completed: Math.random() > 0.6,
    is_favorite: Math.random() > 0.7,
  }));
}

/**
 * Update a user's story progress
 */
export async function updateStoryProgress(params: {
  user_id: string;
  story_id: string;
  progress: number;
  is_favorite: boolean;
  reading_time: number;
  completed: boolean;
}): Promise<void> {
  // In a real app, this would update Supabase
  console.log('Updating story progress:', params);
  
  // If story is completed, update user's total_stories_read
  if (params.completed) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_stories_read, total_reading_time')
      .eq('id', params.user_id)
      .single();
    
    if (profile) {
      await supabase
        .from('profiles')
        .update({
          total_stories_read: (profile.total_stories_read || 0) + 1,
          total_reading_time: (profile.total_reading_time || 0) + params.reading_time,
        })
        .eq('id', params.user_id);
    }
  }
}

/**
 * Helper functions to generate mock data
 */
function getMockStories(): Story[] {
  const categories = [
    'fairy_tale', 'adventure', 'animals', 'science', 
    'fantasy', 'bedtime', 'age_3_plus', 'age_5_plus', 'age_8_plus'
  ];
  
  return [
    {
      id: 'story1',
      title: 'The Magical Forest Adventure',
      cover_image: 'https://source.unsplash.com/random/800x600/?forest',
      categories: ['adventure', 'fantasy', 'age_5_plus'],
      reading_time: 5,
      is_new: true,
    },
    {
      id: 'story2',
      title: 'Dinosaur Discovery',
      cover_image: 'https://source.unsplash.com/random/800x600/?dinosaur',
      categories: ['science', 'adventure', 'age_5_plus'],
      reading_time: 7,
    },
    {
      id: 'story3',
      title: 'Sleepy Time with Moon and Stars',
      cover_image: 'https://source.unsplash.com/random/800x600/?night,stars',
      categories: ['bedtime', 'age_3_plus'],
      reading_time: 4,
    },
    {
      id: 'goldilocks',
      title: 'Goldilocks and the Three Bears',
      cover_image: 'https://source.unsplash.com/random/800x600/?bears',
      categories: ['fairy_tale', 'age_3_plus'],
      reading_time: 6,
    },
    {
      id: 'little_red',
      title: 'Little Red Riding Hood',
      cover_image: 'https://source.unsplash.com/random/800x600/?forest,path',
      categories: ['fairy_tale', 'age_3_plus'],
      reading_time: 5,
    },
    {
      id: 'space_adventure',
      title: 'Space Explorer',
      cover_image: 'https://source.unsplash.com/random/800x600/?space',
      categories: ['science', 'adventure', 'age_8_plus'],
      reading_time: 8,
      has_audio: true,
    },
    {
      id: 'ocean_adventure',
      title: 'Under the Sea',
      cover_image: 'https://source.unsplash.com/random/800x600/?ocean',
      categories: ['adventure', 'animals', 'age_5_plus'],
      reading_time: 6,
      has_audio: true,
    },
    {
      id: 'friendly_dragon',
      title: 'The Friendly Dragon',
      cover_image: 'https://source.unsplash.com/random/800x600/?dragon',
      categories: ['fantasy', 'age_5_plus'],
      reading_time: 7,
    },
  ];
}

function generateMockStoryContent(title: string): string {
  return `Once upon a time, in a land far away, there lived a curious child who loved adventures. 
  
This child's name was Emma, and she had the brightest smile and the kindest heart.

One sunny morning, Emma decided to explore the woods behind her house. She packed a small backpack with a sandwich, an apple, and her favorite book.

"Be back before sunset!" called her mother as Emma skipped happily down the garden path.

The woods were full of wonders. Birds sang in the trees, squirrels jumped from branch to branch, and butterflies danced in the air.

Emma followed a narrow path deeper into the forest. She had never been this far before, but she wasn't afraid. She was brave and full of curiosity.

Suddenly, she came across a small clearing. In the middle stood an ancient oak tree, larger than any she had seen before. Its branches reached up toward the sky like giant arms.

As Emma approached the tree, she noticed something strange. There was a tiny door at the base of the trunk! It was about the size of a book, painted blue with a golden doorknob.

"How curious!" Emma whispered to herself. She knelt down and knocked gently on the door.

To her surprise, the door swung open! Inside was a winding staircase, leading down under the tree.

Should Emma go down the stairs? What adventures might await her below? What magical creatures might she meet?

Emma took a deep breath, adjusted her backpack, and stepped through the door. This was just the beginning of her greatest adventure yet.

The End.`;
}