import { User, BreadPost, Comment } from '../types';
import Constants from 'expo-constants';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import * as FileSystem from 'expo-file-system';

// Initialize Firebase
const firebaseConfig = Constants.expoConfig?.extra?.firebase;

console.log('🔍 Checking Firebase config...');
console.log('🔍 Constants.expoConfig:', Constants.expoConfig);
console.log('🔍 Constants.expoConfig.extra:', Constants.expoConfig?.extra);
console.log('🔍 Firebase config:', firebaseConfig);

if (!firebaseConfig) {
  console.error('❌ Firebase configuration not found in Constants.expoConfig.extra.firebase');
  console.error('❌ Available config:', Constants.expoConfig);
  throw new Error('Firebase configuration not found. Please check your app.config.js and .env file.');
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.storageBucket) {
  console.error('❌ Firebase configuration is incomplete:', firebaseConfig);
  throw new Error('Firebase configuration is missing required fields. Check your .env file.');
}

console.log('✅ Firebase config loaded successfully with keys:', Object.keys(firebaseConfig));
console.log('✅ Project ID:', firebaseConfig.projectId);
console.log('✅ Storage Bucket:', firebaseConfig.storageBucket);
console.log('✅ App ID:', firebaseConfig.appId);
console.log('✅ Messaging Sender ID:', firebaseConfig.messagingSenderId);

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
      
      // Ensure createdAt is a number
      const processedUserData = {
        ...userData,
        createdAt: userData?.createdAt?.toMillis ? userData.createdAt.toMillis() : Date.now()
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
export const createPost = async (post: Omit<BreadPost, 'id' | 'createdAt' | 'likes' | 'comments'>, image: string) => {
  try {
    console.log('Creating post with image:', image);
    
    // Add debugging for storage configuration
    console.log('🔧 Storage bucket:', (firebase.app().options as any).storageBucket);
    console.log('🔧 Project ID:', (firebase.app().options as any).projectId);
    
    // Check authentication state
    const currentUser = auth.currentUser;
    console.log('🔧 Current user:', currentUser ? currentUser.uid : 'Not authenticated');
    
    if (!currentUser) {
      throw new Error('User must be authenticated to upload images');
    }
    
    const storageRef = storage.ref(`posts/${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    console.log('🔧 Storage reference path:', storageRef.fullPath);
    console.log('🔧 Storage bucket from ref:', storageRef.bucket);
    
    let photoURL: string;

    if (image.startsWith('file://')) {
      console.log('Converting to base64 for upload...');
      
      try {
        // Convert file to base64 using FileSystem
        const base64Response = await FileSystem.readAsStringAsync(image, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log('✅ File converted to base64, length:', base64Response.length);
        
        console.log('🔄 About to upload to Firebase Storage...');
        console.log('🔄 Storage bucket:', storageRef.bucket);
        console.log('🔄 Storage path:', storageRef.fullPath);
        
        // Try a different upload approach using fetch and blob
        const response = await fetch(`data:image/jpeg;base64,${base64Response}`);
        const blob = await response.blob();
        
        console.log('🔄 Created blob, size:', blob.size);
        
        // Upload blob with timeout
        const uploadTask = storageRef.put(blob);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout after 60 seconds')), 60000)
        );
        
        await Promise.race([uploadTask, timeoutPromise]);
        console.log('✅ Upload complete using blob method');
        
      } catch (uploadError: any) {
        console.error('🚨 FULL ERROR TRACE:');
        console.error('🚨 Error object:', uploadError);
        console.error('🚨 Error stack:', uploadError.stack);
        console.error('🚨 Error code:', uploadError?.code);
        console.error('🚨 Error message:', uploadError?.message);
        console.error('🚨 Error details:', JSON.stringify(uploadError, null, 2));
        console.error('🚨 Firebase config being used:', JSON.stringify(firebase.app().options, null, 2));
        throw uploadError;
      }
      
    } else if (image.startsWith('data:')) {
      console.log('Uploading as data URL...');
      await storageRef.putString(image, 'data_url');
    } else {
      console.log('Uploading as base64...');
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
    
    photoURL = await storageRef.getDownloadURL();
    console.log('Download URL:', photoURL);
    
    // Save to Firestore
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    const postData = {
      ...post,
      photoURL,
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
    console.error('Error converting image to blob:', error);
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
    
    const docRef = await db.collection('comments').add(cleanCommentData);
    
    // Update comment count on post
    const postDoc = await db.collection('posts').doc(postId).get();
    
    if (postDoc.exists) {
      const post = postDoc.data();
      await db.collection('posts').doc(postId).update({ 
        comments: (post?.comments || 0) + 1 
      });
    }
    
    return { 
      id: docRef.id, 
      ...cleanCommentData,
      createdAt: Date.now() // Use current time for client
    } as Comment;
  } catch (error) {
    throw error;
  }
};

export const getCommentsForPost = async (postId: string) => {
  try {
    const querySnapshot = await db.collection('comments')
      .where('postId', '==', postId)
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
      } as Comment;
    });
  } catch (error) {
    throw error;
  }
};

export const createUserProfile = async (userId: string, userData: Omit<User, 'photoURL' | 'bio'>) => {
  try {
    await db.collection('users').doc(userId).set({
      ...userData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

export { auth, db as firestore, storage }; 