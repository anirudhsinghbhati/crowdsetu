package org.crowdsetu.scanner.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.crowdsetu.scanner.data.model.Checkpoint
import org.crowdsetu.scanner.data.repository.CheckpointRepository

data class CheckpointUiState(
    val checkpoints: List<Checkpoint> = emptyList(),
    val selectedCheckpointId: Int = 1,
    val selectedCheckpointName: String = "",
    val selectedDirection: String = "IN",
    val isLoading: Boolean = false
)

class CheckpointViewModel(
    private val checkpointRepository: CheckpointRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        CheckpointUiState(
            selectedCheckpointId = checkpointRepository.getSavedCheckpointId(),
            selectedCheckpointName = checkpointRepository.getSavedCheckpointName(),
            selectedDirection = checkpointRepository.getSavedDirection()
        )
    )
    val uiState: StateFlow<CheckpointUiState> = _uiState.asStateFlow()

    init {
        loadCheckpoints()
    }

    fun loadCheckpoints() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val list = checkpointRepository.getCheckpoints()
            val currentId = _uiState.value.selectedCheckpointId
            val matched = list.find { it.id == currentId } ?: list.firstOrNull()

            _uiState.update {
                it.copy(
                    checkpoints = list,
                    selectedCheckpointId = matched?.id ?: 1,
                    selectedCheckpointName = matched?.name ?: "Main Gate Scanner A",
                    isLoading = false
                )
            }
        }
    }

    fun selectCheckpoint(checkpoint: Checkpoint) {
        _uiState.update {
            it.copy(
                selectedCheckpointId = checkpoint.id,
                selectedCheckpointName = checkpoint.name
            )
        }
    }

    fun selectDirection(direction: String) {
        _uiState.update { it.copy(selectedDirection = direction) }
    }

    fun saveAndStart() {
        checkpointRepository.saveSelection(
            checkpointId = _uiState.value.selectedCheckpointId,
            checkpointName = _uiState.value.selectedCheckpointName,
            direction = _uiState.value.selectedDirection
        )
    }
}

