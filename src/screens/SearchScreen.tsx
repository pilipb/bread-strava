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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, User } from '../types';
import { useAppSelector, useAppDispatch } from '../store';
import { updateUserProfile } from '../store/authSlice';
import { searchUsers, followUser, unfollowUser } from '../services/firebase';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme';

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Search'>;

interface Props {
  navigation: SearchScreenNavigationProp;
}

const SearchScreen: React.FC<Props> = ({ navigation }) => {
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const dispatch = useAppDispatch();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      setLoading(true);
      const results = await searchUsers(query.trim());
      // Filter out current user from results
      const filteredResults = results.filter(user => user.id !== currentUser?.id);
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (targetUser: User) => {
    if (!currentUser) return;
    
    const isCurrentlyFollowing = currentUser.following?.includes(targetUser.id) || false;
    
    try {
      setFollowingUsers(prev => new Set(prev).add(targetUser.id));
      
      if (isCurrentlyFollowing) {
        await unfollowUser(currentUser.id, targetUser.id);
        // Update Redux store - remove from following list
        dispatch(updateUserProfile({
          following: currentUser.following?.filter(id => id !== targetUser.id) || []
        }));
      } else {
        await followUser(currentUser.id, targetUser.id);
        // Update Redux store - add to following list
        dispatch(updateUserProfile({
          following: [...(currentUser.following || []), targetUser.id]
        }));
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
    } finally {
      setFollowingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUser.id);
        return newSet;
      });
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isFollowing = currentUser?.following?.includes(item.id) || false;
    const isProcessing = followingUsers.has(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.userCard}
        onPress={() => navigation.navigate('Profile', { userId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, styles.noAvatar]}>
              <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          
          <View style={styles.userDetails}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.followCount}>
              {item.followers?.length || 0} followers • {item.following?.length || 0} following
            </Text>
            {item.bio && <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>}
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.unfollowButton]}
          onPress={() => handleFollowToggle(item)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={isFollowing ? COLORS.text : COLORS.background} />
          ) : (
            <Text style={[styles.followButtonText, isFollowing && styles.unfollowButtonText]}>
              {isFollowing ? 'Unfollow' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for bakers..."
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            searchQuery.length >= 2 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No users found</Text>
                <Text style={styles.emptySubtext}>Try searching with a different username</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Search for bakers</Text>
                <Text style={styles.emptySubtext}>Find and follow other bread enthusiasts</Text>
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
  userCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.round,
    marginRight: SPACING.md,
  },
  noAvatar: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  followCount: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.darkGray,
    marginBottom: SPACING.xs / 2,
  },
  bio: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  followButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 80,
    alignItems: 'center',
  },
  unfollowButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  followButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: FONT_SIZE.sm,
  },
  unfollowButtonText: {
    color: COLORS.text,
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

export default SearchScreen; 