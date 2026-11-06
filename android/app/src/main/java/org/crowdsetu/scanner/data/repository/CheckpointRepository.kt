package org.crowdsetu.scanner.data.repository

import org.crowdsetu.scanner.data.api.NetworkClient
import org.crowdsetu.scanner.data.local.UserPreferences
import org.crowdsetu.scanner.data.model.Checkpoint

class CheckpointRepository(
    private val networkClient: NetworkClient,
    private val userPreferences: UserPreferences
) {

    private val defaultCheckpoints = listOf(
        Checkpoint(1, "Main Gate Scanner A", 1, "Main Gate"),
        Checkpoint(2, "Main Gate Scanner B", 1, "Main Gate"),
        Checkpoint(3, "Ghat Barricade Scanner", 2, "Ghat Approach"),
        Checkpoint(4, "Sanctum Security Check", 3, "Sanctum Corridor"),
        Checkpoint(5, "Exit Gate Scanner", 4, "Exit Lane")
    )

    suspend fun getCheckpoints(): List<Checkpoint> {
        return try {
            val response = networkClient.getApi().getCheckpoints()
            if (response.isSuccessful && !response.body().isNullOrEmpty()) {
                response.body()!!
            } else {
                defaultCheckpoints
            }
        } catch (e: Exception) {
            defaultCheckpoints
        }
    }

    fun saveSelection(checkpointId: Int, checkpointName: String, direction: String) {
        userPreferences.selectedCheckpointId = checkpointId
        userPreferences.selectedCheckpointName = checkpointName
        userPreferences.selectedDirection = direction
    }

    fun getSavedCheckpointName(): String = userPreferences.selectedCheckpointName
    fun getSavedCheckpointId(): Int = userPreferences.selectedCheckpointId
    fun getSavedDirection(): String = userPreferences.selectedDirection
}

