/**
 * Establishment Created Email Template
 * Sent to business owners when their establishment is created by system admin
 */

import { EmailTemplate } from './types';

/**
 * Establishment Created Email Template
 */
export class EstablishmentCreatedTemplate {
  
  /**
   * Get the establishment created email template
   */
  public static getTemplate(): EmailTemplate {
    return {
      id: 'establishment_created',
      name: 'Establishment Created',
      subject: 'Welcome to MuseBar! Your establishment has been created',
      category: 'business',
      isBuiltIn: true,
      isActive: true,
      variables: [
        'establishment_name',
        'business_owner_email',
        'subscription_plan',
        'invitation_link',
        'setup_instructions',
        'support_email'
      ],
      htmlBody: this.getHtmlBody(),
      textBody: this.getTextBody()
    };
  }

  /**
   * Get HTML body template
   */
  private static getHtmlBody(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to MuseBar</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        .welcome-message {
            font-size: 24px;
            color: #28a745;
            margin-bottom: 20px;
        }
        .establishment-info {
            background-color: #f8f9fa;
            border-left: 4px solid #007bff;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .setup-button {
            display: inline-block;
            background-color: #007bff;
            color: #ffffff;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }
        .setup-button:hover {
            background-color: #0056b3;
        }
        .instructions {
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .instructions h3 {
            color: #0056b3;
            margin-top: 0;
        }
        .instructions ol {
            margin: 15px 0;
            padding-left: 20px;
        }
        .instructions li {
            margin-bottom: 8px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 14px;
        }
        .support-link {
            color: #007bff;
            text-decoration: none;
        }
        .support-link:hover {
            text-decoration: underline;
        }
        .expiry-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🍷 MuseBar</div>
            <div class="welcome-message">Welcome to MuseBar!</div>
            <p>Your establishment has been successfully created</p>
        </div>

        <div class="establishment-info">
            <h3>Establishment Details</h3>
            <p><strong>Name:</strong> {{establishment_name}}</p>
            <p><strong>Email:</strong> {{business_owner_email}}</p>
            <p><strong>Plan:</strong> {{subscription_plan}} (Capitalized)</p>
        </div>

        <div class="instructions">
            <h3>🚀 Complete Your Setup</h3>
            <p>To get your establishment up and running, please complete the following steps:</p>
            <ol>
                <li><strong>Click the setup button below</strong> to access your establishment</li>
                <li><strong>Create your admin account</strong> with secure credentials</li>
                <li><strong>Configure your business settings</strong> (hours, location, etc.)</li>
                <li><strong>Set up your menu and products</strong> to start taking orders</li>
                <li><strong>Invite your team members</strong> to help manage operations</li>
            </ol>
        </div>

        <div style="text-align: center;">
            <a href="{{invitation_link}}" class="setup-button">
                🚀 Complete Setup Now
            </a>
        </div>

        <div class="expiry-notice">
            <strong>⏰ Important:</strong> Your setup invitation expires in 7 days. 
            Please complete the setup process before then.
        </div>

        <div class="footer">
            <p>Need help? Contact our support team at 
                <a href="mailto:{{support_email}}" class="support-link">{{support_email}}</a>
            </p>
            <p>© 2025 MuseBar. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Get text body template
   */
  private static getTextBody(): string {
    return `
Welcome to MuseBar!

Your establishment has been successfully created and is ready for setup.

ESTABLISHMENT DETAILS:
- Name: {{establishment_name}}
- Email: {{business_owner_email}}
- Plan: {{subscription_plan}}

SETUP INSTRUCTIONS:
To complete your establishment setup, please follow these steps:

1. Click the setup link: {{invitation_link}}
2. Create your admin account with secure credentials
3. Configure your business settings (hours, location, etc.)
4. Set up your menu and products to start taking orders
5. Invite your team members to help manage operations

IMPORTANT: Your setup invitation expires in 7 days. Please complete the setup process before then.

Need help? Contact our support team at {{support_email}}

© 2025 MuseBar. All rights reserved.
`;
  }
}
