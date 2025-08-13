// src/pages/PrivacyPolicy/PrivacyPolicy.jsx
import React from 'react';
import './PrivacyPolicyPage.css';

export default function PrivacyPolicy() {
  return (
    <div className="policy-page">
      <article className="policy-container">
        <h1>Privacy Policy</h1>
        <p><strong>Effective Date:</strong> January 1, 2025<br />
           <strong>Last Updated:</strong> January 1, 2025</p>

        <h2>1. Introduction</h2>
        <p>Welcome to Akrondis ("we," "our," or "us"). This Privacy Policy explains how Akrondis Company, based in the Philippines, collects, uses, and protects your information when you use our countdown converter service for Discord accountability groups.</p>

        <h2>2. Information We Collect</h2>
        <h3>2.1 Information You Provide</h3>
        <ul>
          <li><strong>Google Account Information</strong>: When you sign in with Google, we collect your email address, display name, and profile photo</li>
          <li><strong>Discord Nickname</strong>: Your Discord username for accountability tracking</li>
          <li><strong>Goal Data</strong>: UTC timestamps and goal information you submit for countdown conversion</li>
          <li><strong>Usage Data</strong>: How you interact with our service</li>
        </ul>

        <h3>2.2 Automatically Collected Information</h3>
        <ul>
          <li><strong>Technical Data</strong>: IP address, browser type, device information</li>
          <li><strong>Usage Analytics</strong>: Pages visited, features used, session duration</li>
          <li><strong>Cookies</strong>: Essential cookies for authentication and preferences</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <ul>
          <li><strong>Provide Service</strong>: Convert UTC timestamps to Discord-formatted countdowns</li>
          <li><strong>Account Management</strong>: Maintain your user account and preferences</li>
          <li><strong>Authentication</strong>: Verify your identity through Google Sign-In</li>
          <li><strong>Discord Integration</strong>: Associate your goals with your Discord nickname</li>
          <li><strong>Service Improvement</strong>: Analyze usage to enhance our features</li>
          <li><strong>Security</strong>: Protect against unauthorized access and abuse</li>
        </ul>

        <h2>4. Information Sharing</h2>
        <p>We do not sell, trade, or rent your personal information. We may share information only in these limited circumstances:</p>
        <ul>
          <li><strong>With Your Consent</strong></li>
          <li><strong>Legal Compliance</strong></li>
          <li><strong>Service Providers</strong>: Third-party services that help us operate (Google for authentication)</li>
          <li><strong>Safety</strong></li>
        </ul>

        <h2>5. Data Storage and Security</h2>
        <ul>
          <li><strong>Location</strong>: Data is stored on secure servers provided by Vercel and Google Firebase</li>
          <li><strong>Security Measures</strong>: Industry-standard practices including encryption, secure authentication, and access controls</li>
          <li><strong>Retention</strong>: We retain your data only as long as necessary to provide our services or as required by law</li>
          <li><strong>Backup</strong>: Regular backups ensure service continuity while maintaining security</li>
        </ul>

        <h2>6. Your Rights and Choices</h2>
        <p>You have the right to access, correct, delete, export your data, or opt-out of certain processing. To exercise these rights, contact us at <a href="mailto:privacy@akrondis.com">privacy@akrondis.com</a>.</p>

        <h2>7. Cookies and Tracking</h2>
        <p>We use essential cookies for authentication, preferences, and security. We do not use tracking cookies for advertising purposes.</p>

        <h2>8. Third-Party Services</h2>
        <p>Our service integrates with Google Services, Discord, and Vercel. These services have their own privacy policies.</p>

        <h2>9. Children's Privacy</h2>
        <p>Not intended for children under 13. We do not knowingly collect data from children under 13.</p>

        <h2>10. International Data Transfers</h2>
        <p>Data may be processed in the Philippines or where our providers operate; we use appropriate safeguards.</p>

        <h2>11. Changes to This Privacy Policy</h2>
        <p>We may update this policy and will post the updated policy on our site and update the Last Updated date.</p>

        <h2>12. Contact Information</h2>
        <address>
          Akrondis Company<br />
          Email: <a href="mailto:privacy@akrondis.com">privacy@akrondis.com</a><br />
          Support: <a href="mailto:support@akrondis.com">support@akrondis.com</a><br />
          Address: Philippines
        </address>

        <h2>13. Data Protection Officer</h2>
        <p>For data protection inquiries: <a href="mailto:dpo@akrondis.com">dpo@akrondis.com</a></p>

        <h2>14. Compliance</h2>
        <p>This policy complies with the Philippines Data Privacy Act of 2012, GDPR, CCPA, and other applicable laws where feasible.</p>

        <hr />
        <p className="small">This Privacy Policy is part of our Terms of Service. By using Akrondis, you agree to both documents.</p>
      </article>
    </div>
  );
}
