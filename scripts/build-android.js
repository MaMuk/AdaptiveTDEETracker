import { spawnSync } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const androidDir = path.join(projectRoot, 'android')
const gradlewPath = path.join(androidDir, 'gradlew')

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: projectRoot,
    shell: false,
    ...options
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

function canExecute(command, args = ['--version']) {
  const result = spawnSync(command, args, { stdio: 'ignore', shell: false })
  if (result.error) return false
  return result.status === 0
}

function hasExecutableFile(filePath) {
  try {
    accessSync(filePath, constants.X_OK)
    return true
  } catch {
    return false
  }
}

function androidSdkExists() {
  const envPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  if (!envPath) return false
  const adb = path.join(envPath, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')
  return hasExecutableFile(adb)
}

function printSetupInstructions(missing) {
  console.error('\nAndroid build prerequisites are missing:\n')
  for (const item of missing) {
    console.error(`- ${item}`)
  }

  console.error('\nOverview setup instructions:')
  console.error('1. Install Node.js + npm and run `npm install` in the project root if dependencies are missing.')
  console.error('2. Install Java (JDK 21 recommended for current Android Gradle plugin).')
  console.error('3. Install Android Studio and Android SDK (platform-tools + build-tools + one Android platform).')
  console.error('4. Set ANDROID_HOME or ANDROID_SDK_ROOT to your Android SDK path.')
  console.error('5. Ensure `android/gradlew` is executable (`chmod +x android/gradlew`).')
  console.error('6. Re-run `npm run build:android`.\n')
}

function verifyEnvironment() {
  const missing = []

  if (!canExecute('npm')) {
    missing.push('`npm` is not available in PATH.')
  }

  if (!canExecute('npx')) {
    missing.push('`npx` is not available in PATH.')
  }

  if (!canExecute('java', ['-version'])) {
    missing.push('`java` is not available in PATH.')
  }

  if (!androidSdkExists()) {
    missing.push('Android SDK not detected via ANDROID_HOME/ANDROID_SDK_ROOT with platform-tools (adb).')
  }

  if (!hasExecutableFile(gradlewPath)) {
    missing.push('`android/gradlew` is missing or not executable.')
  }

  if (missing.length > 0) {
    printSetupInstructions(missing)
    process.exit(1)
  }
}

function main() {
  verifyEnvironment()
  run('npm', ['run', 'build'])
  run('npx', ['cap', 'sync', 'android'])
  run('./gradlew', ['assembleDebug'], { cwd: androidDir })
}

main()
