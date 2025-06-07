import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { BreadPost } from '../types';
import { getAllPosts, getUserPosts, getPostById, createPost, updatePost, deletePost, getFollowingPosts, getSavedPosts } from '../services/firebase';

interface PostsState {
  posts: BreadPost[];
  userPosts: BreadPost[];
  savedPosts: BreadPost[];
  currentPost: BreadPost | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: PostsState = {
  posts: [],
  userPosts: [],
  savedPosts: [],
  currentPost: null,
  loading: false,
  refreshing: false,
  error: null,
};

export const fetchAllPosts = createAsyncThunk('posts/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const posts = await getAllPosts();
    return posts;
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

export const fetchUserPosts = createAsyncThunk(
  'posts/fetchUserPosts',
  async (userId: string, { rejectWithValue }) => {
    try {
      const posts = await getUserPosts(userId);
      return posts;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPostById = createAsyncThunk(
  'posts/fetchById',
  async (postId: string, { rejectWithValue }) => {
    try {
      const post = await getPostById(postId);
      return post;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const addNewPost = createAsyncThunk(
  'posts/addNew',
  async (
    {
      post,
      images,
    }: {
      post: Omit<BreadPost, 'id' | 'createdAt' | 'likes' | 'comments' | 'photoURL' | 'photoURLs'>;
      images: string | string[];
    },
    { rejectWithValue }
  ) => {
    try {
      // Handle both single image and multiple images for backward compatibility
      const imageArray = Array.isArray(images) ? images : [images];
      const newPost = await createPost({ ...post } as Omit<BreadPost, 'id' | 'createdAt' | 'likes' | 'comments'>, imageArray);
      return newPost;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const editPost = createAsyncThunk(
  'posts/edit',
  async ({ postId, data }: { postId: string; data: Partial<BreadPost> }, { rejectWithValue }) => {
    try {
      await updatePost(postId, data);
      const updatedPost = await getPostById(postId);
      return updatedPost;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const removePost = createAsyncThunk(
  'posts/remove',
  async (postId: string, { rejectWithValue }) => {
    try {
      await deletePost(postId);
      return postId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchFollowingPosts = createAsyncThunk(
  'posts/fetchFollowing',
  async (followingIds: string[], { rejectWithValue }) => {
    try {
      const posts = await getFollowingPosts(followingIds);
      return posts;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const refreshFollowingPosts = createAsyncThunk(
  'posts/refreshFollowing',
  async (followingIds: string[], { rejectWithValue }) => {
    try {
      const posts = await getFollowingPosts(followingIds);
      return posts;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSavedPosts = createAsyncThunk(
  'posts/fetchSaved',
  async (userId: string, { rejectWithValue }) => {
    try {
      const posts = await getSavedPosts(userId);
      return posts;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    clearCurrentPost: (state) => {
      state.currentPost = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload;
      })
      .addCase(fetchAllPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUserPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.userPosts = action.payload;
      })
      .addCase(fetchUserPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchPostById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPostById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPost = action.payload;
      })
      .addCase(fetchPostById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(addNewPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addNewPost.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = [action.payload, ...state.posts];
        state.userPosts = [action.payload, ...state.userPosts];
      })
      .addCase(addNewPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(editPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editPost.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPost = action.payload;
        state.posts = state.posts.map((post) =>
          post.id === action.payload?.id ? action.payload : post
        );
        state.userPosts = state.userPosts.map((post) =>
          post.id === action.payload?.id ? action.payload : post
        );
      })
      .addCase(editPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(removePost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removePost.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = state.posts.filter((post) => post.id !== action.payload);
        state.userPosts = state.userPosts.filter((post) => post.id !== action.payload);
        if (state.currentPost && state.currentPost.id === action.payload) {
          state.currentPost = null;
        }
      })
      .addCase(removePost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchFollowingPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowingPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload;
      })
      .addCase(fetchFollowingPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(refreshFollowingPosts.pending, (state) => {
        state.refreshing = true;
        state.error = null;
      })
      .addCase(refreshFollowingPosts.fulfilled, (state, action) => {
        state.refreshing = false;
        state.posts = action.payload;
      })
      .addCase(refreshFollowingPosts.rejected, (state, action) => {
        state.refreshing = false;
        state.error = action.payload as string;
      })
      .addCase(fetchSavedPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavedPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.savedPosts = action.payload;
      })
      .addCase(fetchSavedPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentPost, clearError } = postsSlice.actions;
export default postsSlice.reducer; 