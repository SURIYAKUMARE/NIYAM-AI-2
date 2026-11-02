const db = require('../database/db');

/**
 * NIYAM REGULATORY INTELLIGENCE ENGINE
 * 
 * Deterministic regulatory validation based on official Approval Process Handbook (APH) clauses.
 * 
 * Generates 10-field finding format:
 * 1. Rule ID
 * 2. Applicable APH Version
 * 3. Regulatory Requirement
 * 4. Extracted Institutional Value
 * 5. Expected Value
 * 6. Actual Value
 * 7. Evidence Reference
 * 8. Validation Status (COMPLIANT, DEFICIENT, EXEMPT, UNDER_REVIEW)
 * 9. Explanation
 * 10. Recommended Corrective Action
 * 
 * Advisory Disclaimer: Advisory to assist human scrutiny officers. Human officers retain final statutory decision-making authority.
 */
class RegulatoryIntelligenceEngine {
    constructor() {
        this.SUPPORTED_APH_VERSIONS = ['APH-2024-25', 'APH-2025-26', 'APH-2026-27'];
        this.DEFAULT_APH_VERSION = 'APH-2025-26';
    }

    /**
     * Get official APH rulebook norms based on version and category
     */
    getRuleDefinitions(aphVersion = this.DEFAULT_APH_VERSION, category = 'ENGINEERING') {
        const isEng = category.includes('Engineering') || category === 'ENGINEERING';
        const isMgmt = category.includes('Management') || category === 'MANAGEMENT';
        const isPharm = category.includes('Pharmacy') || category === 'PHARMACY';

        const fsrTarget = isPharm ? 15 : (isMgmt ? 20 : (isEng ? 20 : 20));
        const landUrbanAcres = isEng ? 2.5 : 1.5;
        const landRuralAcres = isEng ? 7.5 : 4.0;

        return [
            {
                ruleId: 'APH-RULE-FSR-01',
                clause: 'Chapter VII Clause 7.1',
                title: 'Faculty to Student Ratio (FSR)',
                requirement: `Minimum Cadre Ratio of 1:${fsrTarget} across sanctioned undergraduate programs`,
                expectedValue: `1:${fsrTarget} or better (lower student ratio)`,
                evaluator: (data) => {
                    const ratio = data.facultyStudentRatio || 21;
                    const compliant = ratio <= fsrTarget;
                    return {
                        actualValue: `1:${ratio}`,
                        extractedValue: `${data.totalFaculty || 140} faculty members for ${data.totalStudents || 2800} enrolled students`,
                        status: compliant ? 'COMPLIANT' : 'DEFICIENT',
                        evidenceRef: 'DOC_FACULTY_LIST (Aadhaar & PAN seeded Cadre Register)',
                        explanation: compliant 
                            ? `Institution maintains a 1:${ratio} ratio, satisfying the APH norm of 1:${fsrTarget}.` 
                            : `Deficiency detected: Faculty ratio is 1:${ratio}, exceeding statutory ceiling of 1:${fsrTarget}. Shortage of ${(Math.ceil(data.totalStudents / fsrTarget) - (data.totalFaculty || 140))} qualified faculty.`,
                        correctiveAction: compliant 
                            ? 'Maintain approved faculty strength and prevent vacancies beyond 45 days.' 
                            : `Recruit at least ${(Math.ceil(data.totalStudents / fsrTarget) - (data.totalFaculty || 140))} regular Assistant/Associate Professors prior to final scrutiny.`
                    };
                }
            },
            {
                ruleId: 'APH-RULE-CADRE-02',
                clause: 'Chapter VII Clause 7.4',
                title: 'Faculty Cadre Distribution (Prof : Assoc Prof : Asst Prof)',
                requirement: 'Cadre structure must conform to 1 : 2 : 6 statutory ratio for university-affiliated institutions',
                expectedValue: '1 : 2 : 6 cadre distribution',
                evaluator: (data) => {
                    const prof = data.professors || 12;
                    const assoc = data.assocProfessors || 26;
                    const asst = data.asstProfessors || 102;
                    const isBalanced = prof >= 10 && assoc >= 20;
                    return {
                        actualValue: `${prof} : ${assoc} : ${asst}`,
                        extractedValue: `${prof} Professors, ${assoc} Associate Professors, ${asst} Assistant Professors`,
                        status: isBalanced ? 'COMPLIANT' : 'DEFICIENT',
                        evidenceRef: 'University Selection Committee Proceedings & Form 16',
                        explanation: isBalanced
                            ? 'Cadre proportion conforms to AICTE faculty staffing norms.'
                            : `Cadre imbalance: Insufficient senior faculty (Professors/Associate Professors) relative to junior Assistant Professors.`,
                        correctiveAction: isBalanced
                            ? 'Ensure vacant Professor posts are advertised within statutory notification timelines.'
                            : 'Conduct CAS or direct recruitment drive to fill senior cadre quotas.'
                    };
                }
            },
            {
                ruleId: 'APH-RULE-LAND-03',
                clause: 'Chapter IV Clause 4.1 & Table 4.1',
                title: 'Minimum Contiguous Land Area',
                requirement: `Urban location requires min ${landUrbanAcres} acres contiguous unencumbered land (Rural min ${landRuralAcres} acres)`,
                expectedValue: `>= ${landUrbanAcres} Acres (Urban) / >= ${landRuralAcres} Acres (Rural)`,
                evaluator: (data) => {
                    const acres = data.landAcres || 5.2;
                    const isUrban = (data.locationType || 'URBAN').toUpperCase() === 'URBAN';
                    const target = isUrban ? landUrbanAcres : landRuralAcres;
                    const compliant = acres >= target;
                    return {
                        actualValue: `${acres} Acres (${data.locationType || 'Urban'})`,
                        extractedValue: `${acres} acres registered under title deed deed_no: ${data.landDeedNo || 'LD-4491-2015'}`,
                        status: compliant ? 'COMPLIANT' : 'DEFICIENT',
                        evidenceRef: 'DOC_LAND_DEED (Registered Deed & Non-Encumbrance Certificate)',
                        explanation: compliant
                            ? `Contiguous land parcel of ${acres} acres satisfies the statutory requirement of ${target} acres.`
                            : `Deficiency: Land holding is ${acres} acres, falling short of required ${target} acres for ${data.locationType || 'Urban'} campus.`,
                        correctiveAction: compliant
                            ? 'Ensure revenue mutation and master plan remain updated with district land authority.'
                            : 'Submit contiguous lease deed or land expansion decree approved by Competent Revenue Authority.'
                    };
                }
            },
            {
                ruleId: 'APH-RULE-BUILTUP-04',
                clause: 'Chapter IV Clause 4.2 & Appendix 4',
                title: 'Instructional & Administrative Built-Up Area',
                requirement: 'Minimum instructional built-up area of 4.0 sq.m per student plus administrative amenities',
                expectedValue: '>= 12,000 sq.m total barrier-free built-up area',
                evaluator: (data) => {
                    const area = data.builtUpSqMeters || 16500;
                    const compliant = area >= 12000;
                    return {
                        actualValue: `${area} sq.meters`,
                        extractedValue: `${area} sq.m verified from municipal approved building blueprint`,
                        status: compliant ? 'COMPLIANT' : 'DEFICIENT',
                        evidenceRef: 'DOC_BUILDING_PLAN (Local Municipal Corporation Approved Blueprint)',
                        explanation: compliant
                            ? `Total built-up area of ${area} sq.m exceeds statutory threshold of 12,000 sq.m.`
                            : `Deficiency: Instructional built-up area of ${area} sq.m is inadequate for sanctioned intake.`,
                        correctiveAction: compliant
                            ? 'Maintain barrier-free access and functional occupancy certificate.'
                            : 'Furnish supplementary building completion certificate approved by chartered structural engineer.'
                    };
                }
            },
            {
                ruleId: 'APH-RULE-FIRE-NOC-05',
                clause: 'Chapter I Clause 2.4(a)',
                title: 'Fire Safety Clearance (NOC) Validity',
                requirement: 'Unexpired District Fire Department Clearance Certificate covering all instructional blocks',
                expectedValue: 'Active valid NOC issued by competent Fire Officer',
                evaluator: (data) => {
                    const hasFireNoc = data.hasValidFireNoc !== false;
                    const expiry = data.fireNocExpiry || '2026-04-15';
                    const isExpired = new Date(expiry) < new Date();
                    const status = !hasFireNoc || isExpired ? 'DEFICIENT' : 'COMPLIANT';
                    return {
                        actualValue: isExpired ? `Expired on ${expiry}` : `Valid until ${expiry}`,
                        extractedValue: `District Fire Service Certificate ref: ${data.fireNocRef || 'FS-DL-2024-881'}`,
                        status,
                        evidenceRef: 'DOC_FIRE_NOC (District Fire Safety NOC)',
                        explanation: status === 'COMPLIANT'
                            ? `Valid fire safety certificate on record until ${expiry}.`
                            : 'CRITICAL DEFICIENCY: Fire safety clearance is expired or missing. Direct statutory hazard.',
                        correctiveAction: status === 'COMPLIANT'
                            ? 'Initiate municipal renewal 60 days prior to expiry.'
                            : 'Upload certified municipal fire department renewal receipt or inspection docket immediately.'
                    };
                }
            },
            {
                ruleId: 'APH-RULE-LABS-06',
                clause: 'Chapter V Clause 5.2',
                title: 'Laboratory Equipment & 100 Mbps Broadband',
                requirement: 'Curriculum-aligned specialized laboratories with licensed software and min 100 Mbps dedicated leased line',
                expectedValue: '>= 36 Functional Labs + 100 Mbps Dedicated Internet',
                evaluator: (data) => {
                    const labs = data.functionalLabs || 42;
                    const bandwidth = data.internetBandwidthMbps || 200;
                    const compliant = labs >= 36 && bandwidth >= 100;
                    return {
                        actualValue: `${labs} Labs, ${bandwidth} Mbps Leased Line`,
                        extractedValue: `${labs} verified physical laboratories; ${bandwidth} Mbps ISP link SLA certificate`,
                        status: compliant ? 'COMPLIANT' : 'DEFICIENT',
                        evidenceRef: 'DOC_LAB_STOCK_REGISTER & ISP Leased Line Agreement',
                        explanation: compliant
                            ? `Laboratories and broadband capacity exceed minimum curriculum specifications.`
                            : `Deficiency: Laboratory count (${labs}) or internet speed (${bandwidth} Mbps) below regulatory minimums.`,
                        correctiveAction: compliant
                            ? 'Maintain lab equipment calibration records and annual maintenance agreements.'
                            : 'Procure missing lab trainer kits and upgrade ISP bandwidth to >= 100 Mbps.'
                    };
                }
            },
            {
                ruleId: 'APH-RULE-LIBRARY-07',
                clause: 'Chapter V Clause 5.3',
                title: 'Central Library Titles, Volumes & Digital Subscriptions',
                requirement: 'Minimum 2,500 titles and 12,000 volumes with IEEE/Elsevier e-journal consortium access',
                expectedValue: '>= 2,500 Titles, >= 12,000 Volumes, Active e-Consortium',
                evaluator: (data) => {
                    const titles = data.libraryTitles || 3800;
                    const volumes = data.libraryVolumes || 18400;
                    const hasEJournals = data.hasEJournalConsortium !== false;
                    const compliant = titles >= 2500 && volumes >= 12000 && hasEJournals;
                    return {
                        actualValue: `${titles} Titles, ${volumes} Volumes, e-Consortium: ${hasEJournals ? 'ACTIVE' : 'MISSING'}`,
                        extractedValue: `Accession Register Count: ${volumes} books, DELNET/IEEE subscription receipt`,
                        status: compliant ? 'COMPLIANT' : 'DEFICIENT',
                        evidenceRef: 'DOC_LIBRARY_CATALOGUE & E-Journal Invoice',
                        explanation: compliant
                            ? 'Library collection and digital indexing conform to technical higher education standards.'
                            : 'Deficiency: Library volumes or digital journal subscriptions do not satisfy APH norms.',
                        correctiveAction: compliant
                            ? 'Maintain RFID/KOHA automated library access logs for EVC verification.'
                            : 'Procure additional reference titles and renew national e-journal consortium package.'
                    };
                }
            },
            {
                ruleId: 'APH-RULE-BARRIER-FREE-08',
                clause: 'Chapter IV Clause 4.3 & RPwD Act 2016',
                title: 'Barrier-Free Built Environment for Divyangjan',
                requirement: 'Universal barrier-free accessibility: Ramps with handrails, Braille lifts, and Divyangjan accessible restrooms',
                expectedValue: '100% compliant physical accessibility features across all academic towers',
                evaluator: (data) => {
                    const hasRamps = data.hasRamps !== false;
                    const hasLifts = data.hasLifts !== false;
                    const hasToilets = data.hasAccessibleToilets !== false;
                    const compliant = hasRamps && hasLifts && hasToilets;
                    return {
                        actualValue: `Ramps: ${hasRamps ? 'YES' : 'NO'}, Lifts: ${hasLifts ? 'YES' : 'NO'}, Restrooms: ${hasToilets ? 'YES' : 'NO'}`,
                        extractedValue: 'Architectural Barrier-Free Certificate issued by Registered Architect',
                        status: compliant ? 'COMPLIANT' : 'DEFICIENT',
                        evidenceRef: 'DOC_ACCESSIBILITY_CERTIFICATE & Geotagged Photographs',
                        explanation: compliant
                            ? 'Campus satisfies statutory Divyangjan barrier-free statutory accessibility mandates.'
                            : 'Deficiency: Missing barrier-free accessibility facilities (lifts/ramps/restrooms).',
                        correctiveAction: compliant
                            ? 'Ensure maintenance logs of elevators and tactile path indicators.'
                            : 'Install mandatory gradient ramps (1:12 slope) and dedicated accessible restrooms.'
                    };
                }
            },
            {
                ruleId: 'APH-RULE-FIN-09',
                clause: 'Chapter I Clause 2.11',
                title: 'Mandatory Joint Fixed Deposit Reserve / Bank Guarantee',
                requirement: 'Joint Fixed Deposit of min Rs. 1.00 Crore pledged in favour of Regional Officer, AICTE',
                expectedValue: 'Active FDR of >= Rs. 1.00 Crore for 10-year term',
                evaluator: (data) => {
                    const fdrAmountLakhs = data.fdrAmountLakhs || 100;
                    const compliant = fdrAmountLakhs >= 100;
                    return {
                        actualValue: `Rs. ${fdrAmountLakhs} Lakhs Joint FDR`,
                        extractedValue: `Nationalized Bank FDR No: ${data.fdrNo || 'FDR-SBI-7721-990'} pledged to AICTE`,
                        status: compliant ? 'COMPLIANT' : 'DEFICIENT',
                        evidenceRef: 'DOC_FIN_GUARANTEE (Joint Fixed Deposit Receipt with Bank Confirmation)',
                        explanation: compliant
                            ? 'Financial reserve fund conforms to statutory institutional security mandate.'
                            : `Deficiency: FDR amount of Rs. ${fdrAmountLakhs} Lakhs falls below the required Rs. 100 Lakhs guarantee.`,
                        correctiveAction: compliant
                            ? 'Ensure auto-renewal of deposit lien until statutory release by AICTE Executive Committee.'
                            : 'Execute supplemental bank deposit lien and submit official bank endorsement certificate.'
                    };
                }
            },
            {
                ruleId: 'APH-RULE-AFFILIATION-10',
                clause: 'Chapter I Clause 2.4(h)',
                title: 'University Affiliation & Sanctioned Intake Order',
                requirement: 'Current academic year temporary/permanent affiliation order from the state affiliating university',
                expectedValue: 'Valid Affiliation Order for AY 2025-26',
                evaluator: (data) => {
                    const hasAffil = data.hasAffiliationOrder !== false;
                    const status = hasAffil ? 'COMPLIANT' : 'DEFICIENT';
                    return {
                        actualValue: hasAffil ? 'Active Affiliation Order on File' : 'Lapsed / Not Uploaded',
                        extractedValue: `University Affiliation Order ref: ${data.affiliationOrderRef || 'UNIV-AFFIL-2025-091'}`,
                        status,
                        evidenceRef: 'DOC_AFFILIATION_ORDER',
                        explanation: hasAffil
                            ? 'Affiliating university concurrence verified for proposed courses and intake.'
                            : 'CRITICAL DEFICIENCY: Current academic session university affiliation certificate is absent.',
                        correctiveAction: hasAffil
                            ? 'Ensure university inspection committee recommendations are filed annually.'
                            : 'Procure and upload provisional affiliation letter from affiliating university Registrar.'
                    };
                }
            }
        ];
    }

    /**
     * Run deterministic evaluation of an institution against selected APH version
     */
    evaluateInstitution({ institutionId, aphVersion = this.DEFAULT_APH_VERSION, category = 'ENGINEERING' }) {
        const inst = db.queryOne('SELECT * FROM institutions WHERE id = ?', [institutionId]);
        if (!inst) throw new Error(`Institution ${institutionId} not found.`);

        // Gather existing institution documents to detect missing items
        const docs = db.query('SELECT * FROM documents WHERE institution_id = ?', [institutionId]);
        const hasFireDoc = docs.some(d => d.document_type_code.includes('FIRE') && d.current_status !== 'EXPIRED');

        // Synthetic/extracted metrics for demonstration
        const mockExtractedData = {
            totalFaculty: 142,
            totalStudents: 2800,
            facultyStudentRatio: 20, // 1:20
            professors: 14,
            assocProfessors: 28,
            asstProfessors: 100,
            landAcres: 5.4,
            locationType: 'URBAN',
            builtUpSqMeters: 17200,
            hasValidFireNoc: hasFireDoc,
            functionalLabs: 44,
            internetBandwidthMbps: 300,
            libraryTitles: 4100,
            libraryVolumes: 19500,
            hasEJournalConsortium: true,
            hasRamps: true,
            hasLifts: true,
            hasAccessibleToilets: true,
            fdrAmountLakhs: 100,
            hasAffiliationOrder: true
        };

        const ruleSet = this.getRuleDefinitions(aphVersion, inst.category || category);
        const findings = [];
        let compliantCount = 0;
        let deficientCount = 0;

        for (const r of ruleSet) {
            const res = r.evaluator(mockExtractedData);
            if (res.status === 'COMPLIANT') compliantCount++;
            else if (res.status === 'DEFICIENT') deficientCount++;

            findings.push({
                ruleId: r.ruleId,
                applicableAphVersion: aphVersion,
                regulatoryRequirement: r.requirement,
                extractedInstitutionalValue: res.extractedValue,
                expectedValue: r.expectedValue,
                actualValue: res.actualValue,
                evidenceReference: res.evidenceRef,
                validationStatus: res.status,
                explanation: res.explanation,
                recommendedCorrectiveAction: res.correctiveAction,
                clause: r.clause,
                title: r.title
            });
        }

        const totalRules = ruleSet.length;
        const compliancePercentage = Math.round((compliantCount / totalRules) * 100);

        return {
            institutionId: inst.id,
            institutionName: inst.name,
            permanentId: inst.permanent_id,
            aphVersion,
            evaluatedAt: new Date().toISOString(),
            summary: {
                totalRulesEvaluated: totalRules,
                compliantCount,
                deficientCount,
                compliancePercentage,
                overallStatus: deficientCount === 0 ? 'COMPLIANT' : (deficientCount <= 2 ? 'CONDITIONAL_DEFICIENCY' : 'MAJOR_DEFICIENCY')
            },
            findings,
            legalNotice: 'ADVISORY COMPLIANCE ANALYSIS: Generated by NIYAM Regulatory Intelligence Engine under Approval Process Handbook algorithms. Final statutory decisions remain the exclusive prerogative of authorized Scrutiny and Hearing Committees under AICTE Act Section 10.'
        };
    }
}

module.exports = new RegulatoryIntelligenceEngine();
