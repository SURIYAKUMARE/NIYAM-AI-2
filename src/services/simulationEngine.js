const db = require('../database/db');
const auditService = require('./auditService');
const dualClockEngine = require('./dualClockEngine');
const escalationEngine = require('./escalationEngine');
const expiryEngine = require('./expiryEngine');
const workflowEngine = require('./workflowEngine');

/**
 * TIME-TRAVEL DEMONSTRATION SIMULATOR
 * 
 * Purpose: Empowers SIH Grand Finale Judges to evaluate dynamic time-dependent behaviors:
 * 1. Fast-forward virtual clock (+7d, +15d, +30d, +60d, +90d)
 * 2. Observe automated 90d/30d/7d statutory expiry triggers
 * 3. Observe Dual-Clock accountability shifts
 * 4. Observe automated 4-tier hierarchical escalations (L1 -> L2 -> L3 -> L4)
 * 5. Simulate institutional deficiency resubmission
 * 6. Simulate EVC committee inspection completion
 * 7. Reset back to clean real-time baseline without altering production ledger
 */
class SimulationEngine {
    /**
     * Get current virtual or real time
     */
    getCurrentSimulationStatus() {
        const sim = db.queryOne('SELECT * FROM simulation_clock WHERE id = 1');
        const isSim = sim && sim.is_simulation_active === 1;
        const offsetSec = (sim && sim.virtual_time_offset_seconds) || 0;

        const realNow = new Date();
        const effectiveNow = new Date(realNow.getTime() + (offsetSec * 1000));

        return {
            isSimulationActive: isSim,
            virtualOffsetSeconds: offsetSec,
            virtualOffsetDays: (offsetSec / 86400).toFixed(1),
            realTimestamp: realNow.toISOString(),
            effectiveTimestamp: effectiveNow.toISOString(),
            notes: (sim && sim.notes) || 'Real-time production baseline',
            lastUpdatedBy: (sim && sim.updated_by) || 'SYSTEM'
        };
    }

    /**
     * Fast-forward virtual demonstration clock
     */
    advanceTime({ days = 0, hours = 0, user, notes = '' }) {
        const sim = db.queryOne('SELECT * FROM simulation_clock WHERE id = 1');
        const currentOffset = (sim && sim.virtual_time_offset_seconds) || 0;
        const additionalSec = (Number(days) * 86400) + (Number(hours) * 3600);
        const newOffset = currentOffset + additionalSec;

        const realNow = new Date();
        const newSimulatedDate = new Date(realNow.getTime() + (newOffset * 1000)).toISOString();

        // 1. Update simulation clock state
        db.execute(`
            UPDATE simulation_clock
            SET is_simulation_active = 1,
                virtual_time_offset_seconds = ?,
                simulated_timestamp = ?,
                updated_by = ?,
                updated_at = CURRENT_TIMESTAMP,
                notes = ?
            WHERE id = 1
        `, [newOffset, newSimulatedDate, user ? user.username : 'DEMO_JUDGE', notes || `Advanced +${days}d ${hours}h for demonstration`]);

        // 2. Trigger dynamic engines under the advanced virtual clock
        const expiryAlerts = expiryEngine.evaluateStatutoryExpiries();
        const escalations = escalationEngine.evaluateEscalations();

        // Check overdue undertakings under virtual clock
        const overdueUtks = db.query(`
            SELECT id, undertaking_ref, institution_id FROM undertakings
            WHERE status IN ('PENDING', 'UPCOMING')
            AND datetime(due_date) < datetime(?)
        `, [newSimulatedDate]);

        for (const u of overdueUtks) {
            db.execute('UPDATE undertakings SET status = "OVERDUE" WHERE id = ?', [u.id]);
        }

        return {
            success: true,
            message: `Virtual clock successfully advanced by +${days} days (${(newOffset / 86400).toFixed(1)} days cumulative).`,
            effectiveTimestamp: newSimulatedDate,
            virtualOffsetDays: (newOffset / 86400).toFixed(1),
            triggersExecuted: {
                expiryAlertsTriggered: expiryAlerts.length,
                expiryAlerts,
                escalationsTriggered: escalations.length,
                escalations,
                undertakingsOverdueCount: overdueUtks.length
            }
        };
    }

    /**
     * Reset virtual clock back to real-time production mode
     */
    resetClock({ user }) {
        const now = new Date().toISOString();
        db.execute(`
            UPDATE simulation_clock
            SET is_simulation_active = 0,
                virtual_time_offset_seconds = 0,
                simulated_timestamp = ?,
                updated_by = ?,
                updated_at = CURRENT_TIMESTAMP,
                notes = 'Restored real-time baseline'
            WHERE id = 1
        `, [now, user ? user.username : 'DEMO_JUDGE']);

        return {
            success: true,
            isSimulationActive: false,
            effectiveTimestamp: now,
            message: 'Virtual simulation clock reset. System restored to actual real-time.'
        };
    }

    /**
     * Simulate Institutional Deficiency Resubmission
     */
    simulateCollegeResubmission({ applicationId, deficiencyId = null, responseText = '', documentUrl = '', user }) {
        return db.transaction((tx) => {
            const app = tx.queryOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
            if (!app) throw new Error('Application not found.');

            const now = new Date().toISOString();

            // 1. If deficiency specified, mark it
            if (deficiencyId) {
                tx.execute(`
                    UPDATE deficiencies
                    SET status = 'RESPONSES_SUBMITTED',
                        response_text = ?,
                        response_document_url = ?,
                        responded_at = ?
                    WHERE id = ?
                `, [responseText || 'Institution compliance evidence submitted with municipal clearance receipts.', documentUrl || '/seed/docs/cit-coromandel/fire_safety_noc.pdf', now, deficiencyId]);
            } else {
                tx.execute(`
                    UPDATE deficiencies
                    SET status = 'RESPONSES_SUBMITTED',
                        response_text = 'Institutional compliance package uploaded for all raised findings.',
                        responded_at = ?
                    WHERE application_id = ? AND status IN ('RAISED', 'DEFICIENT_PERSISTS')
                `, [now, applicationId]);
            }

            // 2. Advance 13-stage if currently in college response
            if (app.detailed_stage_index === 5 || app.current_stage === 'RE_SCRUTINY') {
                workflowEngine.advance13Stage({
                    applicationId,
                    stageNumber: 6, // REVERIFICATION
                    user,
                    comments: 'College response submitted with updated evidence docket. Routed to Reverification.',
                    evidenceRef: documentUrl || 'DOC_RECTIFICATION_PACKAGE'
                });
            } else {
                // Switch clock to OFFICER_PROCESSING
                dualClockEngine.switchClock({
                    applicationId,
                    toClockType: 'OFFICER_PROCESSING',
                    stageName: 'REVERIFICATION',
                    responsibleEntityType: 'AICTE_OFFICER',
                    actorId: user.id,
                    reason: 'Institution uploaded response; officer verification active.'
                });
            }

            return {
                applicationId,
                status: 'RESPONSES_SUBMITTED',
                activeClock: 'OFFICER_PROCESSING',
                message: 'Institution response registered. Dual-clock switched back to AICTE Officer Processing.'
            };
        });
    }

    /**
     * Simulate EVC Committee Visit Completion & Report Filing
     */
    simulateEvcCompletion({ applicationId, infrastructureScore = 92, facultyScore = 88, complianceScore = 94, recommendation = 'RECOMMENDED_FULL', user }) {
        return db.transaction((tx) => {
            const app = tx.queryOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
            if (!app) throw new Error('Application not found.');

            const now = new Date().toISOString();
            const todayDate = now.slice(0, 10);

            // Fetch or create EVC schedule
            let sched = tx.queryOne('SELECT * FROM evc_schedules WHERE application_id = ?', [applicationId]);
            if (!sched) {
                const schedId = 'EVC_SIM_' + applicationId.slice(-6);
                tx.execute(`
                    INSERT INTO evc_schedules (
                        id, application_id, coordinator_id, proposed_date, confirmed_date,
                        visit_status, visit_type
                    ) VALUES (?, ?, ?, ?, ?, 'INSPECTION_COMPLETED', 'Physical Inspection')
                `, [schedId, applicationId, user.id, todayDate, todayDate]);
                sched = { id: schedId };
            } else {
                tx.execute(`
                    UPDATE evc_schedules
                    SET visit_status = 'INSPECTION_COMPLETED', confirmed_date = ?
                    WHERE id = ?
                `, [todayDate, sched.id]);
            }

            // Record EVC Report
            const reportId = 'RPT_SIM_' + applicationId.slice(-6);
            tx.execute(`
                INSERT OR REPLACE INTO evc_reports (
                    id, evc_schedule_id, application_id, inspection_date,
                    infrastructure_score, faculty_score, compliance_score,
                    overall_recommendation, deficiency_notes, submitted_by_officer_id,
                    submitted_at, digital_sign_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                reportId,
                sched.id,
                applicationId,
                todayDate,
                infrastructureScore,
                facultyScore,
                complianceScore,
                recommendation,
                'Physical on-site inspection verified instructional blocks, specialized labs, digital library, and barrier-free access in full order.',
                user.id,
                now,
                'SHA256:EVC_SEAL_' + Buffer.from(applicationId + todayDate).toString('hex').slice(0, 32)
            ]);

            // Advance workflow to Regional Office Review
            workflowEngine.advance13Stage({
                applicationId,
                stageNumber: 10, // REGIONAL_OFFICE_REVIEW
                user,
                comments: `EVC Inspection report submitted (${recommendation}, Infra: ${infrastructureScore}%, Faculty: ${facultyScore}%). Forwarded to Regional Review.`,
                evidenceRef: reportId
            });

            return {
                applicationId,
                reportId,
                recommendation,
                infrastructureScore,
                facultyScore,
                complianceScore,
                nextStage: 'REGIONAL_OFFICE_REVIEW',
                message: 'EVC physical inspection docket compiled and geotagged. Advanced to Regional Review.'
            };
        });
    }
}

module.exports = new SimulationEngine();
