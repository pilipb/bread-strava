import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, BreadPost } from '../types';
import { searchPosts } from '../services/firebase';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme';

type PostSearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PostSearch'>;

interface Props {
  navigation: PostSearchScreenNavigationProp;
}

type SortOption = 'relevance' | 'likes' | 'recent' | 'difficulty' | 'time';

const PostSearchScreen: React.FC<Props> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BreadPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      setLoading(true);
      const results = await searchPosts(query.trim());
      setSearchResults(sortPosts(results, sortBy));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortPosts = (posts: BreadPost[], sortOption: SortOption): BreadPost[] => {
    const sortedPosts = [...posts];
    
    switch (sortOption) {
      case 'likes':
        return sortedPosts.sort((a, b) => b.likes - a.likes);
      case 'recent':
        return sortedPosts.sort((a, b) => b.createdAt - a.createdAt);
      case 'difficulty':
        const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3, 'expert': 4 };
        return sortedPosts.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
      case 'time':
        return sortedPosts.sort((a, b) => {
          const aTime = (a.preparationTime || 0) + (a.cookingTime || 0);
          const bTime = (b.preparationTime || 0) + (b.cookingTime || 0);
          return aTime - bTime;
        });
      case 'relevance':
      default:
        return sortedPosts; // Keep original order for relevance
    }
  };

  const handleSortChange = (newSortOption: SortOption) => {
    setSortBy(newSortOption);
    setSearchResults(sortPosts(searchResults, newSortOption));
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

  const getTotalTime = (post: BreadPost) => {
    const prep = post.preparationTime || 0;
    const cook = post.cookingTime || 0;
    const total = prep + cook;
    if (total === 0) return null;
    if (total < 60) return `${total}m`;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const renderPostItem = ({ item }: { item: BreadPost }) => {
    // Get the first image URL (supports both single and multiple images)
    const getFirstImageURL = (post: BreadPost) => {
      if (post.photoURLs && post.photoURLs.length > 0) {
        return post.photoURLs[0];
      }
      return post.photoURL;
    };

    const hasMultipleImages = item.photoURLs && item.photoURLs.length > 1;
    const totalTime = getTotalTime(item);

    return (
      <TouchableOpacity 
        style={styles.postCard}
        onPress={() => navigation.navigate('PostDetails', { postId: item.id })}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: getFirstImageURL(item) }} style={styles.postImage} />
          {hasMultipleImages && (
            <View style={styles.multipleImagesIndicator}>
              <Text style={styles.imageCountText}>📷 {item.photoURLs!.length}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.postContent}>
          <Text style={styles.postTitle}>{item.title}</Text>
          
          <View style={styles.postMeta}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Profile', { userId: item.userId })}
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
          
          <Text style={styles.postDescription} numberOfLines={2}>
            {item.description}
          </Text>

          {item.ingredients && item.ingredients.length > 0 && (
            <Text style={styles.ingredients} numberOfLines={1}>
              Ingredients: {item.ingredients.join(', ')}
            </Text>
          )}
          
          <View style={styles.postStats}>
            <View style={styles.stat}>
              <Text style={styles.statCount}>{item.likes}</Text>
              <Text style={styles.statLabel}>Rises</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statCount}>{item.comments}</Text>
              <Text style={styles.statLabel}>Comments</Text>
            </View>
            {totalTime && (
              <View style={styles.stat}>
                <Text style={styles.statCount}>{totalTime}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            )}
            <Text style={styles.timeAgo}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSortOptions = () => {
    const sortOptions = [
      { key: 'relevance', label: 'Relevance' },
      { key: 'likes', label: 'Most Liked' },
      { key: 'recent', label: 'Most Recent' },
      { key: 'difficulty', label: 'Difficulty' },
      { key: 'time', label: 'Cooking Time' },
    ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortContainer}
      >
        {sortOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.sortButton,
              sortBy === option.key && styles.sortButtonActive
            ]}
            onPress={() => handleSortChange(option.key as SortOption)}
          >
            <Text style={[
              styles.sortButtonText,
              sortBy === option.key && styles.sortButtonTextActive
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts by title, description, ingredients..."
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {searchQuery.length >= 2 && renderSortOptions()}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Searching posts...</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            searchQuery.length >= 2 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No posts found</Text>
                <Text style={styles.emptySubtext}>Try searching with different keywords</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Search for bakes</Text>
                <Text style={styles.emptySubtext}>Find recipes by title, description, or ingredients</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInput: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
    height: 50,
  },
  sortButton: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
  sortButtonTextActive: {
    color: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.darkGray,
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
  imageContainer: {
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  multipleImagesIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.primary,
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  imageCountText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
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
  ingredients: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.darkGray,
    fontStyle: 'italic',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: FONT_SIZE.md,
    color: COLORS.darkGray,
    textAlign: 'center',
  },
});

export default PostSearchScreen; 