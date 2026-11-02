package org.aicte.niyam.evc.ui

import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import kotlinx.coroutines.launch
import org.aicte.niyam.evc.data.local.InspectionDatabase
import org.aicte.niyam.evc.worker.OfflineSyncWorker

/**
 * INSPECTION REPORT & MANUAL CLOUD SYNC ACTIVITY
 */
class InspectionReportActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }

        val tv = TextView(this).apply {
            text = "EVC Final Inspection Docket Summary\nReady for Secure Synchronization"
        }
        layout.addView(tv)

        val btnSync = Button(this).apply {
            text = "Trigger Immediate Cloud Sync (WorkManager)"
            setOnClickListener {
                val syncRequest = OneTimeWorkRequestBuilder<OfflineSyncWorker>().build()
                WorkManager.getInstance(this@InspectionReportActivity).enqueue(syncRequest)
                Toast.makeText(this@InspectionReportActivity, "Sync Worker Dispatched to NIYAM Cloud!", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
        layout.addView(btnSync)

        setContentView(layout)
    }
}
