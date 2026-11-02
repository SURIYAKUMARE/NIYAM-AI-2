package org.aicte.niyam.evc.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import org.aicte.niyam.evc.data.model.CampusVisit

/**
 * ASSIGNED CAMPUS VISITS MANAGEMENT ACTIVITY
 */
class VisitsListActivity : AppCompatActivity() {

    private val sampleVisits = listOf(
        CampusVisit(
            scheduleId = "EVC_SCHED_001",
            applicationId = "APP_2026_001",
            applicationNo = "AICTE-2026-10041",
            institutionId = "INST_001",
            institutionName = "Apex Institute of Technology & Research",
            campusAddress = "Sector 62, Institutional Area, Noida / New Delhi",
            targetLatitude = 28.6280,
            targetLongitude = 77.3649,
            proposedDate = "2026-11-05",
            visitType = "Physical Inspection",
            committeeRole = "Chairman (Civil & Infrastructure)",
            visitStatus = "SCHEDULED"
        ),
        CampusVisit(
            scheduleId = "EVC_SCHED_002",
            applicationId = "APP_2026_002",
            applicationNo = "AICTE-2026-10042",
            institutionId = "INST_002",
            institutionName = "Coromandel Institute of Technology",
            campusAddress = "Vandalur-Kelambakkam Road, Chennai, Tamil Nadu",
            targetLatitude = 12.8698,
            targetLongitude = 80.1439,
            proposedDate = "2026-11-12",
            visitType = "Physical Inspection",
            committeeRole = "Member (Subject Expert)",
            visitStatus = "AWAITING_VISIT"
        )
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }

        val tvHeader = TextView(this).apply {
            text = "AICTE Expert Visit Committee — Assigned Docket"
            textSize = 18f
        }
        layout.addView(tvHeader)

        for (visit in sampleVisits) {
            val btn = Button(this).apply {
                text = "Inspect: ${visit.institutionName}\nApp: ${visit.applicationNo} | Date: ${visit.proposedDate}"
                setOnClickListener {
                    val intent = Intent(this@VisitsListActivity, InspectionWorkspaceActivity::class.java).apply {
                        putExtra("SCHEDULE_ID", visit.scheduleId)
                        putExtra("APP_ID", visit.applicationId)
                        putExtra("APP_NO", visit.applicationNo)
                        putExtra("INST_NAME", visit.institutionName)
                        putExtra("LAT", visit.targetLatitude)
                        putExtra("LNG", visit.targetLongitude)
                    }
                    startActivity(intent)
                }
            }
            layout.addView(btn)
        }

        setContentView(layout)
    }
}
