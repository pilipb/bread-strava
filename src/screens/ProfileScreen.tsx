import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, BreadPost, User } from '../types';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchUserPosts } from '../store/postsSlice';
import { logout } from '../store/authSlice';
import { getUserProfile } from '../services/firebase';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;
type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
  route: ProfileScreenRouteProp;
}

const ProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  const { userPosts, loading: postsLoading } = useAppSelector((state) => state.posts);
  const { user: currentUser } = useAppSelector((state) => state.auth);
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Determine if we're viewing our own profile or someone else's
  const userId = route.params?.userId || currentUser?.id;
  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // If it's the current user's profile, use the current user data
        if (isOwnProfile && currentUser) {
          setProfileUser(currentUser);
        } else {
          // Otherwise fetch the user profile
          const user = await getUserProfile(userId);
          setProfileUser(user);
        }
        
        // Fetch user posts
        dispatch(fetchUserPosts(userId));
      } catch (err) {
        setError('Failed to load profile data. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [dispatch, userId, currentUser, isOwnProfile]);

  const handlePostPress = (postId: string) => {
    navigation.navigate('PostDetails', { postId });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            try {
              await dispatch(logout()).unwrap();
            } catch (error) {
              // Error handled in the slice
            }
          },
          style: 'destructive'
        },
      ]
    );
  };

  const renderPostItem = ({ item }: { item: BreadPost }) => (
    <TouchableOpacity 
      style={styles.postCard}
      onPress={() => handlePostPress(item.id)}
      activeOpacity={0.9}
    >
      <Image source={{ uri: item.photoURL }} style={styles.postImage} />
      
      <View style={styles.postContent}>
        <Text style={styles.postTitle}>{item.title}</Text>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>{item.difficulty}</Text>
        </View>
        
        <View style={styles.postStats}>
          <View style={styles.stat}>
            <Text style={styles.statCount}>{item.likes}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statCount}>{item.comments}</Text>
            <Text style={styles.statLabel}>Comments</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading || !profileUser) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Loading profile...</Text>
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
      
      <View style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          {profileUser.photoURL ? (
            <Image source={{ uri: profileUser.photoURL }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.noProfileImage]}>
              <Text style={styles.profileInitial}>{profileUser.username.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          
          <View style={styles.profileDetails}>
            <Text style={styles.username}>{profileUser.username}</Text>
            <Text style={styles.email}>{profileUser.email}</Text>
            {profileUser.bio && <Text style={styles.bio}>{profileUser.bio}</Text>}
          </View>
        </View>
        
        {isOwnProfile && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.postsContainer}>
        <Text style={styles.sectionTitle}>
          {isOwnProfile ? 'My Bread Creations' : `${profileUser.username}'s Bread Creations`}
        </Text>
        
        {postsLoading && userPosts.length === 0 ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.postsLoader} />
        ) : (
          <FlatList
            data={userPosts}
            renderItem={renderPostItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.postsList}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.postsRow}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No bread posts yet!</Text>
                {isOwnProfile && (
                  <TouchableOpacity 
                    style={styles.createButton}
                    onPress={() => navigation.navigate('CreatePost')}
                  >
                    <Text style={styles.createButtonText}>Create Your First Post</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            refreshing={postsLoading}
            onRefresh={() => dispatch(fetchUserPosts(userId || ''))}
          />
        )}
      </View>
      
      {isOwnProfile && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('CreatePost')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
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
  profileHeader: {
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.round,
    marginRight: SPACING.md,
  },
  noProfileImage: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: COLORS.background,
    fontSize: FONT_SIZE.xxxl,
    fontWeight: 'bold',
  },
  profileDetails: {
    flex: 1,
  },
  username: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  email: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.darkGray,
    marginBottom: SPACING.xs,
  },
  bio: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  logoutButton: {
    alignSelf: 'flex-end',
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.md,
  },
  logoutText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  postsContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  postsLoader: {
    marginTop: SPACING.xl,
  },
  postsList: {
    paddingBottom: SPACING.xl,
  },
  postsRow: {
    justifyContent: 'space-between',
  },
  postCard: {
    width: '48%',
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
  postImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  postContent: {
    padding: SPACING.sm,
  },
  postTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.round,
    marginBottom: SPACING.sm,
  },
  difficultyText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  postStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.xs,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  statCount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: SPACING.xs / 2,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.darkGray,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.darkGray,
    marginBottom: SPACING.md,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  createButtonText: {
    color: COLORS.background,
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
});

export default ProfileScreen; 