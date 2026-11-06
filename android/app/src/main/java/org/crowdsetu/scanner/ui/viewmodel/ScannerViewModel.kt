package org.crowdsetu.scanner.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.crowdsetu.scanner.data.model.ScanResultState
import org.crowdsetu.scanner.data.repository.CheckpointRepository
import org.crowdsetu.scanner.data.repository.ScanRepository

data class ScannerUiState(
    val checkpointName: String = "",
    val direction: String = "IN",
    val isFlashlightOn: Boolean = false,
    val isOnline: Boolean = true,
    val pendingSyncCount: Int = 0,
    val scanResult: ScanResultState = ScanResultState.Idle,
    val isProcessingScan: Boolean = false
)

class ScannerViewModel(
    private val scanRepository: ScanRepository,
    private val checkpointRepository: CheckpointRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        ScannerUiState(
            checkpointName = checkpointRepository.getSavedCheckpointName(),
            direction = checkpointRepository.getSavedDirection(),
            pendingSyncCount = scanRepository.getPendingCount()
        )
    )
    val uiState: StateFlow<ScannerUiState> = _uiState.asStateFlow()

    init {
        refreshState()
    }

    fun refreshState() {
        _uiState.update {
            it.copy(
                checkpointName = checkpointRepository.getSavedCheckpointName(),
                direction = checkpointRepository.getSavedDirection(),
                pendingSyncCount = scanRepository.getPendingCount()
            )
        }
    }

    fun toggleFlashlight() {
        _uiState.update { it.copy(isFlashlightOn = !it.isFlashlightOn) }
    }

    fun setOnlineState(online: Boolean) {
        _uiState.update { it.copy(isOnline = online) }
    }

    fun onBarcodeScanned(rawCode: String) {
        if (_uiState.value.isProcessingScan) return

        viewModelScope.launch {
            _uiState.update { it.copy(isProcessingScan = true) }

            val result = scanRepository.processScan(
                rawCode = rawCode,
                checkpoint = _uiState.value.checkpointName,
                direction = _uiState.value.direction
            )

            _uiState.update {
                it.copy(
                    scanResult = result,
                    pendingSyncCount = scanRepository.getPendingCount(),
                    isProcessingScan = false
                )
            }

            // Auto-clear result after 3.5 seconds to return to scanning
            delay(3500)
            if (_uiState.value.scanResult == result) {
                _uiState.update { it.copy(scanResult = ScanResultState.Idle) }
            }
        }
    }

    fun clearResult() {
        _uiState.update { it.copy(scanResult = ScanResultState.Idle) }
    }
}

