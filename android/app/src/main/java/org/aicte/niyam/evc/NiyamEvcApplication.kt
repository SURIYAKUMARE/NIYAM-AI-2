package org.aicte.niyam.evc

import android.app.Application
import androidx.work.*
import org.aicte.niyam.evc.worker.OfflineSyncWorker
import java.util.concurrent.TimeUnit

class NiyamEvcApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        setupBackgroundSyncSchedule()
    }

    private fun setupBackgroundSyncSchedule() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncRequest = PeriodicWorkRequestBuilder<OfflineSyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "NIYAM_EVC_OFFLINE_SYNC",
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        )
    }
}
