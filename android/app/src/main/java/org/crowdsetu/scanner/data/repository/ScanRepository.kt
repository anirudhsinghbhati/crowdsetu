package org.crowdsetu.scanner.data.repository

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.crowdsetu.scanner.data.api.NetworkClient
import org.crowdsetu.scanner.data.local.LocalDatabase
import org.crowdsetu.scanner.data.local.UserPreferences
import org.crowdsetu.scanner.data.model.LocalScan
import org.crowdsetu.scanner.data.model.RecordScanRequest
import org.crowdsetu.scanner.data.model.ScanResultState
import org.crowdsetu.scanner.data.model.ScanSyncStatus
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.regex.Pattern

class ScanRepository(
    private val localDatabase: LocalDatabase,
    private val networkClient: NetworkClient,
    private val userPreferences: UserPreferences
) {

    // Matches TK-XXXX.YYYYYYYY (case-insensitive)
    private val qrPattern = Pattern.compile("^(TK-[A-Fa-f0-9]{4})\\.([a-fA-F0-9]{8})$", Pattern.CASE_INSENSITIVE)

    suspend fun processScan(rawCode: String, checkpoint: String, direction: String): ScanResultState =
        withContext(Dispatchers.IO) {
            val clean = rawCode.trim()
            val matcher = qrPattern.matcher(clean)

            if (!matcher.matches()) {
                return@withContext ScanResultState.Invalid(
                    rawCode = clean,
                    reason = "Not a CrowdSetu code"
                )
            }

            val token = matcher.group(1)!!.uppercase()
            val sig = matcher.group(2)!!.lowercase()

            // Check for duplicate scan at this checkpoint
            val recent = localDatabase.findRecentScan(token, checkpoint)
            if (recent != null) {
                return@withContext ScanResultState.Duplicate(
                    token = token,
                    lastScannedTime = recent.timestamp
                )
            }

            val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
            val timestamp = timeFormat.format(Date())

            val scanId = localDatabase.insertScan(
                LocalScan(
                    token = token,
                    sig = sig,
                    checkpoint = checkpoint,
                    direction = direction,
                    timestamp = timestamp,
                    status = ScanSyncStatus.PENDING
                )
            )

            // Attempt immediate background sync
            try {
                val apiReq = RecordScanRequest(
                    token = token,
                    checkpoint = checkpoint,
                    direction = direction,
                    ts = timestamp,
                    sig = sig
                )
                val resp = networkClient.getApi().recordScan(apiReq)
                if (resp.isSuccessful) {
                    localDatabase.markScansSynced(listOf(scanId))
                    userPreferences.lastSyncTime = timestamp
                }
            } catch (e: Exception) {
                // Kept as PENDING in local DB, will be synced later
            }

            return@withContext ScanResultState.Success(
                token = token,
                time = timestamp,
                direction = direction
            )
        }

    suspend fun syncPendingScans(): Result<Int> = withContext(Dispatchers.IO) {
        val pending = localDatabase.getPendingScans()
        if (pending.isEmpty()) {
            return@withContext Result.success(0)
        }

        try {
            val requests = pending.map {
                RecordScanRequest(
                    token = it.token,
                    checkpoint = it.checkpoint,
                    direction = it.direction,
                    ts = it.timestamp,
                    sig = it.sig
                )
            }

            val response = networkClient.getApi().batchSyncScans(requests)
            if (response.isSuccessful && response.body() != null) {
                val syncedIds = pending.map { it.id }
                localDatabase.markScansSynced(syncedIds)

                val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
                val nowStr = timeFormat.format(Date())
                userPreferences.lastSyncTime = nowStr

                val count = response.body()!!.syncedCount
                Result.success(count)
            } else {
                Result.failure(Exception("Sync server responded with ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getPendingCount(): Int = localDatabase.getPendingCount()

    fun getAllScans(): List<LocalScan> = localDatabase.getAllScans()

    fun getLastSyncTime(): String = userPreferences.lastSyncTime
}

