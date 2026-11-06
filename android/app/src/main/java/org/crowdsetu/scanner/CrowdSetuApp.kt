package org.crowdsetu.scanner

import android.app.Application
import org.crowdsetu.scanner.data.api.NetworkClient
import org.crowdsetu.scanner.data.local.LocalDatabase
import org.crowdsetu.scanner.data.local.UserPreferences
import org.crowdsetu.scanner.data.repository.AuthRepository
import org.crowdsetu.scanner.data.repository.CheckpointRepository
import org.crowdsetu.scanner.data.repository.ScanRepository

class CrowdSetuApp : Application() {

    lateinit var userPreferences: UserPreferences
        private set

    lateinit var localDatabase: LocalDatabase
        private set

    lateinit var networkClient: NetworkClient
        private set

    lateinit var authRepository: AuthRepository
        private set

    lateinit var checkpointRepository: CheckpointRepository
        private set

    lateinit var scanRepository: ScanRepository
        private set

    override fun onCreate() {
        super.onCreate()

        userPreferences = UserPreferences(this)
        localDatabase = LocalDatabase.getInstance(this)
        networkClient = NetworkClient(userPreferences)

        authRepository = AuthRepository(networkClient, userPreferences)
        checkpointRepository = CheckpointRepository(networkClient, userPreferences)
        scanRepository = ScanRepository(localDatabase, networkClient, userPreferences)
    }
}

