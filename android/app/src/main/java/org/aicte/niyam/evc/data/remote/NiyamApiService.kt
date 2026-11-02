package org.aicte.niyam.evc.data.remote

import retrofit2.Response
import retrofit2.http.*

data class LoginRequest(
    val username: String,
    val password: String,
    val mpin: String? = null
)

data class LoginResponse(
    val token: String,
    val user: UserDto
)

data class UserDto(
    val id: String,
    val username: String,
    val fullName: String,
    val roleCode: String
)

data class SyncInspectionRequest(
    val scheduleId: String,
    val applicationId: String,
    val inspectorUserId: String,
    val capturedLatitude: Double,
    val capturedLongitude: Double,
    val isMockLocation: Boolean,
    val deviceIntegrityScore: Float,
    val integrityFlags: List<String>,
    val checklistAnswers: Map<String, Boolean>,
    val photosMetadata: List<Map<String, Any>>,
    val overallRecommendation: String,
    val deficiencyRemarks: String,
    val docketSha256: String,
    val offlineCapturedAt: String
)

data class SyncInspectionResponse(
    val success: Boolean,
    val syncStatus: String, // SYNCED_VERIFIED, FLAGGED_MANUAL_REVIEW
    val reportId: String,
    val message: String
)

interface NiyamApiService {

    @POST("auth/login")
    suspend fun login(@Body req: LoginRequest): Response<LoginResponse>

    @GET("evc/mobile/docket/{scheduleId}")
    suspend fun fetchVisitDocket(
        @Header("Authorization") token: String,
        @Path("scheduleId") scheduleId: String
    ): Response<Map<String, Any>>

    @POST("intelligence/evc-offline-sync")
    suspend fun syncOfflineInspection(
        @Header("Authorization") token: String,
        @Body payload: SyncInspectionRequest
    ): Response<SyncInspectionResponse>
}
