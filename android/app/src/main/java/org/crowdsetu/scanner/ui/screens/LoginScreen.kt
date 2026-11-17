package org.crowdsetu.scanner.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.crowdsetu.scanner.ui.components.CrowdSetuButton
import org.crowdsetu.scanner.ui.theme.*
import org.crowdsetu.scanner.ui.viewmodel.AuthViewModel

@Composable
fun LoginScreen(
    viewModel: AuthViewModel,
    onLoginSuccess: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var passwordVisible by remember { mutableStateOf(false) }
    var showServerDialog by remember { mutableStateOf(false) }

    LaunchedEffect(uiState.isLoginSuccessful) {
        if (uiState.isLoginSuccessful) {
            onLoginSuccess()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .statusBarsPadding()
            .padding(horizontal = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(24.dp))

            // Top Server Indicator & Settings Button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(DarkPanel)
                    .border(1.dp, DarkBorder, RoundedCornerShape(8.dp))
                    .clickable { showServerDialog = true }
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Dns,
                        contentDescription = "Server",
                        tint = if (uiState.isServerConnected == true) StatusGreen else AccentSaffron,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = "Server Endpoint",
                            fontSize = 10.sp,
                            color = TextMuted
                        )
                        Text(
                            text = uiState.serverUrl.ifBlank { "Not configured" },
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextPrimary
                        )
                    }
                }

                Text(
                    text = "Configure",
                    fontSize = 12.sp,
                    color = AccentSaffron,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(28.dp))

            // App Emblem
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(DarkPanel)
                    .border(1.dp, DarkBorder, RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.QrCodeScanner,
                    contentDescription = null,
                    tint = AccentSaffron,
                    modifier = Modifier.size(36.dp)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = "CrowdSetu",
                color = TextPrimary,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Checkpoint Scanner",
                color = TextMuted,
                fontSize = 14.sp
            )

            Spacer(modifier = Modifier.height(28.dp))

            // Username Field
            OutlinedTextField(
                value = uiState.username,
                onValueChange = { viewModel.onUsernameChange(it) },
                label = { Text("Username", color = TextMuted) },
                leadingIcon = {
                    Icon(Icons.Default.Person, contentDescription = null, tint = TextMuted)
                },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedContainerColor = DarkPanel,
                    unfocusedContainerColor = DarkPanel,
                    focusedBorderColor = AccentSaffron,
                    unfocusedBorderColor = DarkBorder,
                    cursorColor = AccentSaffron
                ),
                shape = RoundedCornerShape(8.dp)
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Password Field
            OutlinedTextField(
                value = uiState.password,
                onValueChange = { viewModel.onPasswordChange(it) },
                label = { Text("Password", color = TextMuted) },
                leadingIcon = {
                    Icon(Icons.Default.Lock, contentDescription = null, tint = TextMuted)
                },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                            contentDescription = null,
                            tint = TextMuted
                        )
                    }
                },
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedContainerColor = DarkPanel,
                    unfocusedContainerColor = DarkPanel,
                    focusedBorderColor = AccentSaffron,
                    unfocusedBorderColor = DarkBorder,
                    cursorColor = AccentSaffron
                ),
                shape = RoundedCornerShape(8.dp)
            )

            // Quick demo credentials
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Quick Demo:",
                    color = TextMuted,
                    fontSize = 12.sp
                )
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(DarkPanel)
                        .border(1.dp, DarkBorder, RoundedCornerShape(4.dp))
                        .clickable { viewModel.fillDemoCredentials("operator") }
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text("operator", color = AccentSaffron, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(DarkPanel)
                        .border(1.dp, DarkBorder, RoundedCornerShape(4.dp))
                        .clickable { viewModel.fillDemoCredentials("admin") }
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text("admin", color = TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            // Error banner
            if (uiState.errorMessage != null) {
                Spacer(modifier = Modifier.height(14.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(StatusRed.copy(alpha = 0.15f))
                        .border(1.dp, StatusRed.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                        .padding(12.dp)
                ) {
                    Text(
                        text = uiState.errorMessage!!,
                        color = StatusRed,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Sign In Button
            CrowdSetuButton(
                text = if (uiState.isLoading) "Signing in..." else "Sign in",
                onClick = { viewModel.login() },
                enabled = !uiState.isLoading
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Offline Note
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(DarkPanel)
                    .border(1.dp, DarkBorder, RoundedCornerShape(8.dp))
                    .padding(12.dp)
            ) {
                Text(
                    text = "Works without internet after first sign in. Scans are saved securely on this device and will sync automatically.",
                    color = TextMuted,
                    fontSize = 11.sp,
                    lineHeight = 15.sp
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }

        // Server URL Configuration Dialog
        if (showServerDialog) {
            AlertDialog(
                onDismissRequest = { showServerDialog = false },
                title = {
                    Text("Backend Server URL", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "Set the IP address of your PC running FastAPI. Both phone and PC must be on the same Wi-Fi / hotspot network.",
                            color = TextMuted,
                            fontSize = 12.sp
                        )

                        OutlinedTextField(
                            value = uiState.serverUrl,
                            onValueChange = { viewModel.onServerUrlChange(it) },
                            label = { Text("Base URL", color = TextMuted) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = AccentSaffron,
                                unfocusedBorderColor = DarkBorder,
                                cursorColor = AccentSaffron
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        // Quick Presets
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Button(
                                onClick = { viewModel.onServerUrlChange("http://10.127.57.212:8000") },
                                colors = ButtonDefaults.buttonColors(containerColor = DarkBorder),
                                shape = RoundedCornerShape(6.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                modifier = Modifier.height(28.dp)
                            ) {
                                Text("Your Wi-Fi IP", fontSize = 10.sp, color = TextPrimary)
                            }

                            Button(
                                onClick = { viewModel.onServerUrlChange("http://10.0.2.2:8000") },
                                colors = ButtonDefaults.buttonColors(containerColor = DarkBorder),
                                shape = RoundedCornerShape(6.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                modifier = Modifier.height(28.dp)
                            ) {
                                Text("Emulator", fontSize = 10.sp, color = TextPrimary)
                            }
                        }

                        // Test Connection Result
                        if (uiState.serverTestMessage != null) {
                            val isOk = uiState.isServerConnected == true
                            Text(
                                text = uiState.serverTestMessage!!,
                                color = if (isOk) StatusGreen else StatusRed,
                                fontSize = 11.sp,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = { showServerDialog = false },
                        colors = ButtonDefaults.buttonColors(containerColor = AccentSaffron)
                    ) {
                        Text("Done", color = DarkBackground, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(
                        onClick = { viewModel.testServer() },
                        enabled = !uiState.isTestingServer
                    ) {
                        Text(
                            text = if (uiState.isTestingServer) "Testing..." else "Test Connection",
                            color = AccentSaffron
                        )
                    }
                },
                containerColor = DarkPanel
            )
        }
    }
}
