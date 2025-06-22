import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  ViewToken,
} from 'react-native';
import { colors } from '@/constants/colors';
import { Announcement } from '@/services/announcementService';
import AnnouncementCard from './AnnouncementCard';

const { width: screenWidth } = Dimensions.get('window');

interface AnnouncementContainerProps {
  announcements: Announcement[];
  onAnnouncementPress: (announcement: Announcement) => void;
  title?: string;
}

interface ViewableItemInfo {
  viewableItems: ViewToken[];
  changed: ViewToken[];
}

export default function AnnouncementContainer({ 
  announcements, 
  onAnnouncementPress,
  title = "Announcements"
}: AnnouncementContainerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  if (!announcements || announcements.length === 0) {
    return null;
  }

  const onViewableItemsChanged = ({ viewableItems }: ViewableItemInfo) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  };

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const renderAnnouncementCard = ({ item }: { item: Announcement }) => (
    <View style={styles.cardWrapper}>
      <AnnouncementCard 
        announcement={item} 
        onPress={() => onAnnouncementPress(item)}
      />
    </View>
  );

  const renderPaginationDot = (index: number) => (
    <View
      key={index}
      style={[
        styles.paginationDot,
        index === currentIndex ? styles.activeDot : styles.inactiveDot,
      ]}
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{title}</Text>
      
      <FlatList
        ref={flatListRef}
        data={announcements}
        renderItem={renderAnnouncementCard}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={screenWidth - 16}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={styles.flatListContent}
      />
      
      {announcements.length > 1 && (
        <View style={styles.paginationContainer}>
          {announcements.map((_, index) => renderPaginationDot(index))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 20,
    color: colors.white,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  cardWrapper: {
    width: screenWidth - 32,
    marginLeft: 4,
    marginHorizontal: 10,
  },
  flatListContent: {
    paddingVertical: 4,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    backgroundColor: '#ff6b6b',
  },
  inactiveDot: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
}); 