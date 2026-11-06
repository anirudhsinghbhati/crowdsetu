package org.crowdsetu.scanner.data.api

import org.crowdsetu.scanner.data.model.AuthResponse
import org.crowdsetu.scanner.data.model.BatchSyncResponse
import org.crowdsetu.scanner.data.model.Checkpoint
import org.crowdsetu.scanner.data.model.LoginRequest
import org.crowdsetu.scanner.data.model.RecordScanRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface CrowdSetuApi {

    @POST("api/auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<AuthResponse>

    @GET("api/checkpoints")
    suspend fun getCheckpoints(): Response<List<Checkpoint>>

    @POST("api/pilgrims/scan")
    suspend fun recordScan(
        @Body request: RecordScanRequest
    ): Response<Any>

    @POST("api/pilgrims/scans")
    suspend fun batchSyncScans(
        @Body scans: List<RecordScanRequest>
    ): Response<BatchSyncResponse>

    @GET("health")
    suspend fun checkHealth(): Response<Map<String, Any>>
}
