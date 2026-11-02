package org.aicte.niyam.evc.data.local

import androidx.room.*
import org.aicte.niyam.evc.data.model.OfflineInspectionEntity

@Dao
interface InspectionDao {

    @Query("SELECT * FROM offline_inspections ORDER BY capturedAtIso DESC")
    suspend fun getAllInspections(): List<OfflineInspectionEntity>

    @Query("SELECT * FROM offline_inspections WHERE isSynced = 0 ORDER BY capturedAtIso ASC")
    suspend fun getPendingSyncInspections(): List<OfflineInspectionEntity>

    @Query("SELECT * FROM offline_inspections WHERE scheduleId = :schedId LIMIT 1")
    suspend fun getInspectionBySchedule(schedId: String): OfflineInspectionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(inspection: OfflineInspectionEntity)

    @Query("UPDATE offline_inspections SET isSynced = 1, syncedAtIso = :syncedAt WHERE inspectionId = :id")
    suspend fun markAsSynced(id: String, syncedAt: String)
}

@Database(entities = [OfflineInspectionEntity::class], version = 1, exportSchema = false)
abstract class InspectionDatabase : RoomDatabase() {
    abstract fun inspectionDao(): InspectionDao

    companion object {
        @Volatile
        private var INSTANCE: InspectionDatabase? = null

        fun getDatabase(context: android.content.Context): InspectionDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    InspectionDatabase::class.java,
                    "niyam_evc_offline.db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
