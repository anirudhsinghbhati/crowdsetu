package org.crowdsetu.scanner.ui.screens

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import org.crowdsetu.scanner.data.model.ScanResultState
import org.crowdsetu.scanner.ui.components.StatusChip
import org.crowdsetu.scanner.ui.theme.*
import org.crowdsetu.scanner.ui.viewmodel.ScannerViewModel
import java.util.concurrent.Executors

@Composable
fun ScannerScreen(
    viewModel: ScannerViewModel,
    onBack: () -> Unit,
    onNavigateSync: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    // Trigger haptic vibration on scan state change
    LaunchedEffect(uiState.scanResult) {
        val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        when (uiState.scanResult) {
            is ScanResultState.Success -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(100)
                }
            }
            is ScanResultState.Duplicate, is ScanResultState.Invalid -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 100, 80, 100), -1))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(longArrayOf(0, 100, 80, 100), -1)
                }
            }
            else -> {}
        }
    }

    // Refresh pending count when entering
    LaunchedEffect(Unit) {
        viewModel.refreshState()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
    ) {
        // 1. Camera Viewfinder (with ML Kit Barcode Analyzer)
        var cameraBound by remember { mutableStateOf(false) }
        AndroidView(
            factory = { ctx ->
                val previewView = PreviewView(ctx)
                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                val cameraExecutor = Executors.newSingleThreadExecutor()
                val barcodeScanner = BarcodeScanning.getClient()

                cameraProviderFuture.addListener({
                    try {
                        val cameraProvider = cameraProviderFuture.get()
                        val preview = Preview.Builder().build().also {
                            it.setSurfaceProvider(previewView.surfaceProvider)
                        }

                        val imageAnalysis = ImageAnalysis.Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()

                        imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                            val mediaImage = imageProxy.image
                            if (mediaImage != null) {
                                val image = InputImage.fromMediaImage(
                                    mediaImage,
                                    imageProxy.imageInfo.rotationDegrees
                                )
                                barcodeScanner.process(image)
                                    .addOnSuccessListener { barcodes ->
                                        for (barcode in barcodes) {
                                            barcode.rawValue?.let { raw ->
                                                viewModel.onBarcodeScanned(raw)
                                            }
                                        }
                                    }
                                    .addOnCompleteListener {
                                        imageProxy.close()
                                    }
                            } else {
                                imageProxy.close()
                            }
                        }

                        val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
                        cameraProvider.unbindAll()
                        val camera = cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            cameraSelector,
                            preview,
                            imageAnalysis
                        )
                        camera.cameraControl.enableTorch(uiState.isFlashlightOn)
                        cameraBound = true
                    } catch (e: Exception) {
                        // In case of emulator without camera, safe fallback
                    }
                }, ContextCompat.getMainExecutor(ctx))

                previewView
            },
            modifier = Modifier.fillMaxSize()
        )

        // 2. Viewfinder Target Frame Overlay with animated laser
        val infiniteTransition = rememberInfiniteTransition(label = "laser")
        val laserPosition by infiniteTransition.animateFloat(
            initialValue = 0f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                animation = tween(1800, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "laser_y"
        )

        Canvas(modifier = Modifier.fillMaxSize()) {
            val canvasWidth = size.width
            val canvasHeight = size.height
            val frameSize = minOf(canvasWidth * 0.72f, 280.dp.toPx())
            val left = (canvasWidth - frameSize) / 2
            val top = (canvasHeight - frameSize) / 2 - 40.dp.toPx()

            // Dimmed background cutout
            drawRect(
                color = Color.Black.copy(alpha = 0.55f)
            )

            // Clear transparent center square
            drawRoundRect(
                color = Color.Transparent,
                topLeft = Offset(left, top),
                size = Size(frameSize, frameSize),
                cornerRadius = CornerRadius(16.dp.toPx()),
                blendMode = BlendMode.Clear
            )

            // Corner border brackets
            val cornerLen = 28.dp.toPx()
            val bracketColor = when (uiState.scanResult) {
                is ScanResultState.Success -> StatusGreen
                is ScanResultState.Duplicate -> StatusYellow
                is ScanResultState.Invalid -> StatusRed
                else -> AccentSaffron
            }

            // Top Left
            drawLine(bracketColor, Offset(left, top), Offset(left + cornerLen, top), strokeWidth = 4.dp.toPx())
            drawLine(bracketColor, Offset(left, top), Offset(left, top + cornerLen), strokeWidth = 4.dp.toPx())

            // Top Right
            drawLine(bracketColor, Offset(left + frameSize, top), Offset(left + frameSize - cornerLen, top), strokeWidth = 4.dp.toPx())
            drawLine(bracketColor, Offset(left + frameSize, top), Offset(left + frameSize, top + cornerLen), strokeWidth = 4.dp.toPx())

            // Bottom Left
            drawLine(bracketColor, Offset(left, top + frameSize), Offset(left + cornerLen, top + frameSize), strokeWidth = 4.dp.toPx())
            drawLine(bracketColor, Offset(left, top + frameSize), Offset(left, top + frameSize - cornerLen), strokeWidth = 4.dp.toPx())

            // Bottom Right
            drawLine(bracketColor, Offset(left + frameSize, top + frameSize), Offset(left + frameSize - cornerLen, top + frameSize), strokeWidth = 4.dp.toPx())
            drawLine(bracketColor, Offset(left + frameSize, top + frameSize), Offset(left + frameSize, top + frameSize - cornerLen), strokeWidth = 4.dp.toPx())

            // Animated Laser Line
            val laserY = top + (frameSize * laserPosition)
            drawLine(
                color = bracketColor.copy(alpha = 0.85f),
                start = Offset(left + 8.dp.toPx(), laserY),
                end = Offset(left + frameSize - 8.dp.toPx(), laserY),
                strokeWidth = 2.dp.toPx()
            )
        }

        // 3. Top Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(DarkPanel.copy(alpha = 0.8f))
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = TextPrimary)
                }

                Spacer(modifier = Modifier.width(10.dp))

                Column {
                    Text(
                        text = uiState.checkpointName,
                        color = TextPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        // Direction chip (IN green, OUT blue)
                        StatusChip(
                            text = uiState.direction,
                            color = if (uiState.direction == "IN") StatusGreen else StatusBlue
                        )
                        // Online / Offline Indicator
                        if (uiState.isOnline) {
                            Icon(Icons.Default.CloudDone, contentDescription = "Online", tint = StatusGreen, modifier = Modifier.size(16.dp))
                        } else {
                            Icon(Icons.Default.CloudOff, contentDescription = "Offline", tint = StatusGrey, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }

            // Flashlight Toggle
            IconButton(
                onClick = { viewModel.toggleFlashlight() },
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(if (uiState.isFlashlightOn) AccentSaffron else DarkPanel.copy(alpha = 0.8f))
            ) {
                Icon(
                    imageVector = if (uiState.isFlashlightOn) Icons.Default.FlashOn else Icons.Default.FlashOff,
                    contentDescription = "Flashlight",
                    tint = if (uiState.isFlashlightOn) DarkBackground else TextPrimary
                )
            }
        }

        // 4. Quick Testing Simulator Buttons (handy for emulator & quick checks)
        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .offset(y = 135.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Simulate Scan (Tap to test):",
                color = TextMuted,
                fontSize = 11.sp
            )
            Spacer(modifier = Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Button(
                    onClick = { viewModel.onBarcodeScanned("TK-7842.8f9c1a7d") },
                    colors = ButtonDefaults.buttonColors(containerColor = DarkPanel.copy(alpha = 0.85f)),
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                    modifier = Modifier.height(30.dp)
                ) {
                    Text("TK-7842", fontSize = 11.sp, color = StatusGreen)
                }
                Button(
                    onClick = { viewModel.onBarcodeScanned("TK-9102.3e5a7b1c") },
                    colors = ButtonDefaults.buttonColors(containerColor = DarkPanel.copy(alpha = 0.85f)),
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                    modifier = Modifier.height(30.dp)
                ) {
                    Text("TK-9102", fontSize = 11.sp, color = AccentSaffron)
                }
                Button(
                    onClick = { viewModel.onBarcodeScanned("INVALID-QR-CODE") },
                    colors = ButtonDefaults.buttonColors(containerColor = DarkPanel.copy(alpha = 0.85f)),
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                    modifier = Modifier.height(30.dp)
                ) {
                    Text("Invalid", fontSize = 11.sp, color = StatusRed)
                }
            }
        }

        // 5. Scan Result Bottom Sheet Overlay
        AnimatedVisibility(
            visible = uiState.scanResult !is ScanResultState.Idle,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 76.dp)
        ) {
            when (val res = uiState.scanResult) {
                is ScanResultState.Success -> {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkPanel),
                        border = androidx.compose.foundation.BorderStroke(1.5.dp, StatusGreen),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(StatusGreen.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = StatusGreen, modifier = Modifier.size(28.dp))
                            }
                            Spacer(modifier = Modifier.width(14.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = res.token,
                                        fontFamily = FontFamily.Monospace,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp,
                                        color = TextPrimary
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    StatusChip(text = res.direction, color = if (res.direction == "IN") StatusGreen else StatusBlue)
                                }
                                Text(
                                    text = "Scan recorded · ${res.time}",
                                    color = TextMuted,
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(top = 2.dp)
                                )
                            }
                            IconButton(onClick = { viewModel.clearResult() }) {
                                Icon(Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                            }
                        }
                    }
                }

                is ScanResultState.Duplicate -> {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkPanel),
                        border = androidx.compose.foundation.BorderStroke(1.5.dp, StatusYellow),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(StatusYellow.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Warning, contentDescription = null, tint = StatusYellow, modifier = Modifier.size(28.dp))
                            }
                            Spacer(modifier = Modifier.width(14.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Already scanned",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = StatusYellow
                                )
                                Text(
                                    text = "Token ${res.token} was previously scanned at ${res.lastScannedTime}",
                                    color = TextMuted,
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(top = 2.dp)
                                )
                            }
                            IconButton(onClick = { viewModel.clearResult() }) {
                                Icon(Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                            }
                        }
                    }
                }

                is ScanResultState.Invalid -> {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkPanel),
                        border = androidx.compose.foundation.BorderStroke(1.5.dp, StatusRed),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(StatusRed.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Error, contentDescription = null, tint = StatusRed, modifier = Modifier.size(28.dp))
                            }
                            Spacer(modifier = Modifier.width(14.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = res.reason,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = StatusRed
                                )
                                Text(
                                    text = "QR code does not match CrowdSetu signature format.",
                                    color = TextMuted,
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(top = 2.dp)
                                )
                            }
                            IconButton(onClick = { viewModel.clearResult() }) {
                                Icon(Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                            }
                        }
                    }
                }

                ScanResultState.Idle -> {}
            }
        }

        // 6. Bottom Banner: "12 scans pending sync"
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(DarkPanel)
                .border(1.dp, DarkBorder)
                .clickable { onNavigateSync() }
                .padding(horizontal = 20.dp, vertical = 14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = if (uiState.pendingSyncCount > 0) Icons.Default.Sync else Icons.Default.CloudDone,
                        contentDescription = null,
                        tint = if (uiState.pendingSyncCount > 0) AccentSaffron else StatusGreen,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = if (uiState.pendingSyncCount > 0)
                            "${uiState.pendingSyncCount} scans pending sync"
                        else
                            "All scans synced",
                        color = TextPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "View",
                        color = AccentSaffron,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Icon(
                        Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = AccentSaffron,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

