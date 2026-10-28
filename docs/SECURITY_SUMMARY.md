# SECURITY IMPLEMENTATION & DATA PROTECTION SUMMARY
## AICTE Smart Approval & Compliance Management System

---

## 1. Security by Design Foundation
The platform has been engineered adhering strictly to Indian digital governance guidelines, including:
- **CERT-In Guidance on Cyber Security Best Practices**
- **Digital Personal Data Protection (DPDP) Act Compliance Principles**
- **OWASP Top 10 Enterprise Application Safeguards**

## 2. Mandatory Security Controls
1. **Cryptographic Password Storage:** Passwords derived using the `Scrypt` key derivation function with random 16-byte unique salts, preventing dictionary attacks and GPU cracking.
2. **Signed Token-Based Session Management:** Signed HMAC-SHA256 tokens with configurable expiration (86400s) and non-replayable timestamp headers.
3. **Server-Enforced Authorization:** Every endpoint executes server-side role validation. Client-side hiding of UI elements is treated purely as visual convenience; server middleware enforces hard 403 Forbidden errors.
4. **Row-Level Jurisdictional Isolation:** Regional Officers cannot access cases or institutions outside their designated `region_id`. Institution Representatives cannot access applications, documents, or deficiencies of any other institution.
5. **Tamper-Evident Chained Audit Trail:**
   Every material transaction (creation, transition, deficiency, renewal, verification, hold) is cryptographically signed using SHA-256 in a Merkle/Blockchain linked list:
   $$\text{CurrentHash} = \text{SHA256}(\text{PrevHash} \parallel \text{UUID} \parallel \text{Actor} \parallel \text{Action} \parallel \text{Entity} \parallel \text{PrevState} \parallel \text{NewState} \parallel \text{Justification} \parallel \text{Timestamp})$$
   Any out-of-band direct database edit to historical rows breaks the chain immediately, pinpointing the exact modified record ID during automated verification!
6. **Input Sanitization & Safe Parameterization:** 100% of SQL operations utilize prepared statements with parameter binding, eliminating SQL injection vulnerabilities.
7. **File Security & Validity Rules:** Uploaded documents are constrained to approved MIME types (PDF, PNG, JPG) with strict file size limits and sandboxed storage paths.
