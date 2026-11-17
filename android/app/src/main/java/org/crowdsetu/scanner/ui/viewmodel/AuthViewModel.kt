package org.crowdsetu.scanner.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.crowdsetu.scanner.data.repository.AuthRepository

data class AuthUiState(
    val username: String = "",
    val password: String = "",
    val serverUrl: String = "",
    val isLoading: Boolean = false,
    val isTestingServer: Boolean = false,
    val serverTestMessage: String? = null,
    val isServerConnected: Boolean? = null,
    val errorMessage: String? = null,
    val isLoginSuccessful: Boolean = false
)

class AuthViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        AuthUiState(serverUrl = authRepository.getServerUrl())
    )
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun onUsernameChange(value: String) {
        _uiState.update { it.copy(username = value, errorMessage = null) }
    }

    fun onPasswordChange(value: String) {
        _uiState.update { it.copy(password = value, errorMessage = null) }
    }

    fun onServerUrlChange(value: String) {
        _uiState.update { it.copy(serverUrl = value, serverTestMessage = null, isServerConnected = null) }
        authRepository.setServerUrl(value)
    }

    fun testServer() {
        viewModelScope.launch {
            _uiState.update { it.copy(isTestingServer = true, serverTestMessage = null) }
            val result = authRepository.testConnection()
            result.onSuccess { msg ->
                _uiState.update {
                    it.copy(
                        isTestingServer = false,
                        isServerConnected = true,
                        serverTestMessage = msg
                    )
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isTestingServer = false,
                        isServerConnected = false,
                        serverTestMessage = err.message ?: "Failed to connect to server"
                    )
                }
            }
        }
    }

    fun fillDemoCredentials(role: String) {
        when (role) {
            "operator" -> _uiState.update { it.copy(username = "operator", password = "demo123", errorMessage = null) }
            "admin" -> _uiState.update { it.copy(username = "admin", password = "admin123", errorMessage = null) }
            "viewer" -> _uiState.update { it.copy(username = "viewer", password = "demo123", errorMessage = null) }
        }
    }

    fun login() {
        val user = _uiState.value.username
        val pass = _uiState.value.password

        if (user.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please enter your username") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            val result = authRepository.login(user, pass)
            result.onSuccess {
                _uiState.update { it.copy(isLoading = false, isLoginSuccessful = true) }
            }.onFailure { err ->
                _uiState.update { it.copy(isLoading = false, errorMessage = err.message ?: "Authentication failed") }
            }
        }
    }
}
