package org.crowdsetu.scanner

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import org.crowdsetu.scanner.ui.screens.CheckpointScreen
import org.crowdsetu.scanner.ui.screens.LoginScreen
import org.crowdsetu.scanner.ui.screens.ScannerScreen
import org.crowdsetu.scanner.ui.screens.SyncStatusScreen
import org.crowdsetu.scanner.ui.theme.CrowdSetuTheme
import org.crowdsetu.scanner.ui.theme.DarkBackground
import org.crowdsetu.scanner.ui.viewmodel.AuthViewModel
import org.crowdsetu.scanner.ui.viewmodel.CheckpointViewModel
import org.crowdsetu.scanner.ui.viewmodel.ScannerViewModel
import org.crowdsetu.scanner.ui.viewmodel.SyncViewModel

class MainActivity : ComponentActivity() {

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ ->
        // Camera permission result handled
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Request camera permission if not granted
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        }

        val app = application as CrowdSetuApp

        setContent {
            CrowdSetuTheme {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(DarkBackground)
                ) {
                    AppNavigation(app)
                }
            }
        }
    }
}

@Composable
fun AppNavigation(app: CrowdSetuApp) {
    val navController = rememberNavController()

    val authViewModel = remember { AuthViewModel(app.authRepository) }
    val checkpointViewModel = remember { CheckpointViewModel(app.checkpointRepository) }
    val scannerViewModel = remember { ScannerViewModel(app.scanRepository, app.checkpointRepository) }
    val syncViewModel = remember { SyncViewModel(app.scanRepository) }

    val startDestination = if (app.userPreferences.isLoggedIn) "checkpoint" else "login"

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable("login") {
            LoginScreen(
                viewModel = authViewModel,
                onLoginSuccess = {
                    navController.navigate("checkpoint") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }

        composable("checkpoint") {
            CheckpointScreen(
                viewModel = checkpointViewModel,
                onStartScanning = {
                    scannerViewModel.refreshState()
                    navController.navigate("scanner")
                }
            )
        }

        composable("scanner") {
            ScannerScreen(
                viewModel = scannerViewModel,
                onBack = { navController.popBackStack() },
                onNavigateSync = { navController.navigate("sync_status") }
            )
        }

        composable("sync_status") {
            SyncStatusScreen(
                viewModel = syncViewModel,
                onBack = { navController.popBackStack() }
            )
        }
    }
}

