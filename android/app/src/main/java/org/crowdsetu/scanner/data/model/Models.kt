package org.crowdsetu.scanner.data.model

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    val username: String,
    val password: String? = null
)

data class AuthResponse(
    val token: String,
    val role: String,
    val username: String
)

data class Checkpoint(
    val id: Int,
    val name: String,
    @SerializedName("zone_id") val zoneId: Int,
    @SerializedName("zone_name") val zoneName: String
)

data class RecordScanRequest(
    val token: String,
    val checkpoint: String,
    val direction: String,
    val ts: String? = null,
    val sig: String? = null
)

data class BatchSyncResponse(
    val message: String,
    @SerializedName("synced_count") val syncedCount: Int
)

enum class ScanSyncStatus {
    PENDING,
    SYNCED,
    FAILED
}

data class LocalScan(
    val id: Long = 0,
    val token: String,
    val sig: String,
    val checkpoint: String,
    val direction: String,
    val timestamp: String,
    val status: ScanSyncStatus
)

sealed class ScanResultState {
    object Idle : ScanResultState()
    data class Success(val token: String, val time: String, val direction: String) : ScanResultState()
    data class Duplicate(val token: String, val lastScannedTime: String) : ScanResultState()
    data class Invalid(val rawCode: String, val reason: String) : ScanResultState()
}

