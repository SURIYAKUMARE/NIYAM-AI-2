package org.aicte.niyam.evc.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * ASSIGNED CAMPUS VISIT DOCKET & OFFLINE INSPECTION DATA MODELS
 */

data class CampusVisit(
    val scheduleId: String,
    val applicationId: String,
    val applicationNo: String,
    val institutionId: String,
    val institutionName: String,
    val campusAddress: String,
    val targetLatitude: Double,
    val targetLongitude: Double,
    val proposedDate: String,
    val visitType: String,
    val committeeRole: String,
    val visitStatus: String
)

data class InspectionChecklist(
    val landAreaVerified: Boolean = false,
    val instructionalAreaSufficient: Boolean = false,
    val labsFunctional: Boolean = false,
    val internetSpeedVerified: Boolean = false,
    val fireSafetyEquipmentOperational: Boolean = false,
    val barrierFreeAccessFunctional: Boolean = false,
    val digitalLibraryAccessible: Boolean = false,
    val facultyPresentInPerson: Boolean = false
)

data class EvidencePhoto(
    val photoId: String,
    val category: String, // CAMPUS_FRONT, MAIN_LAB, LIBRARY, DIVYANGJAN_RAMP, FIRE_HYDRANT
    val localFilePath: String,
    val latitude: Double,
    val longitude: Double,
    val altitude: Double,
    val timestampIso: String,
    val sha256Hash: String,
    val isMockLocation: Boolean
)

@Entity(tableName = "offline_inspections")
data class OfflineInspectionEntity(
    @PrimaryKey
    val inspectionId: String,
    val scheduleId: String,
    val applicationId: String,
    val inspectorUserId: String,
    val capturedLatitude: Double,
    val capturedLongitude: Double,
    val isMockLocationDetected: Boolean,
    val deviceIntegrityScore: Float,
    val integrityFlagsJson: String,
    val checklistJson: String,
    val photosMetadataJson: String,
    val overallRecommendation: String, // RECOMMENDED_FULL, RECOMMENDED_CONDITIONAL, NOT_RECOMMENDED
    val deficiencyRemarks: String,
    val docketSha256: String,
    val capturedAtIso: String,
    val isSynced: Boolean = false,
    val syncedAtIso: String? = null
)
