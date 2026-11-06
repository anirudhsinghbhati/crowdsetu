package org.crowdsetu.scanner.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.crowdsetu.scanner.data.model.LocalScan
import org.crowdsetu.scanner.data.repository.ScanRepository

data class SyncUiState(
    val pendingCount: Int = 0,
    val lastSyncTime: String = "Never",
    val scans: List<LocalScan> = emptyList(),
    val isSyncing: Boolean = false,
    val feedbackMessage: String? = null
)

class SyncViewModel(
    private val scanRepository: ScanRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SyncUiState())
    val uiState: StateFlow<SyncUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        val count = scanRepository.getPendingCount()
        val list = scanRepository.getAllScans()
        val lastSync = scanRepository.getLastSyncTime()

        _uiState.update {
            it.copy(
                pendingCount = count,
                lastSyncTime = lastSync,
                scans = list,
                feedbackMessage = null
            )
        }
    }

    fun triggerSync() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSyncing = true, feedbackMessage = null) }
            val result = scanRepository.syncPendingScans()
            result.onSuccess { syncedCount ->
                _uiState.update {
                    it.copy(
                        isSyncing = false,
                        pendingCount = scanRepository.getPendingCount(),
                        lastSyncTime = scanRepository.getLastSyncTime(),
                        scans = scanRepository.getAllScans(),
                        feedbackMessage = if (syncedCount > 0) "Successfully synced $syncedCount scans" else "All scans already synced"
                    )
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isSyncing = false,
                        feedbackMessage = "Sync failed: ${err.message ?: "Server unreachable"}"
                    )
                }
            }
        }
    }
}

