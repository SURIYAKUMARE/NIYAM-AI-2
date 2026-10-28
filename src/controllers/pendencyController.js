const pendencyService = require('../services/pendencyService');

class PendencyController {
    getDashboardKPIs(req, res) {
        try {
            const filters = {
                regionId: req.enforcedRegionId || req.query.regionId,
                academicYear: req.query.academicYear,
                institutionType: req.query.institutionType,
                category: req.query.category
            };
            const kpis = pendencyService.getExecutiveDashboardKPIs(filters);
            return res.json(kpis);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getAnalytics(req, res) {
        try {
            const filters = {
                regionId: req.enforcedRegionId || req.query.regionId,
                academicYear: req.query.academicYear
            };
            const analytics = pendencyService.getAnalytics(filters);
            return res.json(analytics);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getPendencyList(req, res) {
        try {
            const { stage, classification, limit = 50, offset = 0 } = req.query;
            const regionId = req.enforcedRegionId || req.query.regionId;
            const data = pendencyService.getDetailedPendencyList({
                regionId,
                stage,
                classification,
                limit: Number(limit),
                offset: Number(offset)
            });
            return res.json(data);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new PendencyController();
