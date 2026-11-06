package org.crowdsetu.scanner.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.crowdsetu.scanner.ui.components.CrowdSetuButton
import org.crowdsetu.scanner.ui.components.DirectionSegmentedToggle
import org.crowdsetu.scanner.ui.theme.*
import org.crowdsetu.scanner.ui.viewmodel.CheckpointViewModel

@Composable
fun CheckpointScreen(
    viewModel: CheckpointViewModel,
    onStartScanning: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(20.dp)
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Select checkpoint",
            color = TextPrimary,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Choose your assigned duty post and movement direction.",
            color = TextMuted,
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 4.dp, bottom = 20.dp)
        )

        // Checkpoints List
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(uiState.checkpoints) { checkpoint ->
                val isSelected = checkpoint.id == uiState.selectedCheckpointId
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (isSelected) AccentSaffron.copy(alpha = 0.12f) else DarkPanel)
                        .border(
                            1.dp,
                            if (isSelected) AccentSaffron else DarkBorder,
                            RoundedCornerShape(10.dp)
                        )
                        .clickable { viewModel.selectCheckpoint(checkpoint) }
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(if (isSelected) AccentSaffron else DarkBorder),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isSelected) Icons.Default.Check else Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = if (isSelected) DarkBackground else TextMuted,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = checkpoint.name,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                        Text(
                            text = "Zone ${checkpoint.zoneId} · ${checkpoint.zoneName}",
                            color = TextMuted,
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Large IN | OUT Segmented Toggle
        Text(
            text = "Movement Direction",
            color = TextMuted,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        DirectionSegmentedToggle(
            selectedDirection = uiState.selectedDirection,
            onDirectionSelected = { viewModel.selectDirection(it) }
        )

        Spacer(modifier = Modifier.height(20.dp))

        // Bottom Button "Start scanning"
        CrowdSetuButton(
            text = "Start scanning",
            onClick = {
                viewModel.saveAndStart()
                onStartScanning()
            }
        )
    }
}

