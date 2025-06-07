import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  FlatList,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, BreadPost } from '../types';
import { getConnectedPosts } from '../services/firebase';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme';

type RecipeMapScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RecipeMap'>;
type RecipeMapScreenRouteProp = RouteProp<RootStackParamList, 'RecipeMap'>;

interface Props {
  navigation: RecipeMapScreenNavigationProp;
  route: RecipeMapScreenRouteProp;
}

const RecipeMapScreen: React.FC<Props> = ({ navigation, route }) => {
  const { originalRecipeId } = route.params;
  const [posts, setPosts] = useState<BreadPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnectedPosts();
  }, [originalRecipeId]);

  const loadConnectedPosts = async () => {
    try {
      setLoading(true);
      const connectedPosts = await getConnectedPosts(originalRecipeId);
      
      // Filter posts that have location data
      const postsWithLocation = connectedPosts.filter(post => post.location);
      setPosts(postsWithLocation);
    } catch (error) {
      console.error('Error loading connected posts:', error);
      Alert.alert('Error', 'Failed to load recipe locations.');
    } finally {
      setLoading(false);
    }
  };

  const handlePostPress = (postId: string) => {
    navigation.navigate('PostDetails', { postId });
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      return `${days}d ago`;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) {
      return `${hours}h ago`;
    }
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes > 0 ? `${minutes}m ago` : 'Just now';
  };

  const renderLocationItem = ({ item }: { item: BreadPost }) => (
    <TouchableOpacity 
      style={styles.locationCard}
      onPress={() => handlePostPress(item.id)}
    >
      <Image 
        source={{ uri: item.photoURL }} 
        style={styles.postImage}
      />
      <View style={styles.postInfo}>
        <View style={styles.postHeader}>
          <Text style={styles.postTitle}>{item.title}</Text>
          {item.isOriginalRecipe && (
            <View style={styles.originalBadge}>
              <Text style={styles.originalBadgeText}>Original</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.postUsername}>by {item.username}</Text>
        <Text style={styles.postTime}>{formatTimeAgo(item.createdAt)}</Text>
        
        {item.location && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>
              {item.location.city && item.location.country
                ? `${item.location.city}, ${item.location.country}`
                : 'Location available'
              }
            </Text>
          </View>
        )}
        
        <View style={styles.postStats}>
          <Text style={styles.statText}>❤️ {item.likes}</Text>
          <Text style={styles.statText}>💬 {item.comments}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Loading recipe locations...</Text>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Locations Found</Text>
        <Text style={styles.emptyText}>
          No connected posts with location data found for this recipe.
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recipe Locations</Text>
        <Text style={styles.postCount}>{posts.length} locations</Text>
      </View>

      <View style={styles.mapNotice}>
        <Text style={styles.mapNoticeText}>
          🗺️ Interactive map coming soon! For now, here are all the locations where this recipe has been made:
        </Text>
      </View>

      <FlatList
        data={posts}
        renderItem={renderLocationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  backButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backArrow: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.primary,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  postCount: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.darkGray,
  },
  mapNotice: {
    backgroundColor: COLORS.lightGray,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  mapNoticeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.darkGray,
    textAlign: 'center',
  },
  listContainer: {
    padding: SPACING.md,
  },
  locationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  postImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.md,
  },
  postInfo: {
    flex: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  postTitle: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  originalBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  originalBadgeText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  postUsername: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.darkGray,
    marginBottom: SPACING.xs,
  },
  postTime: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.mediumGray,
    marginBottom: SPACING.sm,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  locationIcon: {
    fontSize: FONT_SIZE.sm,
    marginRight: SPACING.xs,
  },
  locationText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  postStats: {
    flexDirection: 'row',
  },
  statText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.darkGray,
    marginRight: SPACING.md,
  },
});

export default RecipeMapScreen; 