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
import PostCard from '../components/PostCard';
import { useAppSelector } from '../store';

type PostSearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PostSearch'>;

interface Props {
  navigation: PostSearchScreenNavigationProp;
}

type SortOption = 'relevance' | 'likes' | 'recent' | 'difficulty' | 'time';

const PostSearchScreen: React.FC<Props> = ({ navigation }) => {
  const { user: currentUser } = useAppSelector((state) => state.auth);
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

  const handleSortChange = (newSortBy: SortOption) => {
    setSortBy(newSortBy);
    if (searchResults.length > 0) {
      const sorted = sortPosts(searchResults, newSortBy);
      setSearchResults(sorted);
    }
  };

  const renderPostItem = ({ item }: { item: BreadPost }) => {
    const isOwnPost = currentUser?.id === item.userId;
    
    return (
      <PostCard
        post={item}
        onPress={(postId) => navigation.navigate('PostDetails', { postId })}
        showSaveButton={!isOwnPost}
      />
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
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.postsRow}
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
  postsRow: {
    justifyContent: 'space-between',
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