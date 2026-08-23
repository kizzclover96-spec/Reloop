export const DATA_PROCESSING_AGREEMENT = `

# Data Processing Agreement / Transparency Statement

**Last Updated:** 23.08.2026

**Important:** This document explains how Reloop (operated by MalvinAI, owned by Malvin) processes personal data in the Reloop marketplace. It is not a legally signed DPA with consumers, but rather a transparency notice. A separate signed DPA will be provided for any business-to-business controller–processor relationship (e.g. with third-party sellers). Please review our Privacy Policy for full details.

## 1. Parties and Roles

Reloop is operated by malvinai (referred to as “Reloop”, “we”, or “us”), a company owned by Malvin under the MalvinAI enterprise. Reloop is typically the **data controller** for processing done on the marketplace (see Privacy Policy). If acting as processor: For certain order-related data, we may act as a **processor** on behalf of a seller. Sellers on Reloop are controllers of purchase data involving their customers. Buyers (private users) are the data subjects.

## 2. Processing Purposes and Basis

We process your data to operate Reloop: creating accounts, listing items, enabling orders, secure payments (via Stripe), and detecting fraud. Legal bases include your consent (e.g. for marketing), performance of contracts (order delivery), and our legitimate interests (service improvement, platform security). Processor case: For order data sent to sellers, processing is by the seller’s instruction.

## 3. Subprocessors

We engage the following subprocessors (each under contract to process only as instructed, with confidentiality and security obligations):

| Subprocessor           | Role                                 | Data Processed                                        |
|------------------------|--------------------------------------|-------------------------------------------------------|
| Stripe, Inc.           | Payment processing, payouts, fraud   | Payment tokens, billing info, transaction amounts     |
| Google LLC (Firebase)  | Auth, database, hosting              | Account info, listings, photos, messaging data        |
| Google LLC (Maps API)  | Address verification                 | Address text (for shipping/pickup validation)         |
| Google LLC (Gemini API)| AI-powered content moderation        | Listing text and images submitted for review          |
| AfterShip Pte. Ltd.    | Shipment tracking verification       | Tracking numbers, carrier info                        |
| *Other subprocessors*  | Email, analytics, etc. (e.g. Google Analytics, CRM) | praiseangel509@gmail.coms, usage data, support logs   |

Each subprocessor’s DPA or terms impose GDPR-level obligations. We will update this list and notify users of any material changes.

## 4. Security Measures

We implement strong technical and organizational measures (Art. 32 GDPR): 
- Encryption of all data in transit (HTTPS/TLS) and at rest; regular backups are encrypted.
- Access controls: only authorized personnel and services can access data, under strict authentication.
- Firestore security rules and database roles ensure users can only access their own data.
- Regular security audits, vulnerability scanning, and patch management.
- Personnel training and confidentiality commitments.

These measures follow industry standards (ISO 27001) and German supervisory expectations. Payment data is handled exclusively by Stripe (Reloop never sees full card numbers).

## 5. International Transfers

Some subprocessors (Stripe, Google, AfterShip) are based outside the EEA. Reloop relies on **appropriate safeguards** for these transfers. For example, transfers to the US are governed by the EU Standard Contractual Clauses (and where available, the EU–US Data Privacy Framework) as part of those services. We conduct transfer impact assessments and limit data exported to what is necessary. If a subprocessor is in a country without adequacy (e.g. US, Singapore), we ensure SCCs are in place.

## 6. Data Subject Rights

You may exercise your GDPR rights (access, erasure, etc.) via praiseangel509@gmail.com. We will respond within the legal timeframe. If your request involves data processed on behalf of a seller, we will coordinate with that seller as needed. Processor clause: We assist controllers in handling data subject requests. Your privacy choices (marketing opt-out, cookie settings) are explained in our Privacy Policy.

## 7. Retention and Deletion

We retain personal data only as long as necessary. Accounts and listings are kept until deletion. Order and transaction data may be kept for up to 10 years for legal compliance (tax/accounting rules). Otherwise we delete or anonymize data after it is no longer needed. When you delete your account, we will erase your personal data from our systems and instruct subprocessors to do the same, except for any data legally required to be kept (e.g. billing records). Backups are encrypted and purged regularly; restoration procedures ensure deleted data is not reinstated.

## 8. Breach Notification

If Reloop (as controller) suffers a personal data breach, we will notify the German Data Protection Authority (BfDI) within 72 hours (Art. 33 GDPR), and inform affected users if there is a high risk. If Reloop (as processor) learns of a breach affecting a seller’s data, we will notify that seller immediately (Art. 33(2) GDPR) and cooperate. Notifications include the breach’s nature, affected data categories, likely consequences, and measures taken.

## 9. Consumer Transparency vs. Business DPA

This document serves as a transparency statement for users. It does not require signing. If Reloop processes data *on behalf of* another company (e.g. a seller acting as controller), a separate **Data Processing Agreement** (Art. 28 contract) will be executed between Reloop (processor) and that company (controller). The formal DPA will contain all legal clauses under GDPR Art. 28(3) (processing instructions, audits, subprocessor terms, liability, etc.) as summarized above. Users should consult the Privacy Policy for full details of Reloop’s data practices. 

## 10. Contact

For questions about this document or data processing, contact **praiseangel509@gmail.com**.

`;
