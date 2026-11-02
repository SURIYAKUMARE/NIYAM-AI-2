package org.aicte.niyam.evc.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import org.aicte.niyam.evc.data.local.InspectionDatabase
import org.aicte.niyam.evc.data.remote.NiyamApiService
import org.aicte.niyam.evc.data.remote.SyncInspectionRequest
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.text.SimpleDateFormat
import java.util.*

/**
 * ANDROID WORKMANAGER BACKGROUND SYNC WORKER
 * 
 * Automatically synchronizes cached offline inspection dockets when device
 * regains network connectivity.
 */
class OfflineSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val db = InspectionDatabase.getDatabase(appContext)
    private val gson = Gson()

    private val api: NiyamApiService by lazy {
        Retrofit.Builder()
            .baseUrl("https://niyam-ai-2-nu.vercel.app/api/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(NiyamApiService::class.java)
    }

    override suspend fun doWork(): Result {
        val pending = db.inspectionDao().getPendingSyncInspections()
        if (pending.isEmpty()) return Result.success()

        val token = "Bearer NIYAM_SECURE_OFFICER_TOKEN"
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }

        var allSuccess = true
        for (item in pending) {
            try {
                val flagsType = object : TypeToken<List<String>>() {}.type
                val checklistType = object : TypeToken<Map<String, Boolean>>() {}.type
                val photosType = object : TypeToken<List<Map<String, Any>>>() {}.type

                val flags: List<String> = gson.fromJson(item.integrityFlagsJson, flagsType) ?: emptyList()
                val checklist: Map<String, Boolean> = gson.fromJson(item.checklistJson, checklistType) ?: emptyMap()
                val photos: List<Map<String, Any>> = gson.fromJson(item.photosMetadataJson, photosType) ?: emptyList()

                val req = SyncInspectionRequest(
                    scheduleId = item.scheduleId,
                    applicationId = item.applicationId,
                    inspectorUserId = item.inspectorUserId,
                    capturedLatitude = item.capturedLatitude,
                    capturedLongitude = item.capturedLongitude,
                    isMockLocation = item.isMockLocationDetected,
                    deviceIntegrityScore = item.deviceIntegrityScore,
                    integrityFlags = flags,
                    checklistAnswers = checklist,
                    photosMetadata = photos,
                    overallRecommendation = item.overallRecommendation,
                    deficiencyRemarks = item.deficiencyRemarks,
                    docketSha256 = item.docketSha256,
                    offlineCapturedAt = item.capturedAtIso
                )

                val res = api.syncOfflineInspection(token, req)
                if (res.isSuccessful && res.body()?.success == true) {
                    val syncedAt = sdf.format(Date())
                    db.inspectionDao().markAsSynced(item.inspectionId, syncedAt)
                } else {
                    allSuccess = false
                }
            } catch (e: Exception) {
                allSuccess = false
            }
        }

        return if (allSuccess) Result.success() else Result.retry()
    }
}
