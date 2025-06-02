export interface User {
  id: string;
  username: string;
  email: string;
  photoURL?: string;
  bio?: string;
  following: string[]; // Array of user IDs that this user follows
  followers: string[]; // Array of user IDs that follow this user
  createdAt: number;
}

export interface BreadPost {
  id: string;
  userId: string;
  username: string;
  userPhotoURL?: string;
  title: string;
  description: string;
  photoURL: string; // Keep for backward compatibility with existing posts
  photoURLs?: string[]; // New field for multiple photos
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  ingredients?: string[];
  preparationTime?: number; // in minutes
  cookingTime?: number; // in minutes
  likes: number;
  comments: number;
  createdAt: number;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userPhotoURL?: string;
  text: string;
  createdAt: number;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Profile: { userId: string } | undefined;
  PostDetails: { postId: string };
  CreatePost: undefined;
  EditPost: { postId: string };
  Search: undefined;
  Following: { userId: string; type: 'following' | 'followers' };
}; 