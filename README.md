# Bread Strava 🍞

A social media app for bread enthusiasts, built with React Native and Firebase. Share your bread creations, discover new recipes, and connect with other bakers!

## Features

- **User Authentication**: Create an account, login, and manage your profile
- **Share Bread Posts**: Upload photos of your bread creations with titles, descriptions, and difficulty ratings
- **Recipe Details**: Add ingredients and preparation/baking times
- **Social Interaction**: Comment on posts and browse a feed of bread creations
- **User Profiles**: View your posts and other users' creations

## Tech Stack

### Frontend
- React Native with Expo
- TypeScript
- Redux for state management
- React Navigation for routing
- Firebase SDK for authentication and data access

### Backend (Firebase)
- Authentication
- Firestore Database
- Storage for images

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI
- Firebase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bread-strava.git
cd bread-strava
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a Firebase project and enable:
   - Authentication (Email/Password)
   - Firestore Database
   - Storage

4. Configure Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication, Firestore, and Storage
   - Add a Web App to your Firebase project
   - Copy the Firebase configuration

5. Create a Firebase configuration file:
   - Open `src/services/firebase.ts`
   - Replace the placeholder config with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

6. Start the development server:
```bash
npm start
# or
yarn start
```

7. Use the Expo Go app on your phone to scan the QR code, or run in a simulator/emulator.

## Project Structure

```
bread-strava/
├── assets/             # Static assets like images
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── navigation/     # Navigation configuration
│   ├── screens/        # Screen components
│   ├── services/       # Firebase and other external services
│   ├── store/          # Redux store, slices and actions
│   ├── theme/          # Styling themes and constants
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
└── App.tsx             # Application entry point
```

## Backend Integration

The app uses Firebase as its backend. Here's how the different Firebase services are used:

### Authentication
- User registration and login with email/password
- User profile management

### Firestore Database
The database has the following collections:

1. **users**
   - Fields: id, username, email, photoURL, bio, createdAt

2. **posts**
   - Fields: id, userId, username, userPhotoURL, title, description, photoURL, difficulty, ingredients, preparationTime, cookingTime, likes, comments, createdAt

3. **comments**
   - Fields: id, postId, userId, username, userPhotoURL, text, createdAt

### Storage
- Used to store user profile pictures and bread post images
- Images are stored in the following paths:
  - User avatars: `/users/{userId}`
  - Post images: `/posts/{timestamp}`

## Creating a Backend

If you want to replace Firebase with your own backend:

1. Create API endpoints that match the functionality in `src/services/firebase.ts`
2. Implement the following endpoints:

### User Endpoints
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Authenticate a user
- `GET /users/:id` - Get user profile
- `PUT /users/:id` - Update user profile

### Post Endpoints
- `GET /posts` - Get all posts
- `GET /posts/:id` - Get a specific post
- `GET /users/:userId/posts` - Get posts by a specific user
- `POST /posts` - Create a new post
- `PUT /posts/:id` - Update a post
- `DELETE /posts/:id` - Delete a post

### Comment Endpoints
- `GET /posts/:postId/comments` - Get comments for a post
- `POST /posts/:postId/comments` - Add a comment to a post

3. Modify the service files to use your API instead of Firebase

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [Firebase](https://firebase.google.com/)
- [Redux Toolkit](https://redux-toolkit.js.org/)