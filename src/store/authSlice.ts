import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { User } from '../types';
import { loginUser, registerUser, logoutUser, getUserProfile, createUserProfile } from '../services/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      console.log('🔐 Login attempt for:', email);
      const firebaseUser = await loginUser(email, password);
      console.log('✅ Firebase auth successful, user ID:', firebaseUser?.uid);
      
      if (!firebaseUser) {
        throw new Error('User not found');
      }
      
      console.log('📋 Fetching user profile...');
      let userProfile = await getUserProfile(firebaseUser.uid);
      console.log('👤 User profile result:', userProfile);
      
      // If user profile doesn't exist, create it from Firebase Auth data
      if (!userProfile) {
        console.log('🔧 Creating missing user profile...');
        const newUserProfile = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          createdAt: Date.now(),
          following: [],
          followers: []
        };
        
        // Create the user profile in Firestore
        await createUserProfile(firebaseUser.uid, newUserProfile);
        userProfile = newUserProfile;
        console.log('✅ Created user profile:', userProfile);
      }
      
      return userProfile;
    } catch (error: any) {
      console.log('❌ Login error:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password, username }: { email: string; password: string; username: string }, { rejectWithValue }) => {
    try {
      const firebaseUser = await registerUser(email, password, username);
      if (!firebaseUser) {
        throw new Error('User not found');
      }
      const userProfile = await getUserProfile(firebaseUser.uid);
      return userProfile;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await logoutUser();
    return null;
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUserProfile: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, updateUserProfile } = authSlice.actions;
export default authSlice.reducer; 