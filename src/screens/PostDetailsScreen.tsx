import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StatusBar,
  Dimensions,
  FlatList,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Comment } from '../types';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchPostById, removePost } from '../store/postsSlice';
import { addComment, getCommentsForPost, likePost, unlikePost, checkIfUserLikedPost, savePost, unsavePost, checkIfUserSavedPost } from '../services/firebase';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme';

type PostDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PostDetails'>;
type PostDetailsScreenRouteProp = RouteProp<RootStackParamList, 'PostDetails'>;

interface Props {
  navigation: PostDetailsScreenNavigationProp;
  route: PostDetailsScreenRouteProp;
}

const PostDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { postId } = route.params;
  const dispatch = useAppDispatch();
  const { currentPost, loading } = useAppSelector((state) => state.posts);
  const { user } = useAppSelector((state) => state.auth);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isRisen, setIsRisen] = useState(false);
  const [risingPost, setRisingPost] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingPost, setSavingPost] = useState(false);

  useEffect(() => {
    dispatch(fetchPostById(postId));
    loadComments();
  }, [dispatch, postId]);

  useEffect(() => {
    // Check if user has risen this post
    if (user && currentPost) {
      checkIfUserLikedPost(postId, user.id)
        .then(setIsRisen)
        .catch(console.error);
    }
  }, [user, currentPost, postId]);

  useEffect(() => {
    // Check if user has saved this post
    if (user && currentPost && user.id !== currentPost.userId) {
      checkIfUserSavedPost(postId, user.id)
        .then(setIsSaved)
        .catch(console.error);
    }
  }, [user, currentPost, postId]);

  const loadComments = async () => {
    try {
      setCommentsLoading(true);
      const postComments = await getCommentsForPost(postId);
      setComments(postComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      // Don't show alert here as it might be called repeatedly
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to post a comment');
      return;
    }

    if (submittingComment) {
      return;
    }

    try {
      setSubmittingComment(true);
      
      const trimmedText = commentText.trim();
      
      await addComment(
        postId,
        user.id,
        user.username,
        user.photoURL,
        trimmedText
      );
      
      console.log('Comment submitted successfully, clearing input');
      setCommentText('');
      
      // Wait for comments to reload before re-enabling the button
      await loadComments();
      
      // Refresh post to update comment count
      dispatch(fetchPostById(postId));
      
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditPost = () => {
    if (currentPost) {
      navigation.navigate('EditPost', { postId: currentPost.id });
    }
  };

  const handleDeletePost = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await dispatch(removePost(postId)).unwrap();
              navigation.goBack();
            } catch (error) {
              // Error handled in the slice
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleProfilePress = (userId: string) => {
    navigation.navigate('Profile', { userId });
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

  // Get all image URLs (supports both single and multiple images)
  const getImageURLs = () => {
    if (!currentPost) return [];
    
    // If post has multiple images, use those
    if (currentPost.photoURLs && currentPost.photoURLs.length > 0) {
      return currentPost.photoURLs;
    }
    
    // Fall back to single image for backward compatibility
    return currentPost.photoURL ? [currentPost.photoURL] : [];
  };

  const imageURLs = getImageURLs();

  const openImageModal = (index: number) => {
    setCurrentImageIndex(index);
    setImageModalVisible(true);
  };

  const renderImageItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity 
      onPress={() => openImageModal(index)}
      activeOpacity={0.9}
      style={styles.imageItem}
    >
      <Image source={{ uri: item }} style={styles.postImage} />
    </TouchableOpacity>
  );

  const renderModalImageItem = ({ item }: { item: string }) => (
    <View style={styles.modalImageContainer}>
      <Image 
        source={{ uri: item }} 
        style={styles.fullScreenImage}
        resizeMode="contain"
      />
    </View>
  );

  const handleRisePost = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to rise posts');
      return;
    }

    if (risingPost) return;

    try {
      setRisingPost(true);
      
      if (isRisen) {
        await unlikePost(postId, user.id);
        setIsRisen(false);
      } else {
        await likePost(postId, user.id);
        setIsRisen(true);
      }
      
      // Refresh post to update rise count
      dispatch(fetchPostById(postId));
      
    } catch (error) {
      console.error('Error rising/unrising post:', error);
      Alert.alert('Error', 'Failed to update rise. Please try again.');
    } finally {
      setRisingPost(false);
    }
  };

  const handleSavePost = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save posts');
      return;
    }

    if (savingPost) return;

    try {
      setSavingPost(true);
      
      if (isSaved) {
        await unsavePost(postId, user.id);
        setIsSaved(false);
      } else {
        await savePost(postId, user.id);
        setIsSaved(true);
      }
      
    } catch (error) {
      console.error('Error saving/unsaving post:', error);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    } finally {
      setSavingPost(false);
    }
  };

  const handleMadeThis = () => {
    if (currentPost) {
      navigation.navigate('CreatePost', { 
        // Pass the original recipe ID so we can connect the posts
        originalRecipeId: currentPost.id,
        // Pre-fill some data from the original recipe
        originalTitle: currentPost.title,
        originalIngredients: currentPost.ingredients,
        originalDifficulty: currentPost.difficulty,
        originalPreparationTime: currentPost.preparationTime,
        originalCookingTime: currentPost.cookingTime,
      });
    }
  };

  const handleViewRecipeMap = () => {
    const originalRecipeId = currentPost?.isOriginalRecipe 
      ? currentPost.id 
      : currentPost?.originalRecipeId;
    
    if (originalRecipeId) {
      navigation.navigate('RecipeMap', { originalRecipeId });
    }
  };

  if (loading || !currentPost) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Loading post...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingContainer}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
        {/* Image Gallery */}
        {imageURLs.length > 0 && (
          <View style={styles.imageGalleryContainer}>
            <FlatList
              data={imageURLs}
              renderItem={renderImageItem}
              keyExtractor={(item, index) => `post-image-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.imageGallery}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                setCurrentImageIndex(index);
              }}
            />
            
            {imageURLs.length > 1 && (
              <View style={styles.imageIndicatorContainer}>
                {imageURLs.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.imageIndicator,
                      index === currentImageIndex && styles.activeImageIndicator
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}
        
        <View style={styles.postContent}>
          <View style={styles.headerRow}>
            <Text style={styles.postTitle}>{currentPost.title}</Text>
            
            {user && user.id === currentPost.userId && (
              <View style={styles.postActions}>
                <TouchableOpacity onPress={handleEditPost} style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDeletePost} style={[styles.actionButton, styles.deleteButton]}>
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => handleProfilePress(currentPost.userId)}
          >
            {currentPost.userPhotoURL ? (
              <Image source={{ uri: currentPost.userPhotoURL }} style={styles.userAvatar} />
            ) : (
              <View style={[styles.userAvatar, styles.noAvatar]}>
                <Text style={styles.avatarText}>{currentPost.username.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.username}>{currentPost.username}</Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(currentPost.createdAt)}</Text>
          </TouchableOpacity>
          
          <View style={styles.postMeta}>
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>{currentPost.difficulty}</Text>
            </View>
            
            {currentPost.preparationTime && (
              <View style={styles.timeInfo}>
                <Text style={styles.timeLabel}>Prep Time:</Text>
                <Text style={styles.timeValue}>{currentPost.preparationTime} min</Text>
              </View>
            )}
            
            {currentPost.cookingTime && (
              <View style={styles.timeInfo}>
                <Text style={styles.timeLabel}>Baking Time:</Text>
                <Text style={styles.timeValue}>{currentPost.cookingTime} min</Text>
              </View>
            )}
            
            <View style={styles.riseSection}>
              <TouchableOpacity 
                style={styles.riseButton}
                onPress={handleRisePost}
                disabled={risingPost}
              >
                {risingPost ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <Text style={[styles.riseIcon, isRisen && styles.risenIcon]}>
                      {isRisen ? '🍞' : '⬆️'}
                    </Text>
                    <Text style={styles.riseCount}>{currentPost.likes}</Text>
                    <Text style={styles.riseLabel}>
                      {currentPost.likes === 1 ? 'rise' : 'rises'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              {/* Save button - only show for other users' posts */}
              {user && user.id !== currentPost.userId && (
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleSavePost}
                  disabled={savingPost}
                >
                  {savingPost ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Text style={styles.saveIcon}>
                        {isSaved ? '🔖' : '📋'}
                      </Text>
                      <Text style={styles.saveLabel}>
                        {isSaved ? 'Saved' : 'Save'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <Text style={styles.postDescription}>{currentPost.description}</Text>
          
          {currentPost.ingredients && currentPost.ingredients.length > 0 && (
            <View style={styles.ingredientsContainer}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <View style={styles.ingredientsList}>
                {currentPost.ingredients.map((ingredient, index) => (
                  <View key={index} style={styles.ingredientItem}>
                    <View style={styles.bulletPoint} />
                    <Text style={styles.ingredientText}>{ingredient}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Recipe Tracking Section */}
          <View style={styles.recipeTrackingSection}>
            {/* Show "I've made this" button if this is an original recipe and user is not the author */}
            {currentPost.isOriginalRecipe && user && user.id !== currentPost.userId && (
              <TouchableOpacity 
                style={styles.madethisButton}
                onPress={handleMadeThis}
              >
                <Text style={styles.madeThisIcon}>👨‍🍳</Text>
                <Text style={styles.madeThisText}>I've Made This</Text>
              </TouchableOpacity>
            )}
            
            {/* Show Recipe Map button if this post has connected posts or is connected to an original */}
            {((currentPost.isOriginalRecipe && currentPost.connectedPosts && currentPost.connectedPosts.length > 0) ||
              (currentPost.originalRecipeId)) && (
              <TouchableOpacity 
                style={styles.recipeMapButton}
                onPress={handleViewRecipeMap}
              >
                <Text style={styles.recipeMapIcon}>🗺️</Text>
                <Text style={styles.recipeMapText}>View Recipe Map</Text>
                {currentPost.isOriginalRecipe && currentPost.connectedPosts && (
                  <Text style={styles.recipeMapCount}>
                    ({currentPost.connectedPosts.length + 1} locations)
                  </Text>
                )}
              </TouchableOpacity>
            )}
            
            {/* Show location if available */}
            {currentPost.location && (
              <View style={styles.locationContainer}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText}>
                  {currentPost.location.city && currentPost.location.country
                    ? `${currentPost.location.city}, ${currentPost.location.country}`
                    : 'Location available'
                  }
                </Text>
              </View>
            )}
            
            {/* Show if this is a connected post */}
            {currentPost.originalRecipeId && !currentPost.isOriginalRecipe && (
              <View style={styles.connectedPostIndicator}>
                <Text style={styles.connectedPostText}>
                  🔗 Made from original recipe
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
          
          {commentsLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.commentsLoader} />
          ) : (
            <>
              {comments.length === 0 ? (
                <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
              ) : (
                comments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <TouchableOpacity 
                        style={styles.commentUser}
                        onPress={() => handleProfilePress(comment.userId)}
                      >
                        {comment.userPhotoURL ? (
                          <Image source={{ uri: comment.userPhotoURL }} style={styles.commentAvatar} />
                        ) : (
                          <View style={[styles.commentAvatar, styles.noAvatar]}>
                            <Text style={styles.commentAvatarText}>{comment.username.charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                        <Text style={styles.commentUsername}>{comment.username}</Text>
                      </TouchableOpacity>
                      <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                ))
              )}
            </>
          )}
        </View>
        </ScrollView>
        
        {user && (
          <View style={styles.commentInputContainer}>
            <View style={styles.inputRow}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.inputAvatar} />
              ) : (
                <View style={[styles.inputAvatar, styles.noAvatar]}>
                  <Text style={styles.inputAvatarText}>{user.username.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor={COLORS.darkGray}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[styles.commentButton, !commentText.trim() && styles.disabledButton]}
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || submittingComment}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.commentButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Full Screen Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalContainer}>
          <StatusBar backgroundColor="black" barStyle="light-content" />
          
          <FlatList
            data={imageURLs}
            renderItem={renderModalImageItem}
            keyExtractor={(item, index) => `modal-image-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={currentImageIndex}
            getItemLayout={(data, index) => ({
              length: Dimensions.get('window').width,
              offset: Dimensions.get('window').width * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / Dimensions.get('window').width);
              setCurrentImageIndex(index);
            }}
          />
          
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setImageModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          
          {imageURLs.length > 1 && (
            <View style={styles.modalImageIndicatorContainer}>
              <Text style={styles.imageCounterText}>
                {currentImageIndex + 1} / {imageURLs.length}
              </Text>
            </View>
          )}
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
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
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
  postImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  imageItem: {
    width: Dimensions.get('window').width,
  },
  postContent: {
    padding: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  postTitle: {
    flex: 1,
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  postActions: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: FONT_SIZE.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  userAvatar: {
    width: 30,
    height: 30,
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
    fontSize: FONT_SIZE.md,
    color: COLORS.darkGray,
    fontWeight: 'bold',
  },
  timeAgo: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.darkGray,
    marginLeft: SPACING.md,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  difficultyBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.round,
    marginRight: SPACING.md,
    marginBottom: SPACING.xs,
  },
  difficultyText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.md,
    marginBottom: SPACING.xs,
  },
  timeLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.darkGray,
    marginRight: SPACING.xs,
  },
  timeValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  riseSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  riseButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riseIcon: {
    fontSize: FONT_SIZE.lg,
    marginRight: SPACING.xs,
  },
  risenIcon: {
    color: COLORS.error,
  },
  riseCount: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  riseLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.darkGray,
    marginLeft: SPACING.xs,
  },
  postDescription: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  ingredientsContainer: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  ingredientsList: {
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  ingredientText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  commentsSection: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  commentsLoader: {
    marginVertical: SPACING.md,
  },
  noCommentsText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.darkGray,
    textAlign: 'center',
    marginVertical: SPACING.lg,
  },
  commentItem: {
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  commentUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.round,
    marginRight: SPACING.xs,
  },
  commentAvatarText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  commentUsername: {
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  commentTime: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.darkGray,
  },
  commentText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    lineHeight: 20,
  },
  commentInputContainer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  inputAvatar: {
    width: 30,
    height: 30,
    borderRadius: BORDER_RADIUS.round,
    marginRight: SPACING.sm,
  },
  inputAvatarText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    maxHeight: 100,
    minHeight: 40,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    marginRight: SPACING.sm,
    textAlignVertical: 'top',
  },
  commentButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  disabledButton: {
    backgroundColor: COLORS.mediumGray,
  },
  commentButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  // Full Screen Image Modal Styles
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  imageGalleryContainer: {
    marginBottom: SPACING.md,
  },
  imageGallery: {
    height: 250,
  },
  imageIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.darkGray,
    marginHorizontal: SPACING.xs,
  },
  activeImageIndicator: {
    backgroundColor: COLORS.primary,
  },
  modalImageContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageIndicatorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCounterText: {
    color: 'white',
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },
  recipeTrackingSection: {
    marginBottom: SPACING.md,
  },
  madethisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  madeThisIcon: {
    fontSize: FONT_SIZE.lg,
    marginRight: SPACING.xs,
  },
  madeThisText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },
  recipeMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  recipeMapIcon: {
    fontSize: FONT_SIZE.lg,
    marginRight: SPACING.xs,
  },
  recipeMapText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },
  recipeMapCount: {
    color: COLORS.background,
    fontSize: FONT_SIZE.xs,
    marginLeft: SPACING.xs,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  locationIcon: {
    fontSize: FONT_SIZE.lg,
    marginRight: SPACING.xs,
  },
  locationText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
  },
  connectedPostIndicator: {
    backgroundColor: COLORS.primary,
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
  },
  connectedPostText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.md,
  },
  saveIcon: {
    fontSize: FONT_SIZE.lg,
    marginRight: SPACING.xs,
  },
  saveLabel: {
    color: COLORS.background,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },
});

export default PostDetailsScreen; 