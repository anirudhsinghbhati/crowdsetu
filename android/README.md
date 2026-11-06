# CrowdSetu — Android Checkpoint Scanner

The official Android mobile application for **CrowdSetu**, designed for field security personnel and checkpoint operators at Indian pilgrimage sites (e.g., Somnath, Kedarnath).

Operators use this handheld terminal to scan pilgrim QR slips, verify credentials, monitor real-time flow (`IN` vs `OUT`), and operate completely offline during network dropouts with automatic background sync.

---

## Key Features

* **360x800 Mobile Dark UI**: Built with Jetpack Compose using strict CrowdSetu design tokens (`#14181F` background, `#1D232D` surface, `#2B3340` border, `#E8962E` saffron accent).
* **Offline-First Architecture**:
  * Operators can sign in and scan continuously even without cellular or Wi-Fi connectivity.
  * Scans are stored locally with status `PENDING` in an ACID SQLite database.
  * Automatic background sync attempts as soon as network connectivity is restored.
* **Instant QR Code Verification**:
  * Real-time camera viewfinder powered by **CameraX** and **Google ML Kit Barcode Scanning**.
  * Viewfinder with targeting corner brackets and animated scanning laser.
  * Validates HMAC-SHA256 signature format (`${token}.${sig}`).
  * Duplicate scan detection prevents double-entry at checkpoints.
* **Visual & Haptic Feedback**:
  * **Success**: Green flash overlay + checkmark icon + single haptic pulse.
  * **Duplicate**: Yellow border + "Already scanned" warning + double haptic pulse.
  * **Invalid**: Red border + "Not a CrowdSetu code" alert + long error vibration.
* **Sync Status & Queue Inspector**:
  * Live sync queue banner (`"12 scans pending sync"`).
  * Detailed inspection screen with `"Sync now"` manual trigger, last sync timestamp, and per-scan audit timeline.

---

## Screen Flow

1. **Login Screen (`/login`)**:
   * Username / password authentication.
   * Quick-fill demo credentials (`operator`, `admin`).
   * Cached credentials for offline sign-in.
   * Clear advisory: *"Works without internet after first sign in. Scans are saved securely on this device and will sync automatically."*

2. **Pick Checkpoint Screen (`/checkpoint`)**:
   * Selection of duty post (e.g. `Main Gate Scanner A`, `Ghat Barricade Scanner`, `Sanctum Security Check`, `Exit Gate Scanner`).
   * Large segmented toggle: `IN` (green) | `OUT` (blue).
   * Remembers operator selection across sessions.

3. **Live Scanner Screen (`/scanner`)**:
   * Full-screen camera preview with square targeting viewfinder.
   * Top bar: checkpoint title, direction badge, online/offline cloud indicator, and flashlight toggle.
   * Built-in simulated scan buttons for testing without physical paper slips or camera.
   * Bottom sheet showing scan result and pending sync banner.

4. **Sync Status Screen (`/sync`)**:
   * Overview card: `"All synced"` (green) or `"X pending sync"` (saffron).
   * `"Sync now"` action to push batch scans to `POST /api/pilgrims/scans`.
   * Scrollable audit list of all local scans.

---

## Tech Stack & Architecture

* **Language**: Kotlin 2.0
* **UI**: Jetpack Compose + Material 3
* **Camera & ML**: CameraX 1.4.0 + ML Kit Barcode Scanning 17.3.0
* **Local Persistence**: SQLiteOpenHelper with ACID transactions
* **Networking**: Retrofit 2 + OkHttp 3 + Gson
* **Architecture**: MVVM (Model-View-ViewModel) + Repository Pattern + StateFlow

---

## Directory Structure

```
android/
├── app/
│   ├── build.gradle.kts       # App module configuration & dependencies
│   ├── proguard-rules.pro     # Production obfuscation rules
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml
│       │   ├── java/org/crowdsetu/scanner/
│       │   │   ├── CrowdSetuApp.kt            # Application container
│       │   │   ├── MainActivity.kt            # Single Activity & Compose navigation
│       │   │   ├── data/
│       │   │   │   ├── api/
│       │   │   │   │   ├── CrowdSetuApi.kt    # Retrofit REST interface
│       │   │   │   │   └── NetworkClient.kt   # OkHttp client with auth interceptor
│       │   │   │   ├── local/
│       │   │   │   │   ├── LocalDatabase.kt   # SQLite scan queue storage
│       │   │   │   │   └── UserPreferences.kt # SharedPreferences session storage
│       │   │   │   ├── model/
│       │   │   │   │   └── Models.kt          # DTOs & scan states
│       │   │   │   └── repository/
│       │   │   │       ├── AuthRepository.kt
│       │   │   │       ├── CheckpointRepository.kt
│       │   │   │       └── ScanRepository.kt  # Offline queue & validation
│       │   │   └── ui/
│       │   │       ├── components/
│       │   │       │   └── Common.kt          # Reusable 56px touch controls & chips
│       │   │       ├── screens/
│       │   │       │   ├── CheckpointScreen.kt
│       │   │       │   ├── LoginScreen.kt
│       │   │       │   ├── ScannerScreen.kt
│       │   │       │   └── SyncStatusScreen.kt
│       │   │       ├── theme/
│       │   │       │   ├── Color.kt           # CrowdSetu color tokens
│       │   │       │   └── Theme.kt           # Dark theme configuration
│       │   │       └── viewmodel/
│       │   │           ├── AuthViewModel.kt
│       │   │           ├── CheckpointViewModel.kt
│       │   │           ├── ScannerViewModel.kt
│       │   │           └── SyncViewModel.kt
│       │   └── res/                           # Values, drawables & mipmaps
│       └── test/                              # Unit tests (QR validation)
├── build.gradle.kts           # Root build configuration
├── settings.gradle.kts        # Root Gradle settings
├── gradle.properties          # JVM & AndroidX settings
├── local.properties           # SDK location
└── README.md
```

---

## Building and Running

### 1. Open in Android Studio
1. Open Android Studio.
2. Select **Open** and choose the `android` directory (`d:\Projects\crowdsetu\android`).
3. Sync Gradle and run on an Android Device or Emulator (API 26+).

### 2. Connecting to Local FastAPI Backend
* **On Android Emulator**:
  The default base URL is `http://10.0.2.2:8000` which maps directly to `http://localhost:8000` on the host machine running the backend.
* **On Physical Android Device**:
  Connect your phone to the same local Wi-Fi network and update the base URL in `UserPreferences` or `.env` to your computer's local IP address (e.g. `http://192.168.1.X:8000`).

---

## Offline Verification Test

1. Launch the app and sign in with `operator` / `demo123`.
2. Select **Sanctum Security Check** with direction **IN** and tap **Start scanning**.
3. Turn on Airplane mode (disable Wi-Fi and mobile data).
4. Tap the simulated scan button `TK-7842`. Notice the green tick, local scan time, and the bottom banner updating to `"1 scan pending sync"`.
5. Tap the same button again. Notice the yellow warning `"Already scanned"` preventing duplicate entry.
6. Turn off Airplane mode (re-enable network) and open the **Sync Status** screen.
7. Tap **Sync now**. The app automatically pushes the pending queue to the backend and the status updates to `"All synced"`.

