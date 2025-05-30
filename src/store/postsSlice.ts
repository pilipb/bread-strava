import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { BreadPost } from '../types';
import { getAllPosts, getUserPosts, getPostById, createPost, updatePost, deletePost } from '../services/firebase';

interface PostsState {
  posts: BreadPost[];
  userPosts: BreadPost[];
  currentPost: BreadPost | null;
  loading: boolean;
  error: string | null;
}

const initialState: PostsState = {
  posts: [],
  userPosts: [],
  currentPost: null,
  loading: false,
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
      image,
    }: {
      post: Omit<BreadPost, 'id' | 'createdAt' | 'likes' | 'comments' | 'photoURL'>;
      image: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const newPost = await createPost({ ...post } as Omit<BreadPost, 'id' | 'createdAt' | 'likes' | 'comments'>, image);
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
      });
  },
});

export const { clearCurrentPost, clearError } = postsSlice.actions;
export default postsSlice.reducer; 