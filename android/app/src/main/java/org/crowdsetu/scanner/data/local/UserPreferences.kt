package org.crowdsetu.scanner.data.local

import android.content.Context
import android.content.SharedPreferences

class UserPreferences(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("crowdsetu_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_TOKEN = "auth_token"
        private const val KEY_USERNAME = "username"
        private const val KEY_ROLE = "user_role"
        private const val KEY_CHECKPOINT_ID = "selected_checkpoint_id"
        private const val KEY_CHECKPOINT_NAME = "selected_checkpoint_name"
        private const val KEY_DIRECTION = "selected_direction"
        private const val KEY_LAST_SYNC = "last_sync_time"
        private const val KEY_BASE_URL = "api_base_url"
        const val DEFAULT_BASE_URL = "http://10.0.2.2:8000" // Standard emulator loopback to host FastAPI
    }

    var authToken: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_TOKEN, value).apply()

    var username: String?
        get() = prefs.getString(KEY_USERNAME, null)
        set(value) = prefs.edit().putString(KEY_USERNAME, value).apply()

    var userRole: String?
        get() = prefs.getString(KEY_ROLE, null)
        set(value) = prefs.edit().putString(KEY_ROLE, value).apply()

    var selectedCheckpointId: Int
        get() = prefs.getInt(KEY_CHECKPOINT_ID, 1)
        set(value) = prefs.edit().putInt(KEY_CHECKPOINT_ID, value).apply()

    var selectedCheckpointName: String
        get() = prefs.getString(KEY_CHECKPOINT_NAME, "Main Gate Scanner A") ?: "Main Gate Scanner A"
        set(value) = prefs.edit().putString(KEY_CHECKPOINT_NAME, value).apply()

    var selectedDirection: String
        get() = prefs.getString(KEY_DIRECTION, "IN") ?: "IN"
        set(value) = prefs.edit().putString(KEY_DIRECTION, value).apply()

    var lastSyncTime: String
        get() = prefs.getString(KEY_LAST_SYNC, "Never") ?: "Never"
        set(value) = prefs.edit().putString(KEY_LAST_SYNC, value).apply()

    var baseUrl: String
        get() = prefs.getString(KEY_BASE_URL, DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL
        set(value) = prefs.edit().putString(KEY_BASE_URL, value).apply()

    val isLoggedIn: Boolean
        get() = !authToken.isNullOrBlank()

    fun clearSession() {
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_USERNAME)
            .remove(KEY_ROLE)
            .apply()
    }
}

