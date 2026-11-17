package org.crowdsetu.scanner.data.repository

import org.crowdsetu.scanner.data.api.NetworkClient
import org.crowdsetu.scanner.data.local.UserPreferences
import org.crowdsetu.scanner.data.model.AuthResponse
import org.crowdsetu.scanner.data.model.LoginRequest

class AuthRepository(
    private val networkClient: NetworkClient,
    private val userPreferences: UserPreferences
) {

    suspend fun login(username: String, password: String): Result<AuthResponse> {
        val cleanUser = username.trim()
        val cleanPass = password.trim()

        return try {
            val response = networkClient.getApi().login(LoginRequest(cleanUser, cleanPass))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                userPreferences.authToken = body.token
                userPreferences.username = body.username
                userPreferences.userRole = body.role
                Result.success(body)
            } else {
                // If offline or failed, check if user had previously authenticated
                if (userPreferences.authToken != null && userPreferences.username?.equals(cleanUser, ignoreCase = true) == true) {
                    Result.success(AuthResponse(userPreferences.authToken!!, userPreferences.userRole ?: "operator", cleanUser))
                } else {
                    Result.failure(Exception("Invalid username or password"))
                }
            }
        } catch (e: Exception) {
            // Offline fallback: allow login if credentials match cached session
            if (userPreferences.authToken != null && userPreferences.username?.equals(cleanUser, ignoreCase = true) == true) {
                Result.success(AuthResponse(userPreferences.authToken!!, userPreferences.userRole ?: "operator", cleanUser))
            } else {
                Result.failure(Exception("Cannot connect to server. Offline login requires previous sign-in on this device."))
            }
        }
    }

    fun logout() {
        userPreferences.clearSession()
    }

    fun getServerUrl(): String = userPreferences.baseUrl

    fun setServerUrl(url: String) {
        userPreferences.baseUrl = url.trim()
    }

    suspend fun testConnection(): Result<String> {
        return try {
            val response = networkClient.getApi().checkHealth()
            if (response.isSuccessful) {
                Result.success("Connected to CrowdSetu Backend (${userPreferences.baseUrl})")
            } else {
                Result.failure(Exception("HTTP ${response.code()}: Server returned error"))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Cannot reach ${userPreferences.baseUrl} (${e.localizedMessage ?: "Connection refused"})"))
        }
    }
}

