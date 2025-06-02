import { StoryTemplate } from '@/types';

export const storyTemplates: StoryTemplate[] = [
  {
    id: 'goldilocks',
    title: 'Goldilocks and the Three Bears',
    template: 'Once upon a time, there was a curious child named [CHILD_NAME]...',
    category: 'fairy_tale',
    moral: 'Respect others property',
    age_range: [3, 7],
    reading_time: 5
  },
  {
    id: 'little_red',
    title: 'Little Red Riding Hood',
    template: 'There once was a sweet little girl named [CHILD_NAME] who lived near the forest...',
    category: 'fairy_tale',
    moral: 'Be cautious of strangers',
    age_range: [4, 8],
    reading_time: 7
  },
  {
    id: 'three_pigs',
    title: 'The Three Little Pigs',
    template: 'Once upon a time, there were three little pigs who lived with [CHILD_NAME]...',
    category: 'fairy_tale',
    moral: 'Hard work pays off',
    age_range: [3, 7],
    reading_time: 6
  },
  {
    id: 'space_adventure',
    title: 'Space Explorer',
    template: 'Far beyond the stars, brave astronaut [CHILD_NAME] embarked on an amazing journey...',
    category: 'science',
    moral: 'Curiosity leads to discovery',
    age_range: [5, 10],
    reading_time: 8
  },
  {
    id: 'dinosaur_dig',
    title: 'Dinosaur Discovery',
    template: 'Paleontologist [CHILD_NAME] was digging in the backyard when something incredible happened...',
    category: 'science',
    moral: 'Patience reveals treasures',
    age_range: [6, 10],
    reading_time: 7
  },
  {
    id: 'magical_forest',
    title: 'The Magical Forest',
    template: 'Deep in the heart of the enchanted forest, [CHILD_NAME] discovered a hidden path...',
    category: 'fantasy',
    moral: 'Every journey begins with a single step',
    age_range: [5, 9],
    reading_time: 8
  },
  {
    id: 'friendly_dragon',
    title: 'The Friendly Dragon',
    template: 'High on the mountain lived a dragon who was waiting for a friend like [CHILD_NAME]...',
    category: 'fantasy',
    moral: 'Don\'t judge by appearances',
    age_range: [4, 8],
    reading_time: 6
  },
  {
    id: 'ocean_adventure',
    title: 'Under the Sea',
    template: '[CHILD_NAME] dove into the ocean and discovered an amazing underwater world...',
    category: 'adventure',
    moral: 'Explore and respect nature',
    age_range: [5, 9],
    reading_time: 7
  },
  {
    id: 'bedtime_stars',
    title: 'The Night Sky',
    template: 'As [CHILD_NAME] looked up at the night sky, the stars began to twinkle in a special pattern...',
    category: 'bedtime',
    moral: 'Dreams can take you anywhere',
    age_range: [3, 7],
    reading_time: 5
  },
  {
    id: 'brave_knight',
    title: 'The Brave Knight',
    template: 'In a kingdom long ago, the brave knight [CHILD_NAME] protected the castle from dragons...',
    category: 'adventure',
    moral: 'Courage overcomes fear',
    age_range: [5, 10],
    reading_time: 8
  },
];