// src/pages/TermsOfService/TermsOfService.jsx
import React from 'react';
import './TermsOfServicePage.css';

export default function TermsOfService() {
  return (
    <div className="policy-page">
      <article className="policy-container">
        <h1>Terms of Service</h1>

        <p><strong>Effective Date:</strong> January 1, 2025</p>

        <h2>1. Agreement to Terms</h2>
        <p>By using Akrondis (the "Service"), you agree to these Terms of Service. If you disagree, do not use the Service.</p>

        <h2>2. Service Description</h2>
        <p>Akrondis provides a countdown converter service for Discord accountability groups. The Service may be accessed via web browsers.</p>

        <h2>3. Accounts</h2>
        <p>To use certain features you must sign in with Google. You are responsible for activity on your account and safeguarding your credentials.</p>

        <h2>4. User Conduct</h2>
        <p>Users must not misuse the Service, attempt to access other accounts, or use the Service for unlawful activities.</p>

        <h2>5. Intellectual Property</h2>
        <p>All intellectual property rights for the Service belong to Akrondis or its licensors. You may not reproduce our content except as allowed.</p>

        <h2>6. Termination</h2>
        <p>We may suspend or terminate accounts that violate these Terms or for other lawful reasons.</p>

        <h2>7. Disclaimers and Limitation of Liability</h2>
        <p>The Service is provided "as is". We disclaim warranties and limit liability to the maximum extent permitted by law.</p>

        <h2>8. Governing Law</h2>
        <p>These Terms are governed by the laws applicable where Akrondis is based (Philippines) unless otherwise required by local rules for specific users.</p>

        <h2>9. Changes to Terms</h2>
        <p>We may update these Terms & will notify users of material changes by posting the updated terms and changing the "Last Updated" date.</p>

        <hr />
        <p className="small">If you have questions, contact <a href="mailto:support@akrondis.com">support@akrondis.com</a></p>
      </article>
    </div>
  );
}
