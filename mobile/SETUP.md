# OpportuneX Mobile - Setup Guide

## Quick Start

### 1. Prerequisites Check

Ensure you have the following installed:

- Node.js 18+ (`node --version`)
- npm or yarn (`npm --version`)
- Expo CLI (`npm install -g expo-cli`)

### 2. Install Dependencies

```bash
cd mobile
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your API URL:

```
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

**Important:**

- For iOS Simulator: Use `http://localhost:3001/api`
- For Android Emulator: Use `http://10.0.2.2:3001/api`
- For Physical Device: Use your computer's IP address (e.g., `http://192.168.1.100:3001/api`)

### 4. Start Development Server

```bash
npm start
```

This will open Expo DevTools in your browser.

### 5. Run on Device/Simulator

#### iOS (Mac only):

```bash
npm run ios
```

Or press `i` in the terminal after running `npm start`.

#### Android:

```bash
npm run android
```

Or press `a` in the terminal after running `npm start`.

#### Physical Device:

1. Install Expo Go app from App Store (iOS) or Play Store (Android)
2. Scan the QR code shown in the terminal or Expo DevTools

## Backend Setup

The mobile app requires the OpportuneX backend to be running.

### Start Backend:

```bash
# From the root directory
npm run api-gateway:dev
```

The backend should be running on `http://localhost:3001`.

### Verify Backend:

```bash
curl http://localhost:3001/api/health
```

Should return: `{"status":"ok"}`

## Development Workflow

### 1. Code Changes

- Edit files in `src/`
- Changes will hot-reload automatically
- Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android) for dev menu

### 2. Testing

```bash
npm test
```

### 3. Type Checking

```bash
npm run type-check
```

### 4. Linting

```bash
npm run lint
```

## Troubleshooting

### Metro Bundler Issues

Clear cache and restart:

```bash
expo start -c
```

### iOS Simulator Not Found

Install Xcode from App Store, then:

```bash
sudo xcode-select --switch /Applications/Xcode.app
```

### Android Emulator Issues

1. Open Android Studio
2. Go to AVD Manager
3. Create/Start an emulator
4. Run `npm run android`

### Network Request Failed

**Problem:** API calls fail with network error.

**Solutions:**

1. Check backend is running: `curl http://localhost:3001/api/health`
2. For Android emulator, use `http://10.0.2.2:3001/api` in `.env`
3. For physical device, use your computer's IP address
4. Ensure device and computer are on same WiFi network

### Cannot Connect to Expo

**Problem:** Expo Go app can't connect to dev server.

**Solutions:**

1. Ensure phone and computer are on same WiFi
2. Try tunnel mode: `expo start --tunnel`
3. Check firewall settings

### Module Not Found

```bash
rm -rf node_modules
npm install
expo start -c
```

## Platform-Specific Setup

### iOS Development

**Requirements:**

- macOS
- Xcode 14+
- iOS Simulator

**Setup:**

1. Install Xcode from App Store
2. Open Xcode and install additional components
3. Accept license: `sudo xcodebuild -license accept`

### Android Development

**Requirements:**

- Android Studio
- Android SDK
- Android Emulator or physical device

**Setup:**

1. Download Android Studio
2. Install Android SDK (API 33+)
3. Create virtual device in AVD Manager
4. Enable USB debugging on physical device (if using)

## Building for Production

### iOS (requires Apple Developer account):

```bash
expo build:ios
```

Follow prompts to configure:

- Bundle identifier
- Apple ID credentials
- Distribution certificate

### Android:

```bash
expo build:android
```

Choose build type:

- APK (for testing)
- App Bundle (for Play Store)

## Environment Variables

Create `.env` file with:

```bash
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3001/api

# Environment
EXPO_PUBLIC_ENV=development
```

**Production:**

```bash
EXPO_PUBLIC_API_URL=https://api.opportunex.com/api
EXPO_PUBLIC_ENV=production
```

## Assets Setup

Add required assets to `assets/` directory:

1. **icon.png** (1024x1024) - App icon
2. **splash.png** (1242x2436) - Splash screen
3. **adaptive-icon.png** (1024x1024) - Android adaptive icon
4. **favicon.png** (48x48) - Web favicon

Use the OpportuneX branding guidelines for colors and design.

## Testing on Physical Devices

### iOS:

1. Install Expo Go from App Store
2. Ensure iPhone and Mac are on same WiFi
3. Scan QR code from Expo DevTools

### Android:

1. Install Expo Go from Play Store
2. Ensure phone and computer are on same WiFi
3. Scan QR code from Expo DevTools

## Next Steps

1. ✅ Complete setup steps above
2. ✅ Verify backend connection
3. ✅ Test authentication flow
4. ✅ Test search functionality
5. ✅ Configure push notifications
6. ✅ Add app icons and splash screen
7. ✅ Test on physical devices
8. ✅ Build for production

## Support

For issues:

1. Check this guide
2. Review error messages carefully
3. Check Expo documentation: https://docs.expo.dev
4. Contact development team

## Useful Commands

```bash
# Start with cache clear
expo start -c

# Start in tunnel mode (for network issues)
expo start --tunnel

# Start on specific platform
expo start --ios
expo start --android

# View logs
expo start --dev-client

# Check Expo diagnostics
expo doctor

# Update Expo SDK
expo upgrade
```
