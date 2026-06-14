# Adaptive TDEE Tracker

A mobile application that helps you track your calories and weight to calculate your Total Daily Energy Expenditure (TDEE) and provides personalized calorie estimates to reach your target weight or maintain your current weight.

## Project Overview

The Adaptive TDEE Tracker is a Vue 3-based mobile application that implements an adaptive TDEE calculation system. It tracks your daily calorie intake and weight changes over time, then uses this data to calculate your actual TDEE and provide accurate calorie estimates.

**Key Features:**
- **Daily Tracking**: Log your weight and calorie intake each day
- **Adaptive TDEE Calculation**: Automatically calculates your TDEE based on your actual data
- **Startup Activity Helper (Optional)**: Temporarily guides early estimates with an activity-based baseline while log history is still short
- **Goal-Oriented Estimates**: Get personalized calorie targets to reach your goal weight
- **Weight Trend Analysis**: View statistics and trends over time
- **Optional Food Diary**: Keep per-day meal rows by section
- **Suggestions Library**: Reuse common foods with section-aware ranking and search
- **Offline-First by Default**: Core tracker/diary data stays local; optional AI recognition sends request data to OpenAI when enabled

**Current Status:**
- Supports both metric and imperial units via improved units mode
- Unit-aware conversions/entry are applied across profile, logs, and diary/suggestions
- Improved units mode supports common serving inputs such as servings, tsp, tbsp, cups, and similar household units

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
   - View your estimated daily calorie target
   - Optionally review/collapse the per-day diary summary and commit diary calories via **Mark Day Complete**

3. **Monitor Progress**: Check the Statistics view to:
   - See your weight trends over time
   - Review weekly averages and changes
   - Track your progress toward your goal

4. **Optional Food Diary (Enable in Settings)**:
   - Enable **Food Diary** in Settings (disabled by default)
   - Open the Diary screen from Tracker summary
   - Add/edit inline rows per section (`Breakfast`, `Lunch`, `Dinner`, `Snacks`, or unsectioned)
   - Sections can be closed per day; closed sections keep consumed calories as fixed and the remaining budget is redistributed across still-open sections
   - Daily diary budget snapshots are stored (TDEE/rate/total budget/section percentages) so historical days keep their original targets even after later settings changes
   - Legacy section names from older entries are preserved for historical display and import compatibility
   - Each row supports:
     - Name
     - Amount
     - Calories
     - Optional density mode (`kcal/100g` or `100g/kcal`, depending on units mode) for auto-calculation from entered amounts
   - Use **Load Suggestions** to quickly reuse foods

5. **Suggestions Library**:
   - Open from footer (restaurant icon) when diary is enabled
   - Search by name
   - Edit/delete suggestions
   - Suggestions persist independently from diary rows
   - Ranking in diary picker balances:
     - section-specific usage,
     - overall frequency,
     - recency of use,
     - recency of update

### Suggestion Table

The Suggestions screen uses a table-based editor for reusable foods.

- Columns include:
  - Name
  - Amount
  - Calories
  - density mode fields (`kcal/100g` / `100g/kcal` nomenclature in improved units mode)
  - Notes
  - Tags
- Typical actions:
  - Add a new suggestion row
  - Edit values inline
  - Save or delete a suggestion
- The same suggestion data is available from the Diary suggestion picker to quickly insert foods into a selected section/day.

6. **Experimental AI Recognition (Enable in Settings)**:
   - Enable **Activate experimental AI meal recognition** in Settings
   - Add your own OpenAI API key in Settings (stored locally on device)
   - AI buttons are shown only when the experimental toggle is enabled
   - Images are compressed/resized client-side before request and are not persisted
   - The user always reviews/edits before saving; AI never auto-saves entries

7. **Import / Export Backups**:
   - Open **Settings → Open Import / Export**
   - **Export**:
     - Default behavior exports all sections into one JSON backup file
     - You can optionally export only selected sections:
       - Profile & core settings
       - Logs
       - Food Diary
       - Food Suggestions
   - **Import**:
     - Select a JSON backup file and choose which sections to import
     - Only selected sections are replaced; unselected sections stay unchanged
   - **On Android (Capacitor)**:
     - Export writes a temporary file and opens the native share sheet
     - You choose where to save/send the JSON (Downloads, Drive, mail, etc.)
   - Backups are local files and can be used to move data between devices

8. **CSV Export for Spreadsheet Comparison**:
   - Convert a JSON backup to a spreadsheet-friendly CSV:
     ```bash
     npm run export:sheet-csv -- --input tdee-backup-YYYY-MM-DD.json
     ```
   - Optional output filename:
     ```bash
     npm run export:sheet-csv -- --input tdee-backup-YYYY-MM-DD.json --output my-log.csv
     ```
   - The CSV can be pasted into a widely used adaptive TDEE tracker spreadsheet template to compare in-app estimates with spreadsheet estimates.

### Experimental AI Flows

- **Diary AI (Recognize Meal)**:
  - Opens from Diary via the `Recognize Meal` button
  - Returns up to 4 guesses with:
    - meal name
    - calorie range (`low`, `estimate`, `high`)
    - confidence (`low`, `medium`, `high`)
  - You select a guess, edit name/calories, then confirm save to diary

- **Suggestions AI (AI Add)**:
  - Opens from Suggestions via the `AI Add` button
  - Designed for reusable products/foods, including generic packaged items
  - Includes **Nutrition label mode** for label-focused recognition
  - You can manually edit:
    - name
    - amount
    - calories
    - density mode (`kcal/100g` or `100g/kcal`, depending on units mode)
  - Final save adds to Suggestions, not directly to Diary

- **Demo Mode**:
  - If experimental AI is enabled but no API key is set, the app returns a clearly-marked mock demo response for testing the UI flow.

- **Privacy and Scope**:
  - No image is stored in persistent app state or diary entries
  - If you configure an OpenAI API key, request payloads are sent to OpenAI for processing
  - OpenAI may retain/store submitted data according to your OpenAI account settings and OpenAI policies
  - Feature is experimental and intended as a speed/orientation aid
  - Calorie-only focus (no macro tracking)

### Tips for Best Results

- **Consistency is Key**: Log your data daily for the most accurate TDEE calculations
- **Weigh at the Same Time**: Weight fluctuates throughout the day; weigh yourself at the same time daily (preferably in the morning)
- **Be Patient**: The TDEE calculation becomes more accurate as you accumulate more data
- **Track Honestly**: Accurate calorie logging leads to accurate estimates

## TDEE Model Behavior

The app uses a trend-based logged maintenance model with optional manual blending:

- **Log-based maintenance (default)**:
  - Uses complete daily logs (weight + calories) to estimate maintenance from average intake and weight-change slope.
  - Weekly maintenance values are smoothed across recent weeks.
  - With no usable logs, the app falls back to a start-weight-based estimate.
- **Optional activity-based blending (manual)**:
  - In Settings, you can enable activity-based maintenance (`very low` to `very high`) derived from Mifflin-St Jeor + activity multiplier.
  - You control the blend explicitly with **Startup blend** (`0..1`):
    - `0` = log-based only
    - `1` = activity-based only
  - There is no automatic observation ramp, startup cap, or automatic fade-out weighting.

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

The static website output is written to `dist/`.

#### Build for a Subdirectory

For a subdomain or domain root, the default build is correct:

```bash
npm run build
```

For a subdirectory, set the public base path with a leading and trailing slash:

```bash
VITE_BASE_PATH=/tdee/ npm run build
```

Deploy the generated `dist/` directory at that same path.

### PWA Website Deployment

The web build includes:

- `public/manifest.webmanifest` for Android/iOS install metadata
- install icons in `public/icons/`
- `public/sw.js` service worker for app-shell and static asset caching
- iOS home screen metadata in `index.html`

Requirements:

- Serve over HTTPS. Browsers generally require HTTPS for service workers and installable PWAs.
- Keep the service worker at the deployed app root. For `/tdee/`, it must be available as `/tdee/sw.js`.
- Use an HTML fallback for Vue Router history routes.
- AI meal recognition remains an online feature because external API requests are not cached.

Example nginx config for a subdomain or domain root:

```nginx
server {
    listen 443 ssl http2;
    server_name tdee.example.com;
    root /var/www/tdee/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /sw.js {
        add_header Cache-Control "no-cache";
        try_files $uri =404;
    }

    location = /manifest.webmanifest {
        default_type application/manifest+json;
        try_files $uri =404;
    }
}
```

Example nginx config for a subdirectory at `/tdee/` with `dist/` copied to `/var/www/site/tdee/`:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    root /var/www/site;
    index index.html;

    location /tdee/ {
        try_files $uri $uri/ /tdee/index.html;
    }

    location = /tdee/sw.js {
        add_header Cache-Control "no-cache";
        try_files $uri =404;
    }

    location = /tdee/manifest.webmanifest {
        default_type application/manifest+json;
        try_files $uri =404;
    }
}
```

On Android, open the HTTPS site in Chrome and use the install prompt or **Add to Home screen**. On iOS/iPadOS, open it in Safari and use **Share -> Add to Home Screen**.

#### Run Tests

```bash
npm run test:tdee
npm run test:ai-meal-recognition
```

What these tests currently cover:
- `test:tdee`
- Logged maintenance calculations from weekly weight/calorie trends
- Weekly smoothing behavior across tracked weeks
- Long-gap epoch reset behavior
- Deterministic output for the same final log dataset
- `test:ai-meal-recognition`
- OpenAI request includes structured JSON schema response format
- Provider fallback path can parse sanitized JSON text output
- Malformed provider text output is rejected with a clear error
- Structured provider output with unusable guesses is rejected

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

#### 4. Build the APK (recommended)

Use the project script:

```bash
npm run build:android
```

This script does:
- `npm run build`
- `npx cap sync android`
- `cd android && ./gradlew assembleDebug`

Before building, it checks for:
- `npm` and `npx`
- `java`
- Android SDK via `ANDROID_HOME` or `ANDROID_SDK_ROOT` (with `platform-tools/adb`)
- executable `android/gradlew`

If something is missing, it stops and prints an overview setup checklist.

#### 5. App Versioning Strategy

Android app versioning is derived from `package.json` during `npm run build:android` / `npm run build:android:release`:

- `versionName` = exact `package.json` version (for example `1.4.2`)
- `versionCode` = numeric SemVer mapping: `major * 10000 + minor * 100 + patch`
  - Example: `1.4.2` -> `10402`

For every new app release:

1. Update the app version in `package.json` (`major.minor.patch`).
2. Commit the version change.
3. Build debug/release APK. The build script updates Android `versionName` and `versionCode` after Capacitor sync.

#### 6. Build the APK (manual equivalent)

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

#### 7. Build Release APK (for Production)

First, generate a signing key:
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Configure signing in `android/app/build.gradle`, then build:
```bash
npm run build:android:release

# manual equivalent:
cd android
./gradlew assembleRelease
```

The release APK will be located at:
```
android/app/build/outputs/apk/release/app-release.apk
```

#### 8. Publish Versioned APK on GitHub Releases (manual release is fine)

1. Ensure `package.json` version matches the app version you want to publish.
2. Build the release APK (`npm run build:android:release`).
3. Create and push a git tag that matches the version:
```bash
git add package.json package-lock.json scripts/build-android.js README.md
git commit -m "release: v1.2.3"
git tag v1.2.3
git push origin main --tags
```
4. In GitHub: `Releases` -> `Draft a new release`.
5. Select tag `v1.2.3`, title it `v1.2.3`, add release notes.
6. Upload `android/app/build/outputs/apk/release/app-release.apk` as a release asset.
7. Publish release.

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
│   ├── views/           # Page views (Settings, Tracker, Statistics, Diary, Suggestions, DataTransfer)
│   ├── components/      # Reusable UI components (e.g. calorie budget bar)
│   ├── services/        # Service layer (e.g. AI meal recognition providers)
│   ├── router/          # Vue Router configuration
│   ├── stores/          # Pinia stores
│   ├── utils/           # Utility functions (adaptive TDEE + test script)
│   ├── App.vue          # Root component
│   └── main.js          # Application entry point
├── android/             # Capacitor Android platform
├── public/              # Static assets
├── capacitor.config.json # Capacitor configuration
├── package.json         # Scripts (including `test:tdee`)
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
