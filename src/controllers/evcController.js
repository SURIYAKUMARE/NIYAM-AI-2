const evcService = require('../services/evcService');

class EVCController {
    getDashboard(req, res) {
        try {
            const regionId = req.enforcedRegionId || req.query.regionId;
            const metrics = evcService.getDashboardMetrics(regionId);
            return res.json(metrics);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getSchedulingQueue(req, res) {
        try {
            const regionId = req.enforcedRegionId || req.query.regionId;
            const queue = evcService.getSchedulingQueue({ regionId });
            return res.json({ queue, total: queue.length });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    checkConflict(req, res) {
        try {
            const { applicationId, expertInstitution } = req.body;
            if (!applicationId || !expertInstitution) {
                return res.status(400).json({ error: 'applicationId and expertInstitution are required.' });
            }
            const result = evcService.checkMemberConflict(expertInstitution, '', applicationId);
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    scheduleVisit(req, res) {
        try {
            const { id } = req.params;
            const { proposedDate, visitType, members } = req.body;

            if (!proposedDate) {
                return res.status(400).json({ error: 'Proposed visit date is required.' });
            }

            const result = evcService.scheduleVisit({
                applicationId: id,
                proposedDate,
                visitType: visitType || 'Physical Inspection',
                members: members || [
                    { name: 'Prof. Devendra Pathak', designation: 'Professor & Dean', institution: 'IIT Kanpur', role: 'Chairman' },
                    { name: 'Dr. Anita Joshi', designation: 'Associate Professor', institution: 'NIT Delhi', role: 'Member (Academic)' }
                ],
                user: req.user
            });

            return res.status(201).json({ message: 'EVC inspection scheduled successfully.', result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    submitReport(req, res) {
        try {
            const { scheduleId } = req.params;
            const { applicationId, inspectionDate, infrastructureScore, facultyScore, complianceScore, overallRecommendation, deficiencyNotes } = req.body;

            if (!overallRecommendation || infrastructureScore === undefined) {
                return res.status(400).json({ error: 'Overall recommendation and scores are required.' });
            }

            const result = evcService.submitReport({
                scheduleId,
                applicationId,
                inspectionDate: inspectionDate || new Date().toISOString().split('T')[0],
                infrastructureScore: Number(infrastructureScore),
                facultyScore: Number(facultyScore),
                complianceScore: Number(complianceScore),
                overallRecommendation,
                deficiencyNotes: deficiencyNotes || '',
                user: req.user
            });

            return res.json({ message: 'EVC inspection report submitted and digitally signed.', result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}

module.exports = new EVCController();
