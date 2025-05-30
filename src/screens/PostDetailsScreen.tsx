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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Comment } from '../types';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchPostById, removePost } from '../store/postsSlice';
import { addComment, getCommentsForPost } from '../services/firebase';
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

  useEffect(() => {
    dispatch(fetchPostById(postId));
    loadComments();
  }, [dispatch, postId]);

  const loadComments = async () => {
    try {
      setCommentsLoading(true);
      const postComments = await getCommentsForPost(postId);
      setComments(postComments);
    } catch (error) {
      console.error('Error loading comments:', error);
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

    try {
      setSubmittingComment(true);
      await addComment(
        postId,
        user.id,
        user.username,
        user.photoURL,
        commentText.trim()
      );
      setCommentText('');
      loadComments();
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image source={{ uri: currentPost.photoURL }} style={styles.postImage} />
        
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
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor={COLORS.darkGray}
            value={commentText}
            onChangeText={setCommentText}
            multiline
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
  postImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
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
    flexDirection: 'row',
    padding: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    maxHeight: 100,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  commentButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  disabledButton: {
    backgroundColor: COLORS.mediumGray,
  },
  commentButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
});

export default PostDetailsScreen; 