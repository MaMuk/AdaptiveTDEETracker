# Adaptive TDEE Tracker

A mobile application that helps you track your calories and weight to calculate your Total Daily Energy Expenditure (TDEE) and provides personalized calorie recommendations to reach your target weight or maintain your current weight.

## Project Overview

The Adaptive TDEE Tracker is a Vue 3-based mobile application that implements an adaptive TDEE calculation system. It tracks your daily calorie intake and weight changes over time, then uses this data to calculate your actual TDEE and provide accurate calorie recommendations.

**Key Features:**
- **Daily Tracking**: Log your weight and calorie intake each day
- **Adaptive TDEE Calculation**: Automatically calculates your TDEE based on your actual data
- **Goal-Oriented Recommendations**: Get personalized calorie targets to reach your goal weight
- **Weight Trend Analysis**: View statistics and trends over time
- **Offline-First**: All data is stored locally on your device

**Current Status:**
- Currently uses metric units (kg, cm)
- Unit configuration (imperial/metric) is planned for a future release

**Tech Stack:**
- **Framework**: Vue 3
- **Build Tool**: Vite
- **UI Framework**: Quasar
- **Mobile Platform**: Ionic Capacitor

## Usage

### Getting Started

1. **Initial Setup**: On first launch, configure your profile in the Settings view:
   - Enter your current weight
   - Set your goal weight
   - Choose your desired rate of weight change (0.25kg, 0.5kg, 0.75kg, or 1kg per week)

2. **Daily Tracking**: Use the Tracker view to:
   - Log your daily weight (weigh yourself at the same time each day for consistency)
   - Record your total calorie intake for the day
   - View your recommended daily calorie target

3. **Monitor Progress**: Check the Statistics view to:
   - See your weight trends over time
   - Review weekly averages and changes
   - Track your progress toward your goal

### Tips for Best Results

- **Consistency is Key**: Log your data daily for the most accurate TDEE calculations
- **Weigh at the Same Time**: Weight fluctuates throughout the day; weigh yourself at the same time daily (preferably in the morning)
- **Be Patient**: The TDEE calculation becomes more accurate as you accumulate more data
- **Track Honestly**: Accurate calorie logging leads to accurate recommendations

## Build Instructions

### Prerequisites

#### For Web Development
- Node.js (v16 or higher)
- npm or yarn

#### For Android Build
- JDK 21 (full JDK, not JRE)
- Android SDK
- Gradle (included in Android project)

### Development Setup

#### Install Dependencies
```bash
npm install
```

#### Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

#### Build for Production
```bash
npm run build
```

### Building Android APK

#### 1. Prerequisites Installation

**Install JDK 21 (Arch Linux)**
```bash
sudo pacman -S jdk21-openjdk
```

**Install Android SDK**  
Download and install [Android Studio](https://developer.android.com/studio) or install the Android SDK command-line tools.

#### 2. Add Android Platform

If not already added:
```bash
npx cap add android
```

#### 3. Configure Android Build

Create `android/local.properties` with your Android SDK path:
```properties
sdk.dir=/path/to/your/Android/Sdk
```

Create or update `android/gradle.properties`:
```properties
org.gradle.java.home=/usr/lib/jvm/java-21-openjdk
android.useAndroidX=true
android.enableJetifier=true
```

#### 4. Build the APK

```bash
# Build web assets
npm run build

# Sync with Capacitor
npx cap sync android

# Build debug APK
cd android
./gradlew assembleDebug
```

The APK will be located at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

#### 5. Build Release APK (for Production)

First, generate a signing key:
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Configure signing in `android/app/build.gradle`, then build:
```bash
cd android
./gradlew assembleRelease
```

### Installing on Android Device

**Via ADB (Android Debug Bridge)**
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Manual Installation**
1. Copy the APK file to your Android device
2. Enable "Install from Unknown Sources" in device settings
3. Open the APK file and install

### Project Structure

```
├── src/
│   ├── views/           # Page views (SettingsView, TrackerView, StatisticsView)
│   ├── router/          # Vue Router configuration
│   ├── stores/          # Pinia stores
│   ├── utils/           # Utility functions (TDEE calculations)
│   ├── App.vue          # Root component
│   └── main.js          # Application entry point
├── android/             # Capacitor Android platform
├── public/              # Static assets
├── capacitor.config.json # Capacitor configuration
└── vite.config.js       # Vite configuration
```

### Troubleshooting

**Java Version Compatibility**
- Ensure you have JDK 21 (not JRE) installed
- Verify `gradle.properties` points to the correct JDK path

**AndroidX Dependencies**
- Make sure `android.useAndroidX=true` is set in `gradle.properties`

**SDK Location Not Found**
- Create `android/local.properties` with your Android SDK path
- The file should contain: `sdk.dir=/path/to/your/Android/Sdk`

### Learn More

- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Quasar Documentation](https://quasar.dev/)
- [Capacitor Documentation](https://capacitorjs.com/)
