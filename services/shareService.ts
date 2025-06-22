import { Share, Platform, Alert } from 'react-native';

export interface ShareStoryOptions {
  isPersonalized: boolean;
  storyContent?: string;
  storyTitle?: string;
  storyId?: string;
  personalizedStoryId?: string;
}

export class ShareService {
  private static instance: ShareService;

  static getInstance(): ShareService {
    if (!ShareService.instance) {
      ShareService.instance = new ShareService();
    }
    return ShareService.instance;
  }

  async shareStory(options: ShareStoryOptions): Promise<boolean> {
    try {
      const { shareTitle, shareContent } = this.generateShareContent(options);
      
      const result = await Share.share(
        {
          title: shareTitle,
          message: shareContent,
          url: Platform.OS === 'ios' ? 'https://taily.app' : undefined,
        },
        {
          dialogTitle: shareTitle,
          subject: shareTitle, // For email sharing
        }
      );

      // Track successful shares (optional analytics)
      if (result.action === Share.sharedAction) {
        console.log('Story shared successfully', {
          storyId: options.storyId,
          personalizedStoryId: options.personalizedStoryId,
          isPersonalized: options.isPersonalized,
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error sharing story:', error);
      Alert.alert(
        'Sharing Error',
        'Unable to share right now. Please try again later.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  private generateShareContent(options: ShareStoryOptions): { shareTitle: string; shareContent: string } {
    let shareContent = '';
    let shareTitle = '';
    
    if (options.isPersonalized) {
      shareTitle = '🌟 Check out my personalized story!';
      shareContent = this.generatePersonalizedShareContent(options);
    } else {
      shareTitle = '📖 Amazing story from Taily!';
      shareContent = this.generateRegularShareContent(options);
    }

    // Add app store links
    const appLinks = this.getAppStoreLinks();
    shareContent += appLinks;

    return { shareTitle, shareContent };
  }

  private generatePersonalizedShareContent(options: ShareStoryOptions): string {
    const storyPreview = options.storyContent 
      ? options.storyContent.substring(0, 200) + '...'
      : 'This story was created just for me with my favorite characters and themes!';

    return `I just created an amazing personalized story with Taily! 📚✨

${storyPreview}

🎯 Want your own personalized stories?
📱 Download Taily and create magical stories tailored just for you!

✨ Features you'll love:
• AI-powered personalization
• Your child as the main character
• Custom themes and adventures
• Professional audio narration

#PersonalizedStories #Taily #Storytelling #Kids #AI`;
  }

  private generateRegularShareContent(options: ShareStoryOptions): string {
    const storyPreview = options.storyContent 
      ? options.storyContent.substring(0, 200) + '...'
      : 'Join me in exploring amazing stories!';

    const storyTitleText = options.storyTitle 
      ? `"${options.storyTitle}" - ` 
      : '';

    return `I discovered this incredible story on Taily! 🌟

${storyTitleText}${storyPreview}

📚 Why you'll love Taily:
• Thousands of curated stories for kids
• Beautiful illustrations & animations
• Professional audio narration
• Personalized stories with AI
• Safe, ad-free environment
• Educational content that's fun

Download Taily and start your reading adventure today!

#Taily #Stories #Kids #Reading #Education #ParentLife`;
  }

  private getAppStoreLinks(): string {
    return Platform.select({
      ios: '\n\n📱 Download on App Store: https://apps.apple.com/app/taily',
      android: '\n\n📱 Get it on Google Play: https://play.google.com/store/apps/details?id=com.taily',
      default: '\n\n📱 Available on iOS and Android App Stores!'
    }) || '';
  }

  // Quick share with minimal content for social media
  async quickShare(options: Omit<ShareStoryOptions, 'storyContent'>): Promise<boolean> {
    const quickContent = options.isPersonalized
      ? `🌟 Just created a personalized story with Taily! AI-powered stories where your child is the hero. Download Taily now! #PersonalizedStories #Taily`
      : `📖 Reading amazing stories on Taily! Thousands of stories, beautiful illustrations, audio narration & AI personalization. Download now! #Taily #Stories`;

    try {
      const result = await Share.share({
        message: quickContent + this.getAppStoreLinks(),
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Error in quick share:', error);
      return false;
    }
  }
}

export const shareService = ShareService.getInstance(); 