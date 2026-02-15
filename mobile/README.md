# OpportuneX Mobile App

React Native mobile application for OpportuneX - an AI-powered platform to help students discover hackathons, internships, and workshops.

## Features

- **Authentication**: Secure login and registration
- **Smart Search**: Natural language search for opportunities
- **Voice Search**: Multi-language voice commands (English, Hindi)
- **Opportunity Discovery**: Browse and filter opportunities
- **AI Roadmaps**: Personalized preparation plans
- **Push Notifications**: Real-time opportunity alerts
- **Offline Support**: Save opportunities for offline access
- **Profile Management**: Manage skills and preferences

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for routing
- **AsyncStorage** for local persistence
- **Axios** for API communication
- **Expo Notifications** for push notifications
- **Expo Speech** for voice features

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio (for Android development)
- OpportuneX backend API running

## Installation

1. Navigate to the mobile directory:

```bash
cd mobile
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Update `.env` with your API URL:

```
EXPO_PUBLIC_API_URL=http://your-api-url:3001/api
```

## Development

### Start the development server:

```bash
npm start
```

### Run on specific platform:

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable components
│   │   └── OpportunityCard.tsx
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.tsx
│   │   └── NotificationContext.tsx
│   ├── navigation/          # Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   ├── screens/             # Screen components
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   └── main/
│   │       ├── HomeScreen.tsx
│   │       ├── SearchScreen.tsx
│   │       ├── RoadmapScreen.tsx
│   │       └── ProfileScreen.tsx
│   ├── services/            # API and storage services
│   │   ├── api.service.ts
│   │   └── storage.service.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── config/              # Configuration
│   │   └── api.ts
│   └── __tests__/           # Test files
│       └── auth.test.tsx
├── assets/                  # Images, fonts, etc.
├── App.tsx                  # Root component
├── app.json                 # Expo configuration
├── package.json
└── tsconfig.json
```

## API Integration

The mobile app integrates with the OpportuneX backend API. Ensure the backend is running and accessible.

### API Endpoints Used:

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh
- `POST /api/search` - Search opportunities
- `GET /api/search/suggestions` - Search suggestions
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/ai/roadmaps` - Get user roadmaps
- `POST /api/ai/roadmap` - Generate new roadmap
- `POST /api/voice/search` - Voice search

## Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm test -- --coverage
```

## Building for Production

### iOS:

```bash
expo build:ios
```

### Android:

```bash
expo build:android
```

## Configuration

### Environment Variables:

- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_ENV` - Environment (development/production)

### App Configuration (app.json):

- App name and slug
- Version
- Icons and splash screen
- Platform-specific settings
- Permissions (audio recording, notifications)

## Features Implementation

### Authentication

- JWT-based authentication
- Token refresh mechanism
- Secure storage of credentials
- Auto-login on app restart

### Search

- Natural language search
- Voice search with speech-to-text
- Search history
- Filter by type, mode, location, skills

### Offline Support

- Save opportunities locally
- AsyncStorage for persistence
- Sync when online

### Notifications

- Push notification setup
- Permission handling
- Notification listeners
- Deep linking support

### Voice Features

- Speech-to-text for search
- Text-to-speech for results
- Multi-language support (English, Hindi)

## Accessibility

- Screen reader support
- Proper labeling of interactive elements
- Keyboard navigation
- High contrast support
- Font scaling support

## Performance Optimization

- Lazy loading of screens
- Image optimization
- Efficient list rendering with FlatList
- Memoization of expensive computations
- API response caching

## Troubleshooting

### Common Issues:

1. **Metro bundler issues:**

```bash
expo start -c
```

2. **iOS simulator not opening:**

```bash
expo start --ios
```

3. **Android build errors:**

```bash
cd android && ./gradlew clean && cd ..
expo start
```

4. **API connection issues:**

- Check if backend is running
- Verify API URL in .env
- For iOS simulator, use `http://localhost:3001/api`
- For Android emulator, use `http://10.0.2.2:3001/api`
- For physical devices, use your machine's IP address

## Contributing

1. Follow the existing code structure
2. Use TypeScript for all new files
3. Write tests for new features
4. Follow React Native best practices
5. Ensure accessibility compliance

## License

Private - OpportuneX Platform

## Support

For issues and questions, contact the development team.
