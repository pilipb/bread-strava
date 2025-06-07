import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, ScrollView, Dimensions } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, BreadPost } from '../types';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchFollowingPosts, refreshFollowingPosts } from '../store/postsSlice';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme';

const { width: screenWidth } = Dimensions.get('window');

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

// Image Carousel Component - moved outside to prevent re-renders
const ImageCarousel = ({ images, onImagePress }: { images: string[]; onImagePress?: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const imageWidth = screenWidth - (SPACING.md * 2);
    const index = Math.round(scrollPosition / imageWidth);
    setCurrentIndex(index);
  };

  if (images.length === 0) {
    return (
      <TouchableOpacity style={styles.noImageContainer} onPress={onImagePress} activeOpacity={0.9}>
        <Text style={styles.noImageText}>No image available</Text>
      </TouchableOpacity>
    );
  }

  const imageWidth = screenWidth - (SPACING.md * 2);

  return (
    <View style={styles.imageCarouselContainer}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        bounces={false}
        style={{ flex: 1 }}
      >
        {images.map((imageUrl, index) => (
          <TouchableOpacity
            key={`${imageUrl}-${index}`}
            onPress={onImagePress}
            activeOpacity={0.9}
            style={{ width: imageWidth }}
          >
            <Image 
              source={{ uri: imageUrl }} 
              style={[styles.postImage, { width: imageWidth }]} 
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {images.length > 1 && (
        <View style={styles.paginationContainer}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                currentIndex === index && styles.paginationDotActive
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { posts, loading, refreshing, error } = useAppSelector((state) => state.posts);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (user) {
      // Include user's own ID plus those they follow for the feed
      const feedUserIds = user.following && user.following.length > 0 
        ? [...user.following, user.id] 
        : [user.id];
      dispatch(fetchFollowingPosts(feedUserIds));
    }
  }, [dispatch, user]);

  useEffect(() => {
    // Set navigation options with profile picture in header
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          style={styles.headerSearchButton}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.7}
        >
          <Text style={styles.headerSearchIcon}>🔍</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity 
          style={styles.headerProfileButton}
          onPress={handleMyProfile}
          activeOpacity={0.7}
        >
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.headerProfileAvatar} />
          ) : (
            <View style={[styles.headerProfileAvatar, styles.noHeaderProfileAvatar]}>
              <Text style={styles.headerProfileAvatarText}>
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, user]);

  const handlePostPress = (postId: string) => {
    navigation.navigate('PostDetails', { postId });
  };

  const handleProfilePress = (userId: string) => {
    navigation.navigate('Profile', { userId });
  };

  const handleCreatePost = () => {
    navigation.navigate('CreatePost');
  };

  const handleMyProfile = () => {
    if (user) {
      navigation.navigate('Profile', { userId: user.id });
    }
  };

  const renderPostItem = ({ item }: { item: BreadPost }) => {
    // Get all image URLs (supports both single and multiple images)
    const getAllImageURLs = (post: BreadPost): string[] => {
      if (post.photoURLs && post.photoURLs.length > 0) {
        return post.photoURLs;
      }
      return post.photoURL ? [post.photoURL] : [];
    };

    const imageUrls = getAllImageURLs(item);

    return (
      <View style={styles.postCard}>
        <ImageCarousel images={imageUrls} onImagePress={() => handlePostPress(item.id)} />
        
        <View style={styles.postContent}>
          <TouchableOpacity onPress={() => handlePostPress(item.id)}>
            <Text style={styles.postTitle}>{item.title}</Text>
          </TouchableOpacity>
          
          <View style={styles.postMeta}>
            <TouchableOpacity 
              onPress={() => handleProfilePress(item.userId)}
              style={styles.userInfo}
            >
              {item.userPhotoURL ? (
                <Image source={{ uri: item.userPhotoURL }} style={styles.userAvatar} />
              ) : (
                <View style={[styles.userAvatar, styles.noAvatar]}>
                  <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.username}>{item.username}</Text>
            </TouchableOpacity>
            
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>{item.difficulty}</Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => handlePostPress(item.id)}>
            <Text style={styles.postDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.postStats}>
            <View style={styles.stat}>
              <Text style={styles.statCount}>{item.likes}</Text>
              <Text style={styles.statLabel}>Rises</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statCount}>{item.comments}</Text>
              <Text style={styles.statLabel}>Comments</Text>
            </View>
            <Text style={styles.timeAgo}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading && posts.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Loading bread posts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {user?.following?.length === 0 
                ? 'No posts in your feed!' 
                : 'No bread posts yet!'
              }
            </Text>
            <Text style={styles.emptySubtext}>
              {user?.following?.length === 0 
                ? 'Follow other bakers to see their posts in your feed.'
                : 'The bakers you follow haven\'t posted yet.'
              }
            </Text>
            {user?.following?.length === 0 && (
              <TouchableOpacity 
                style={styles.discoverButton}
                onPress={() => navigation.navigate('Search')}
                activeOpacity={0.7}
              >
                <Text style={styles.discoverButtonText}>Discover Bakers</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        refreshing={refreshing}
        onRefresh={() => {
          if (user) {
            // Include user's own ID plus those they follow for the feed
            const feedUserIds = user.following && user.following.length > 0 
              ? [...user.following, user.id] 
              : [user.id];
            dispatch(refreshFollowingPosts(feedUserIds));
          }
        }}
      />
      
      <TouchableOpacity 
        style={styles.fab}
        onPress={handleCreatePost}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: SPACING.md,
  },
  postCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageCarouselContainer: {
    height: 200,
    position: 'relative',
    width: '100%',
  },
  postImage: {
    height: 200,
    resizeMode: 'cover',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',     
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  paginationDotActive: {
    backgroundColor: COLORS.background,
  },
  noImageContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.border,
  },
  noImageText: {
    color: COLORS.darkGray,
    fontSize: FONT_SIZE.md,
  },
  postContent: {
    padding: SPACING.md,
  },
  postTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.round,
    marginRight: SPACING.xs,
  },
  noAvatar: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  username: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.darkGray,
  },
  difficultyBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.round,
  },
  difficultyText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  postDescription: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: SPACING.xs / 2,
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.darkGray,
  },
  timeAgo: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.darkGray,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.darkGray,
  },
  errorContainer: {
    backgroundColor: COLORS.error,
    padding: SPACING.md,
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  errorText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  emptySubtext: {
    fontSize: FONT_SIZE.md,
    color: COLORS.darkGray,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  discoverButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.md,
  },
  discoverButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabIcon: {
    fontSize: 30,
    color: COLORS.background,
    lineHeight: 50,
  },
  headerProfileButton: {
    padding: SPACING.xs,
  },
  headerProfileAvatar: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
  },
  noHeaderProfileAvatar: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerProfileAvatarText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },
  headerSearchButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  headerSearchIcon: {
    fontSize: FONT_SIZE.lg,
  },
});

export default HomeScreen; 