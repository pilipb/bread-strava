import { User, BreadPost, Comment } from '../types';
import Constants from 'expo-constants';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import * as FileSystem from 'expo-file-system';

// Initialize Firebase
const firebaseConfig = Constants.expoConfig?.extra?.firebase;


if (!firebaseConfig) {
  console.error('❌ Firebase configuration not found in Constants.expoConfig.extra.firebase');
  throw new Error('Firebase configuration not found. Please check your app.config.js and .env file.');
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.storageBucket) {
  throw new Error('Firebase configuration is missing required fields. Check your .env file.');
}

// Initialize Firebase with compat API
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized successfully');
} else {
  console.log('✅ Firebase already initialized');
}

// Test Firebase connection
console.log('🔧 Testing Firebase connection...');
console.log('🔧 Firebase app name:', firebase.app().name);
console.log('🔧 Firebase app options:', JSON.stringify(firebase.app().options, null, 2));

// Get references to Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Auth functions
export const registerUser = async (email: string, password: string, username: string) => {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    
    // Update profile
    if (auth.currentUser) {
      await auth.currentUser.updateProfile({ displayName: username });
    }
    
    // Create user profile in Firestore using the user's UID as document ID
    await db.collection('users').doc(userCredential.user?.uid).set({
      id: userCredential.user?.uid,
      username,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    throw error;
  }
};

// User functions
export const getUserProfile = async (userId: string) => {
  try {
    console.log('🔍 Looking for user document with ID:', userId);
    const docSnap = await db.collection('users').doc(userId).get();
    
    console.log('📄 Document exists:', docSnap.exists);
    
    if (docSnap.exists) {
      const userData = docSnap.data();
      console.log('📋 Raw user data:', userData);
      
      // Ensure createdAt is a number and followers/following arrays exist
      const processedUserData = {
        ...userData,
        createdAt: userData?.createdAt?.toMillis ? userData.createdAt.toMillis() : Date.now(),
        following: userData?.following || [], // Ensure following array exists
        followers: userData?.followers || [], // Ensure followers array exists
        savedPosts: userData?.savedPosts || [] // Ensure savedPosts array exists
      } as User;
      
      console.log('✅ Processed user data:', processedUserData);
      return processedUserData;
    }
    
    console.log('❌ User document not found');
    return null;
  } catch (error) {
    console.log('❌ Error fetching user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId: string, data: Partial<User>) => {
  try {
    const querySnapshot = await db.collection('users').where('id', '==', userId).get();
    
    if (!querySnapshot.empty) {
      const userDocRef = querySnapshot.docs[0].ref;
      await userDocRef.update(data);
    }
  } catch (error) {
    throw error;
  }
};

// Post functions
export const createPost = async (post: Omit<BreadPost, 'id' | 'createdAt' | 'likes' | 'comments'>, images: string | string[]) => {
  try {
    // Handle both single image and array of images
    const imageArray = Array.isArray(images) ? images : [images];
    console.log('Creating post with images:', imageArray.length, 'images');
    
    // Add debugging for storage configuration
    console.log('🔧 Storage bucket:', (firebase.app().options as any).storageBucket);
    console.log('🔧 Project ID:', (firebase.app().options as any).projectId);
    
    // Check authentication state
    const currentUser = auth.currentUser;
    console.log('🔧 Current user:', currentUser ? currentUser.uid : 'Not authenticated');
    
    if (!currentUser) {
      throw new Error('User must be authenticated to upload images');
    }
    
    const photoURLs: string[] = [];
    
    // Upload each image
    for (let i = 0; i < imageArray.length; i++) {
      const image = imageArray[i];
      const storageRef = storage.ref(`posts/${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`);
      console.log(`🔧 Storage reference path for image ${i}:`, storageRef.fullPath);
      
      if (image.startsWith('file://')) {
        console.log(`Converting image ${i} to base64 for upload...`);
        
        try {
          // Convert file to base64 using FileSystem
          const base64Response = await FileSystem.readAsStringAsync(image, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          console.log(`✅ File ${i} converted to base64, length:`, base64Response.length);
          
          console.log(`🔄 About to upload image ${i} to Firebase Storage...`);
          
          // Try a different upload approach using fetch and blob
          const response = await fetch(`data:image/jpeg;base64,${base64Response}`);
          const blob = await response.blob();
          
          console.log(`🔄 Created blob for image ${i}, size:`, blob.size);
          
          // Upload blob with timeout
          const uploadTask = storageRef.put(blob);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Upload timeout after 60 seconds for image ${i}`)), 60000)
          );
          
          await Promise.race([uploadTask, timeoutPromise]);
          console.log(`✅ Upload complete for image ${i} using blob method`);
          
        } catch (uploadError: any) {
          console.error(`🚨 FULL ERROR TRACE for image ${i}:`);
          console.error('🚨 Error object:', uploadError);
          console.error('🚨 Error stack:', uploadError.stack);
          console.error('🚨 Error code:', uploadError?.code);
          console.error('🚨 Error message:', uploadError?.message);
          throw uploadError;
        }
        
      } else if (image.startsWith('data:')) {
        console.log(`Uploading image ${i} as data URL...`);
        await storageRef.putString(image, 'data_url');
      } else {
        console.log(`Uploading image ${i} as base64...`);
        // Try to detect content type from base64 data
        let contentType = 'image/jpeg';
        if (image.startsWith('/9j/')) {
          contentType = 'image/jpeg';
        } else if (image.startsWith('iVBORw0KGgo')) {
          contentType = 'image/png'; 
        } else if (image.startsWith('R0lGOD')) {
          contentType = 'image/gif';
        } else if (image.startsWith('UklGR')) {
          contentType = 'image/webp';
        }
        
        const dataUrl = `data:${contentType};base64,${image}`;
        await storageRef.putString(dataUrl, 'data_url');
      }
      
      const photoURL = await storageRef.getDownloadURL();
      photoURLs.push(photoURL);
      console.log(`Download URL for image ${i}:`, photoURL);
    }
    
    // Save to Firestore
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    const postData = {
      ...post,
      photoURL: photoURLs[0], // First image for backward compatibility
      photoURLs: photoURLs, // All images
      likes: 0,
      comments: 0,
      createdAt: timestamp
    };
    
    // Filter out undefined fields to prevent Firestore errors
    const cleanPostData = Object.fromEntries(
      Object.entries(postData).filter(([_, value]) => value !== undefined)
    );
    
    console.log('🔧 Original post data:', postData);
    console.log('🔧 Cleaned post data:', cleanPostData);
    
    const docRef = await db.collection('posts').add(cleanPostData);
    
    return { 
      id: docRef.id, 
      ...cleanPostData,
      createdAt: Date.now()
    } as BreadPost;
  } catch (error) {
    console.error('Error creating post with images:', error);
    throw error;
  }
};

export const getAllPosts = async () => {
  try {
    const querySnapshot = await db.collection('posts').orderBy('createdAt', 'desc').get();
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt && data.createdAt.toMillis ? 
        data.createdAt.toMillis() : 
        Date.now();
        
      return { 
        id: doc.id, 
        ...data,
        createdAt
      } as BreadPost;
    });
  } catch (error) {
    throw error;
  }
};

export const getPostById = async (postId: string) => {
  try {
    const docSnap = await db.collection('posts').doc(postId).get();
    
    if (docSnap.exists) {
      const data = docSnap.data();
      const createdAt = data?.createdAt && data.createdAt.toMillis ? 
        data.createdAt.toMillis() : 
        Date.now();
        
      return { 
        id: docSnap.id, 
        ...data,
        createdAt
      } as BreadPost;
    }
    return null;
  } catch (error) {
    throw error;
  }
};

export const getUserPosts = async (userId: string) => {
  try {
    const querySnapshot = await db.collection('posts')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt && data.createdAt.toMillis ? 
        data.createdAt.toMillis() : 
        Date.now();
        
      return { 
        id: doc.id, 
        ...data,
        createdAt
      } as BreadPost;
    });
  } catch (error) {
    throw error;
  }
};

export const updatePost = async (postId: string, data: Partial<BreadPost>) => {
  try {
    await db.collection('posts').doc(postId).update(data);
  } catch (error) {
    throw error;
  }
};

export const deletePost = async (postId: string) => {
  try {
    await db.collection('posts').doc(postId).delete();
  } catch (error) {
    throw error;
  }
};

// Comment functions
export const addComment = async (postId: string, userId: string, username: string, userPhotoURL: string | undefined, text: string) => {
  try {
    console.log('Adding comment to post:', postId, 'by user:', username);
    
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    const comment = {
      postId,
      userId,
      username,
      userPhotoURL: userPhotoURL || null, // Convert undefined to null
      text,
      createdAt: timestamp
    };
    
    // Filter out undefined fields to prevent Firestore errors
    const cleanCommentData = Object.fromEntries(
      Object.entries(comment).filter(([_, value]) => value !== undefined)
    );
    
    console.log('Creating comment document with data:', cleanCommentData);
    const docRef = await db.collection('comments').add(cleanCommentData);
    console.log('Comment created with ID:', docRef.id);
    
    // Update comment count on post
    const postDoc = await db.collection('posts').doc(postId).get();
    
    if (postDoc.exists) {
      const post = postDoc.data();
      const newCommentCount = (post?.comments || 0) + 1;
      console.log('Updating post comment count to:', newCommentCount);
      await db.collection('posts').doc(postId).update({ 
        comments: newCommentCount
      });
    } else {
      console.warn('Post document not found when updating comment count:', postId);
    }
    
    console.log('Comment successfully added');
    return { 
      id: docRef.id, 
      ...cleanCommentData,
      createdAt: Date.now() // Use current time for client
    } as Comment;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

export const getCommentsForPost = async (postId: string) => {
  try {
    let querySnapshot;
    
    try {
      // Try the ordered query first
      querySnapshot = await db.collection('comments')
        .where('postId', '==', postId)
        .orderBy('createdAt', 'desc')
        .get();
      
      console.log('Found', querySnapshot.docs.length, 'comments for post:', postId, '(ordered query)');
    } catch (indexError) {
      console.warn('Ordered query failed, trying without ordering:', indexError);
      
      // Fallback to unordered query if index is missing
      querySnapshot = await db.collection('comments')
        .where('postId', '==', postId)
        .get();
        
      console.log('Found', querySnapshot.docs.length, 'comments for post:', postId, '(unordered query)');
    }
    
    const comments = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt && data.createdAt.toMillis ? 
        data.createdAt.toMillis() : 
        Date.now();
        
      return { 
        id: doc.id, 
        ...data,
        createdAt
      } as Comment;
    });
    
    // Sort client-side if we had to use the unordered query
    comments.sort((a, b) => b.createdAt - a.createdAt);
    
    console.log('Processed comments:', comments.length);
    return comments;
  } catch (error) {
    console.error('Error fetching comments for post:', postId, error);
    throw error;
  }
};

// Like functions
export const likePost = async (postId: string, userId: string) => {
  try {
    const batch = db.batch();
    
    // Update the like count on the post
    const postRef = db.collection('posts').doc(postId);
    batch.update(postRef, {
      likes: firebase.firestore.FieldValue.increment(1)
    });
    
    // Add to user's liked posts collection
    const likeRef = db.collection('likes').doc(`${postId}_${userId}`);
    batch.set(likeRef, {
      postId,
      userId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    await batch.commit();
    console.log('Post liked successfully');
  } catch (error) {
    console.error('Error liking post:', error);
    throw error;
  }
};

export const unlikePost = async (postId: string, userId: string) => {
  try {
    const batch = db.batch();
    
    // Update the like count on the post
    const postRef = db.collection('posts').doc(postId);
    batch.update(postRef, {
      likes: firebase.firestore.FieldValue.increment(-1)
    });
    
    // Remove from user's liked posts collection
    const likeRef = db.collection('likes').doc(`${postId}_${userId}`);
    batch.delete(likeRef);
    
    await batch.commit();
    console.log('Post unliked successfully');
  } catch (error) {
    console.error('Error unliking post:', error);
    throw error;
  }
};

export const checkIfUserLikedPost = async (postId: string, userId: string): Promise<boolean> => {
  try {
    const likeDoc = await db.collection('likes').doc(`${postId}_${userId}`).get();
    return likeDoc.exists;
  } catch (error) {
    console.error('Error checking if user liked post:', error);
    return false;
  }
};

// Save/Unsave functions
export const savePost = async (postId: string, userId: string) => {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      savedPosts: firebase.firestore.FieldValue.arrayUnion(postId)
    });
    console.log('Post saved successfully');
  } catch (error) {
    console.error('Error saving post:', error);
    throw error;
  }
};

export const unsavePost = async (postId: string, userId: string) => {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      savedPosts: firebase.firestore.FieldValue.arrayRemove(postId)
    });
    console.log('Post unsaved successfully');
  } catch (error) {
    console.error('Error unsaving post:', error);
    throw error;
  }
};

export const checkIfUserSavedPost = async (postId: string, userId: string): Promise<boolean> => {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    return userData?.savedPosts?.includes(postId) || false;
  } catch (error) {
    console.error('Error checking if user saved post:', error);
    return false;
  }
};

export const getSavedPosts = async (userId: string) => {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const savedPostIds = userData?.savedPosts || [];
    
    if (savedPostIds.length === 0) return [];
    
    // Get saved posts in batches (Firestore 'in' query limit is 10)
    const posts: BreadPost[] = [];
    const batches = [];
    for (let i = 0; i < savedPostIds.length; i += 10) {
      const batch = savedPostIds.slice(i, i + 10);
      batches.push(batch);
    }
    
    for (const batch of batches) {
      const querySnapshot = await db.collection('posts')
        .where(firebase.firestore.FieldPath.documentId(), 'in', batch)
        .get();
      
      const batchPosts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt && data.createdAt.toMillis ? 
          data.createdAt.toMillis() : 
          Date.now();
          
        return { 
          id: doc.id, 
          ...data,
          createdAt
        } as BreadPost;
      });
      
      posts.push(...batchPosts);
    }
    
    // Sort by creation date (newest first)
    return posts.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error getting saved posts:', error);
    throw error;
  }
};

export const createUserProfile = async (userId: string, userData: Omit<User, 'photoURL' | 'bio' | 'following' | 'followers'>) => {
  try {
    await db.collection('users').doc(userId).set({
      ...userData,
      following: [], // Initialize empty following array
      followers: [], // Initialize empty followers array
      savedPosts: [], // Initialize empty savedPosts array
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

// Follow/Unfollow functions
export const followUser = async (currentUserId: string, targetUserId: string) => {
  try {
    const batch = db.batch();
    
    // Add targetUserId to currentUser's following array
    const currentUserRef = db.collection('users').doc(currentUserId);
    batch.update(currentUserRef, {
      following: firebase.firestore.FieldValue.arrayUnion(targetUserId)
    });
    
    // Add currentUserId to targetUser's followers array
    const targetUserRef = db.collection('users').doc(targetUserId);
    batch.update(targetUserRef, {
      followers: firebase.firestore.FieldValue.arrayUnion(currentUserId)
    });
    
    await batch.commit();
  } catch (error) {
    throw error;
  }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
  try {
    const batch = db.batch();
    
    // Remove targetUserId from currentUser's following array
    const currentUserRef = db.collection('users').doc(currentUserId);
    batch.update(currentUserRef, {
      following: firebase.firestore.FieldValue.arrayRemove(targetUserId)
    });
    
    // Remove currentUserId from targetUser's followers array
    const targetUserRef = db.collection('users').doc(targetUserId);
    batch.update(targetUserRef, {
      followers: firebase.firestore.FieldValue.arrayRemove(currentUserId)
    });
    
    await batch.commit();
  } catch (error) {
    throw error;
  }
};

// Search users
export const searchUsers = async (query: string, limit: number = 20) => {
  try {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase().trim();
    
    // We'll do a broader search and filter on the client side since Firestore
    // doesn't support case-insensitive queries or partial text search natively
    const querySnapshot = await db.collection('users')
      .limit(100) // Get more results to filter client-side
      .get();
    
    const filteredUsers = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          following: data.following || [],
          followers: data.followers || [],
          savedPosts: data.savedPosts || []
        } as User;
      })
      .filter(user => {
        const username = user.username?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        
        // Check if query matches username (partial) or email (partial)
        return username.includes(lowerQuery) || email.includes(lowerQuery);
      })
      .slice(0, limit); // Apply the limit after filtering
    
    return filteredUsers;
  } catch (error) {
    throw error;
  }
};

// Search posts
export const searchPosts = async (query: string, limit: number = 20) => {
  try {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase().trim();
    
    // Get all posts and filter client-side for better search capabilities
    const querySnapshot = await db.collection('posts')
      .limit(200) // Get more results to filter client-side
      .get();
    
    const filteredPosts = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt && data.createdAt.toMillis ? 
          data.createdAt.toMillis() : 
          Date.now();
        return { 
          id: doc.id, 
          ...data,
          createdAt
        } as BreadPost;
      })
      .filter(post => {
        const title = post.title?.toLowerCase() || '';
        const description = post.description?.toLowerCase() || '';
        const ingredients = post.ingredients?.join(' ').toLowerCase() || '';
        
        // Check if query matches title, description, or ingredients (partial)
        return title.includes(lowerQuery) || 
               description.includes(lowerQuery) || 
               ingredients.includes(lowerQuery);
      })
      .slice(0, limit); // Apply the limit after filtering
    
    return filteredPosts;
  } catch (error) {
    throw error;
  }
};

// Get posts from followed users
export const getFollowingPosts = async (followingIds: string[]) => {
  try {
    if (followingIds.length === 0) return [];
    
    const querySnapshot = await db.collection('posts')
      .where('userId', 'in', followingIds)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt && data.createdAt.toMillis ? 
        data.createdAt.toMillis() : 
        Date.now();
        
      return { 
        id: doc.id, 
        ...data,
        createdAt
      } as BreadPost;
    });
  } catch (error) {
    throw error;
  }
};

// Get users by IDs (for followers/following lists)
export const getUsersByIds = async (userIds: string[]) => {
  try {
    if (userIds.length === 0) return [];
    
    const users: User[] = [];
    
    // Firestore 'in' queries are limited to 10 items, so we need to batch them
    const batches = [];
    for (let i = 0; i < userIds.length; i += 10) {
      const batch = userIds.slice(i, i + 10);
      batches.push(batch);
    }
    
    for (const batch of batches) {
      const querySnapshot = await db.collection('users')
        .where('id', 'in', batch)
        .get();
      
      const batchUsers = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          following: data.following || [],
          followers: data.followers || [],
          savedPosts: data.savedPosts || []
        } as User;
      });
      
      users.push(...batchUsers);
    }
    
    return users;
  } catch (error) {
    throw error;
  }
};

// New functions for recipe connections
export const connectPostToRecipe = async (originalRecipeId: string, newPostId: string) => {
  try {
    const batch = db.batch();
    
    // Update the original recipe to include the new connected post
    const originalPostRef = db.collection('posts').doc(originalRecipeId);
    const originalPost = await originalPostRef.get();
    
    if (originalPost.exists) {
      const currentConnectedPosts = originalPost.data()?.connectedPosts || [];
      batch.update(originalPostRef, {
        connectedPosts: [...currentConnectedPosts, newPostId]
      });
    }
    
    // Update the new post to reference the original recipe
    const newPostRef = db.collection('posts').doc(newPostId);
    batch.update(newPostRef, {
      originalRecipeId: originalRecipeId,
      isOriginalRecipe: false
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error connecting post to recipe:', error);
    throw error;
  }
};

export const getConnectedPosts = async (originalRecipeId: string) => {
  try {
    // Get the original recipe
    const originalPost = await getPostById(originalRecipeId);
    if (!originalPost) {
      throw new Error('Original recipe not found');
    }
    
    const connectedPostIds = originalPost.connectedPosts || [];
    
    // Get all connected posts
    const connectedPosts = await Promise.all(
      connectedPostIds.map(async (postId) => {
        const post = await getPostById(postId);
        return post;
      })
    );
    
    // Filter out any null posts and include the original
    const validConnectedPosts = connectedPosts.filter(post => post !== null);
    
    return [originalPost, ...validConnectedPosts] as BreadPost[];
  } catch (error) {
    console.error('Error getting connected posts:', error);
    throw error;
  }
};

export const createConnectedPost = async (
  post: Omit<BreadPost, 'id' | 'createdAt' | 'likes' | 'comments'>, 
  images: string | string[],
  originalRecipeId: string
) => {
  try {
    // Create the post first
    const newPost = await createPost(post, images);
    
    // Then connect it to the original recipe
    await connectPostToRecipe(originalRecipeId, newPost.id);
    
    // Return the updated post
    return await getPostById(newPost.id);
  } catch (error) {
    console.error('Error creating connected post:', error);
    throw error;
  }
};

export { auth, db as firestore, storage }; 