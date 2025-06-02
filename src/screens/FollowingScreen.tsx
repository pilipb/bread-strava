import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, User } from '../types';
import { useAppSelector } from '../store';
import { getUsersByIds, getUserProfile } from '../services/firebase';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme';

type FollowingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Following'>;
type FollowingScreenRouteProp = RouteProp<RootStackParamList, 'Following'>;

interface Props {
  navigation: FollowingScreenNavigationProp;
  route: FollowingScreenRouteProp;
}

const FollowingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userId, type } = route.params;
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get the profile user to access their following/followers arrays
        const userProfile = await getUserProfile(userId);
        setProfileUser(userProfile);
        
        if (userProfile) {
          const userIds = type === 'following' ? userProfile.following || [] : userProfile.followers || [];
          if (userIds.length > 0) {
            const usersData = await getUsersByIds(userIds);
            setUsers(usersData);
          }
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, type]);

  useEffect(() => {
    // Set navigation title
    const isOwnProfile = currentUser?.id === userId;
    const title = type === 'following' 
      ? (isOwnProfile ? 'Following' : `${profileUser?.username}'s Following`)
      : (isOwnProfile ? 'Followers' : `${profileUser?.username}'s Followers`);
    
    navigation.setOptions({
      title: title
    });
  }, [navigation, currentUser, userId, type, profileUser]);

  const renderUserItem = ({ item }: { item: User }) => (
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
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const isOwnProfile = currentUser?.id === userId;
  const title = type === 'following' 
    ? (isOwnProfile ? 'Following' : `${profileUser?.username}'s Following`)
    : (isOwnProfile ? 'Followers' : `${profileUser?.username}'s Followers`);

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {type === 'following' ? 'No following yet' : 'No followers yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {type === 'following' 
                ? 'Start following other bakers to see their posts'
                : 'Share great bread content to gain followers'
              }
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingHorizontal: SPACING.md,
  },
});

export default FollowingScreen; 