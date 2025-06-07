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

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
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
  // New fields for recipe tracking and location
  location?: Location;
  originalRecipeId?: string; // Reference to the original recipe if this is a "made this" post
  isOriginalRecipe?: boolean; // True if this is the original recipe
  connectedPosts?: string[]; // Array of post IDs that are connected to this recipe
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
  CreatePost: {
    originalRecipeId?: string;
    originalTitle?: string;
    originalIngredients?: string[];
    originalDifficulty?: 'easy' | 'medium' | 'hard' | 'expert';
    originalPreparationTime?: number;
    originalCookingTime?: number;
  } | undefined;
  EditPost: { postId: string };
  Search: undefined;
  Following: { userId: string; type: 'following' | 'followers' };
  RecipeMap: { originalRecipeId: string };
}; 