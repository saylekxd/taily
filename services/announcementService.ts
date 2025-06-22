import { supabase } from '@/lib/supabase';

export interface Announcement {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  action_type: 'in_app' | 'browser';
  action_url?: string;
  target_screen?: string;
  background_color?: string;
  text_color?: string;
  priority: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  user_segment?: string[];
  age_range?: number[];
  language: string;
  created_at: string;
  updated_at: string;
}

class AnnouncementService {
  async getActiveAnnouncements(
    userAge?: number, 
    userLanguage: string = 'en', 
    userSegment?: string
  ): Promise<Announcement[]> {
    try {
      const now = new Date().toISOString();
      
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .eq('language', userLanguage)
        .lte('start_date', now)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      const { data: announcements, error } = await query;

      if (error) {
        console.error('Error fetching announcements:', error);
        return [];
      }

      if (!announcements) return [];

      // Filter by user criteria
      return announcements.filter(announcement => {
        // Check age range
        if (userAge && announcement.age_range && announcement.age_range.length >= 2) {
          const [minAge, maxAge] = announcement.age_range;
          if (userAge < minAge || userAge > maxAge) {
            return false;
          }
        }

        // Check user segment
        if (announcement.user_segment && announcement.user_segment.length > 0) {
          if (!userSegment || !announcement.user_segment.includes(userSegment)) {
            return false;
          }
        }

        return true;
      });
    } catch (error) {
      console.error('Error in getActiveAnnouncements:', error);
      return [];
    }
  }

  async getAnnouncementById(id: string): Promise<Announcement | null> {
    try {
      const { data: announcement, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching announcement by ID:', error);
        return null;
      }

      return announcement;
    } catch (error) {
      console.error('Error in getAnnouncementById:', error);
      return null;
    }
  }

  shouldOpenInApp(announcement: Announcement): boolean {
    return announcement.action_type === 'in_app';
  }

  shouldOpenInBrowser(announcement: Announcement): boolean {
    return announcement.action_type === 'browser';
  }

  getActionUrl(announcement: Announcement): string | undefined {
    return announcement.action_url;
  }

  getTargetScreen(announcement: Announcement): string | undefined {
    return announcement.target_screen;
  }
}

export const announcementService = new AnnouncementService(); 