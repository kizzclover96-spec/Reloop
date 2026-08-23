export const PRIVACY_POLICY = `# Privacy Policy

Last updated: 22 August 2026

1. Who is responsible for your data
The data controller for Reloop is Malvin AI , headquartered at im waager 41, 72581 Baden-Württemberg, Germany (registered , Dettingen Mitte). Contact: praiseangel509@gmail.com. We have not appointed a Data Protection Officer because our processing activities do not meet the criteria in Article 37 GDPR (e.g. large-scale monitoring or processing of special categories). For privacy inquiries, you can contact our team at the email above.

2. What data we collect
Account data: Your name and email, and a hashed password (managed by Firebase Authentication, so we never see your plaintext password).
Pickup/shipping address: Street, number, postal code, city, country – entered by you and verified via Google Maps/Geocoding API. This is required to process and fulfill orders.
Listing content: Photos, titles, descriptions, category, price, and package size that you submit when creating a listing.
Order and transaction data: Records of what you buy or sell, order status, shipping tracking numbers, and payment amounts.
Payment-related data: References such as Stripe customer IDs and payment method tokens. We do not collect your full card number or CVC – Stripe handles payment details directly under its own terms (see https://stripe.com/privacy).
Device and usage data (local only): We store certain app data locally in your browser (e.g. recently viewed items, shopping cart, preferences) using IndexedDB. This information is not sent to our servers.
Communications: Any messages or support requests you send to us.
3. Why we process your data, and our legal basis
Purpose	Legal basis (Art. 6 GDPR)
Account creation and management	Performance of a contract (Art. 6(1)(b))
Payment processing and payouts	Performance of a contract (Art. 6(1)(b))
Address verification & shipment tracking	Performance of a contract (Art. 6(1)(b))
Automated listing moderation	Legitimate interest in a safe, lawful marketplace (Art. 6(1)(f))
Fraud prevention and security	Legitimate interest (Art. 6(1)(f))
Tax, accounting, legal compliance	Legal obligation (Art. 6(1)(c))
Marketing communications (optional)	Consent (Art. 6(1)(a)) – you may withdraw consent anytime

We handle your data only as needed for these purposes. For example, uploading a photo to a listing is necessary to run the marketplace (contract performance), while scanning listing content with AI helps us enforce rules (legitimate interest).

4. Who we share data with
We share data with service providers (subprocessors) who assist us. Each processor only handles data as instructed and must implement security measures under their agreements. Notable subprocessors include:

Stripe, Inc. (payment processing, payouts, fraud checks): We transmit transaction amounts, payment method tokens, and billing details to Stripe. Stripe’s published Data Processing Agreement includes EU Standard Contractual Clauses and the EU–US Data Privacy Framework, among other safeguards. (Stripe’s own Privacy Policy is at https://stripe.com/privacy.)

Google LLC (Firebase / Google Cloud Platform): We use Firebase for authentication, Firestore/Cloud Storage for our database, and GCP for hosting. This involves storing account data, listing data, and uploaded files on Google servers. Google has certified compliance with the EU–US Privacy Framework and relies on approved Standard Contractual Clauses for data transfers. See Google’s privacy site at https://policies.google.com/privacy.

Google Maps Platform: When you enter an address, we verify it using Google’s Geocoding API. We only send the text of the address for validation. Google’s transfer frameworks also apply here.

Google Gemini (AI moderation): We submit listing photos and text to Google’s Gemini API for automated safety review. This involves sending content (images and description text) to Google. The same safeguards (Privacy Framework, SCCs) apply as above.

AfterShip Pte. Ltd.: We use AfterShip to verify shipment tracking numbers and carriers. AfterShip processes tracking numbers and carrier data on our behalf. For transfers from the EEA to third countries, AfterShip relies on the European Commission’s Standard Contractual Clauses or equivalent mechanisms (see AfterShip’s privacy policy at https://www.aftership.com/privacy-policy).

No third parties receive your personal data for their own marketing. We do not sell your personal data to anyone.

5. International transfers
Some data processing by the above providers may occur outside the European Economic Area. We rely on their provided safeguards. For example, Stripe’s DPA explicitly includes the EU Standard Contractual Clauses and the EU–US Data Privacy Framework. Google LLC has certified under the EU–US Privacy Framework and uses EU SCCs for other transfers. AfterShip similarly uses EU-approved SCCs for any cross-border transfer. These measures ensure compliance with Article 46 GDPR requirements for international transfers.

6. How long we keep your data
We retain personal data only as long as necessary for the purposes above and to comply with legal obligations:

Account data: Kept while your account is active, plus any additional time required by law. Under German commercial and tax law, we must keep transaction and accounting records for up to 10 years (e.g. invoices, order records). We anonymize or delete personal identifiers in those records once allowed.
Listing content: Removed when a listing is sold or deleted, except we may keep certain details as part of an order record for accounting purposes (subject to the same 10-year rule).
Local device data (cart, recently viewed, preferences): Stored in your browser’s local storage. It remains on your device until you clear it or delete your account; our servers do not receive this data.
Communications: Support messages are kept as needed for reference and are deleted when no longer necessary.
When you delete your account (via the in-app “Delete” function), we remove your profile, listings, and Stripe account linkage. We instruct Stripe to close your account and delete payment references as allowed. We also purge most personal data. If any transaction records must be retained (for example, an order you placed that the seller legally must keep), we replace your name with a generic placeholder so you are not identified.

7. Your rights under GDPR
You have the following rights regarding your personal data:

Access (Art. 15): You can request a copy of your data we hold.
Rectification (Art. 16): You can ask to correct inaccurate personal data.
Erasure (“Right to be forgotten”) (Art. 17): You can request deletion of data when it’s no longer needed or if consent is withdrawn (subject to legal obligations).
Restriction (Art. 18): You can request we suspend processing your data in certain cases.
Data portability (Art. 20): You can request a machine-readable copy of data you provided, to transfer to another service (we support this via the in-app “download my data”).
Objection (Art. 21): You can object to processing based on legitimate interests or for direct marketing.
Withdraw consent (Art. 7(3)): If you gave consent (e.g. for marketing), you can withdraw it at any time without affecting processing done beforehand.
Automated decision-making (Art. 22): You have a right to human review of automated decisions. In our case, if our AI rejects your listing, you may request a person to review the decision (see Section 8 below).
The GDPR explicitly grants these rights (Articles 15–22). To exercise your rights, use our in-app features (Download Data or Delete Account) or contact us at privacy@malvinai.com. We will respond within one month as required by law. You also have a right to lodge a complaint with a supervisory authority. In Germany, this is typically the Federal Commissioner for Data Protection (BfDI) or your state’s Data Protection Authority (e.g. the Berlin DPA).

8. Automated decision-making
Our platform uses an AI model (Google Gemini) to automatically review new listings for compliance. This is a “solely automated” process that can result in a listing being rejected without human intervention. Under GDPR Article 22, you have the right to request human intervention for any automated decision that significantly affects you. In practice, if your listing is automatically rejected and you believe this is an error, please contact us at privacy@malvinai.com. We will arrange a manual review of the listing.

9. Cookies and local storage
Reloop does not use any tracking or advertising cookies. We use your browser’s local storage (IndexedDB) only to maintain your session, shopping cart, recently viewed items, and preferences. This local storage data is functionally necessary for the app and is never shared or used for tracking across other sites. You can clear this data via your browser settings or by deleting your account.

10. Children
Reloop is not intended for use by anyone under 18. We do not knowingly collect personal data from children. If we become aware that a child has provided us with personal data, we will promptly delete it.

11. Security
We use industry-standard security measures to protect your data. All data in transit between your device and our servers is encrypted via HTTPS/TLS. Access to our backend systems is restricted and requires authentication. Sensitive data like payment information is sent directly to Stripe and does not touch our servers. We implement role-based access controls and follow best practices for cloud security. However, no system is 100% secure, so please also protect your account by keeping your credentials safe.

12. Changes to this policy
We may update this Privacy Policy from time to time (for example, to reflect new legal requirements or service changes). We will post any updates here with a new “Last updated” date. Material changes will be notified in the app or by email before they take effect.

13. Contact
If you have any questions about this Privacy Policy or our data practices, contact us at privacy@malvinai.com. For more information on data protection, you can also consult the Federal Data Protection Commissioner (BfDI) or your local state authority (for example, the Berlin Commissioner for Data Protection).

Sources: This policy incorporates GDPR principles (Articles 6–22) and reflects standard practices (see, e.g., GDPR Articles 15–22, DPA requirements for subprocessors, and German retention law).
`;
