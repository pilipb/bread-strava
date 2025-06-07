import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BreadPost } from '../types';
import { useAppSelector } from '../store';
import { savePost, unsavePost, checkIfUserSavedPost } from '../services/firebase';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme';

interface PostCardProps {
  post: BreadPost;
  onPress: (postId: string) => void;
  showSaveButton?: boolean;
  fullWidth?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, onPress, showSaveButton = true, fullWidth }) => {
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (currentUser && showSaveButton) {
      checkSaved();
    }
  }, [currentUser, post.id, showSaveButton]);

  const checkSaved = async () => {
    if (!currentUser) return;
    
    try {
      const saved = await checkIfUserSavedPost(post.id, currentUser.id);
      setIsSaved(saved);
    } catch (error) {
      console.error('Error checking if post is saved:', error);
    }
  };

  const handleSave = async () => {
    if (!currentUser || saveLoading) return;

    try {
      setSaveLoading(true);
      if (isSaved) {
        await unsavePost(post.id, currentUser.id);
        setIsSaved(false);
      } else {
        await savePost(post.id, currentUser.id);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error saving/unsaving post:', error);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Get the first image URL (supports both single and multiple images)
  const getFirstImageURL = (breadPost: BreadPost) => {
    if (breadPost.photoURLs && breadPost.photoURLs.length > 0) {
      return breadPost.photoURLs[0];
    }
    return breadPost.photoURL;
  };

  const hasMultipleImages = post.photoURLs && post.photoURLs.length > 1;

  return (
    <TouchableOpacity 
      style={fullWidth ? styles.fullWidthPostCard : styles.postCard}
      onPress={() => onPress(post.id)}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: getFirstImageURL(post) }} style={styles.postImage} />
        {hasMultipleImages && (
          <View style={styles.multipleImagesIndicator}>
            <Text style={styles.imageCountText}>📷 {post.photoURLs!.length}</Text>
          </View>
        )}
        {showSaveButton && currentUser && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saveLoading}
            activeOpacity={0.7}
          >
            {saveLoading ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Text style={styles.saveButtonText}>
                {isSaved ? '🔖' : '📋'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.postContent}>
        <Text style={styles.postTitle}>{post.title}</Text>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>{post.difficulty}</Text>
        </View>
        
        <View style={styles.postStats}>
          <View style={styles.stat}>
            <Text style={styles.statCount}>{post.likes}</Text>
            <Text style={styles.statLabel}>Rises</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statCount}>{post.comments}</Text>
            <Text style={styles.statLabel}>Comments</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
  fullWidthPostCard: {
    width: '100%',
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
  saveButton: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 30,
    height: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: FONT_SIZE.md,
  },
});

export default PostCard; 