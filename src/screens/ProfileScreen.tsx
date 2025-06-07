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
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import { RootStackParamList, BreadPost, User } from '../types';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchUserPosts } from '../store/postsSlice';
import { logout, updateUserProfile as updateAuthUserProfile } from '../store/authSlice';
import { getUserProfile, followUser, unfollowUser, updateUserProfile } from '../services/firebase';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme';
import ActivityGraph from '../components/ActivityGraph';

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
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [profilePictureLoading, setProfilePictureLoading] = useState(false);
  const [bioEditModalVisible, setBioEditModalVisible] = useState(false);
  const [editingBio, setEditingBio] = useState('');
  const [bioUpdateLoading, setBioUpdateLoading] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  
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
          
          // Check if current user is following this profile user
          if (currentUser && user) {
            const isCurrentlyFollowing = user.followers?.includes(currentUser.id) || false;
            setIsFollowing(isCurrentlyFollowing);
            console.log('🔍 Is following', user.username, ':', isCurrentlyFollowing);
          }
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

  useEffect(() => {
    // Set navigation options with settings icon for own profile
    if (isOwnProfile) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity 
            style={styles.headerSettingsButton}
            onPress={() => setSettingsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.headerSettingsIcon}>⚙️</Text>
          </TouchableOpacity>
        ),
      });
    } else {
      // Remove settings icon for other profiles
      navigation.setOptions({
        headerRight: undefined,
      });
    }
  }, [navigation, isOwnProfile]);

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
              setSettingsModalVisible(false);
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

  const handleFollow = async () => {
    if (!currentUser || !profileUser || followLoading) return;
    
    try {
      setFollowLoading(true);
      await followUser(currentUser.id, profileUser.id);
      setIsFollowing(true);
      
      // Update Redux store - add to current user's following list
      dispatch(updateAuthUserProfile({
        following: [...(currentUser.following || []), profileUser.id]
      }));
      
      // Update the profile user's followers count locally
      setProfileUser(prev => prev ? {
        ...prev,
        followers: [...(prev.followers || []), currentUser.id]
      } : null);
    } catch (error) {
      console.error('Follow error:', error);
      Alert.alert('Error', 'Failed to follow user. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUser || !profileUser || followLoading) return;
    
    try {
      setFollowLoading(true);
      await unfollowUser(currentUser.id, profileUser.id);
      setIsFollowing(false);
      
      // Update Redux store - remove from current user's following list
      dispatch(updateAuthUserProfile({
        following: currentUser.following?.filter(id => id !== profileUser.id) || []
      }));
      
      // Update the profile user's followers count locally
      setProfileUser(prev => prev ? {
        ...prev,
        followers: (prev.followers || []).filter(id => id !== currentUser.id)
      } : null);
    } catch (error) {
      console.error('Unfollow error:', error);
      Alert.alert('Error', 'Failed to unfollow user. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUpdateProfilePicture = async () => {
    if (!currentUser || profilePictureLoading) return;

    try {
      // Request camera roll permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Show action sheet for camera or gallery
      Alert.alert(
        'Update Profile Picture',
        'Choose how you want to update your profile picture',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Take Photo', 
            onPress: () => takePhoto() 
          },
          { 
            text: 'Choose from Gallery', 
            onPress: () => pickImage() 
          }
        ]
      );
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera is required!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadProfilePicture = async (imageUri: string) => {
    if (!currentUser) return;

    try {
      setProfilePictureLoading(true);

      // Create a unique filename for the profile picture
      const filename = `profile_${currentUser.id}_${Date.now()}`;
      
      // Import Firebase storage functions
      const storage = firebase.storage();
      const storageRef = storage.ref(`profile_pictures/${filename}`);

      // Convert image to base64 and upload using the same pattern as createPost
      const base64Response = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch(`data:image/jpeg;base64,${base64Response}`);
      const blob = await response.blob();
      
      await storageRef.put(blob);
      const downloadURL = await storageRef.getDownloadURL();

      // Update user profile with new photo URL
      await updateUserProfile(currentUser.id, { photoURL: downloadURL });

      // Update local state
      setProfileUser(prev => prev ? { ...prev, photoURL: downloadURL } : null);

      // Also update the current user in Redux store if it's their own profile
      if (isOwnProfile) {
        dispatch(updateAuthUserProfile({ photoURL: downloadURL }));
      }

      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    } finally {
      setProfilePictureLoading(false);
    }
  };

  const handleEditBio = () => {
    setEditingBio(profileUser?.bio || '');
    setBioEditModalVisible(true);
  };

  const handleSaveBio = async () => {
    if (!currentUser || bioUpdateLoading) return;

    try {
      setBioUpdateLoading(true);

      // Update user profile with new bio
      await updateUserProfile(currentUser.id, { bio: editingBio });

      // Update local state
      setProfileUser(prev => prev ? { ...prev, bio: editingBio } : null);

      // Also update the current user in Redux store
      dispatch(updateAuthUserProfile({ bio: editingBio }));

      setBioEditModalVisible(false);
      Alert.alert('Success', 'Bio updated successfully!');
    } catch (error) {
      console.error('Error updating bio:', error);
      Alert.alert('Error', 'Failed to update bio. Please try again.');
    } finally {
      setBioUpdateLoading(false);
    }
  };

  const handleCancelBioEdit = () => {
    setEditingBio('');
    setBioEditModalVisible(false);
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

    return (
      <TouchableOpacity 
        style={styles.postCard}
        onPress={() => handlePostPress(item.id)}
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
          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>{item.difficulty}</Text>
          </View>
          
          <View style={styles.postStats}>
            <View style={styles.stat}>
              <Text style={styles.statCount}>{item.likes}</Text>
              <Text style={styles.statLabel}>Rises</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statCount}>{item.comments}</Text>
              <Text style={styles.statLabel}>Comments</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.profileInfo}>
            <TouchableOpacity 
              style={styles.profileImageContainer}
              onPress={isOwnProfile ? handleUpdateProfilePicture : undefined}
              disabled={profilePictureLoading}
              activeOpacity={isOwnProfile ? 0.7 : 1}
            >
              {profileUser.photoURL ? (
                <Image source={{ uri: profileUser.photoURL }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, styles.noProfileImage]}>
                  <Text style={styles.profileInitial}>{profileUser.username.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              
              {profilePictureLoading && (
                <View style={styles.profileImageOverlay}>
                  <ActivityIndicator size="large" color={COLORS.background} />
                </View>
              )}
              
              {isOwnProfile && !profilePictureLoading && (
                <View style={styles.editIcon}>
                  <Text style={styles.editIconText}>📷</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.profileDetails}>
              <Text style={styles.username}>{profileUser.username}</Text>
            </View>
          </View>
          
          {/* Bio Section - moved under profile picture */}
          <View style={styles.bioSection}>
            {profileUser.bio ? (
              <Text style={styles.bio}>{profileUser.bio}</Text>
            ) : isOwnProfile ? (
              <Text style={styles.noBio}>Add a bio to tell others about yourself</Text>
            ) : (
              <Text style={styles.noBio}>No bio yet</Text>
            )}
            
            {isOwnProfile && (
              <TouchableOpacity 
                style={styles.editBioButton}
                onPress={handleEditBio}
                activeOpacity={0.7}
              >
                <Text style={styles.editBioButtonText}>
                  {profileUser.bio ? '✏️ Edit' : '➕ Add Bio'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {!isOwnProfile && currentUser && (
            <TouchableOpacity 
              style={[styles.followButton, isFollowing && styles.unfollowButton]} 
              onPress={isFollowing ? handleUnfollow : handleFollow}
              disabled={followLoading}
              activeOpacity={0.7}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <Text style={[styles.followButtonText, isFollowing && styles.unfollowButtonText]}>
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        {/* Add Social Navigation Section */}
        <View style={styles.socialSection}>
          {isOwnProfile && (
            <TouchableOpacity 
              style={styles.socialNavButton}
              onPress={() => navigation.navigate('UserSearch')}
              activeOpacity={0.7}
            >
              <Text style={styles.socialNavIcon}>🔍</Text>
              <Text style={styles.socialNavText}>Find Bakers</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.socialNavButton}
            onPress={() => navigation.navigate('Following', { userId: profileUser.id, type: 'followers' })}
            activeOpacity={0.7}
          >
            <Text style={styles.socialNavIcon}>👥</Text>
            <Text style={styles.socialNavText}>
              {(() => {
                const count = profileUser.followers?.length || 0;
                return count;
              })()} Followers
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.socialNavButton}
            onPress={() => navigation.navigate('Following', { userId: profileUser.id, type: 'following' })}
            activeOpacity={0.7}
          >
            <Text style={styles.socialNavIcon}>👤</Text>
            <Text style={styles.socialNavText}>
              {(() => {
                const count = profileUser.following?.length || 0;
                return count;
              })()} Following
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.activitySection}>
          <ActivityGraph 
            posts={userPosts} 
            username={!isOwnProfile ? profileUser?.username : undefined}
          />
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
              scrollEnabled={false}
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
            />
          )}
        </View>
      </ScrollView>
      
      {isOwnProfile && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('CreatePost')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
      
      {/* Bio Edit Modal */}
      <Modal
        visible={bioEditModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelBioEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Bio</Text>
            
            <TextInput
              style={styles.bioInput}
              value={editingBio}
              onChangeText={setEditingBio}
              placeholder="Tell others about yourself..."
              placeholderTextColor={COLORS.darkGray}
              multiline={true}
              maxLength={150}
              textAlignVertical="top"
            />
            
            <Text style={styles.characterCount}>
              {editingBio.length}/150 characters
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={handleCancelBioEdit}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={handleSaveBio}
                disabled={bioUpdateLoading}
                activeOpacity={0.7}
              >
                {bioUpdateLoading ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalContent}>
            <Text style={styles.modalTitle}>Settings</Text>
            
            <TouchableOpacity 
              style={styles.settingsOption}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsOptionIcon}>🚪</Text>
              <Text style={styles.settingsOptionText}>Logout</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingsCloseButton}
              onPress={() => setSettingsModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  profileImageContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.round,
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
  bioSection: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.sm,
  },
  bio: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
    lineHeight: 20,
  },
  noBio: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.darkGray,
    fontStyle: 'italic',
    flex: 1,
    marginRight: SPACING.sm,
    lineHeight: 18,
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
  imageContainer: {
    position: 'relative',
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
  activitySection: {
    padding: SPACING.md,
  },
  socialSection: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  socialNavButton: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: SPACING.sm,
  },
  socialNavIcon: {
    fontSize: FONT_SIZE.xl,
    marginBottom: SPACING.xs / 2,
  },
  socialNavText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  followButton: {
    alignSelf: 'flex-end',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 80,
    alignItems: 'center',
  },
  followButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: FONT_SIZE.sm,
  },
  unfollowButton: {
    backgroundColor: COLORS.darkGray,
  },
  unfollowButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: FONT_SIZE.sm,
  },
  profileImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  editIconText: {
    fontSize: FONT_SIZE.sm,
  },
  editBioButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
  },
  editBioButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  bioInput: {
    height: 100,
    marginBottom: SPACING.sm,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    backgroundColor: COLORS.card,
  },
  characterCount: {
    color: COLORS.darkGray,
    fontSize: FONT_SIZE.xs,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
  },
  modalCancelButton: {
    flex: 1,
    padding: SPACING.sm,
    backgroundColor: COLORS.darkGray,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  modalSaveButton: {
    flex: 1,
    padding: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  headerSettingsButton: {
    padding: SPACING.sm,
    marginRight: SPACING.xs,
  },
  headerSettingsIcon: {
    fontSize: FONT_SIZE.lg,
  },
  settingsModalContent: {
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    width: '80%',
    maxWidth: 300,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.card,
  },
  settingsOptionIcon: {
    fontSize: FONT_SIZE.xl,
    marginRight: SPACING.md,
  },
  settingsOptionText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  settingsCloseButton: {
    marginTop: SPACING.md,
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.darkGray,
    borderRadius: BORDER_RADIUS.sm,
  },
  settingsCloseButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  multipleImagesIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BORDER_RADIUS.round,
    padding: SPACING.xs,
  },
  imageCountText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
});

export default ProfileScreen; 