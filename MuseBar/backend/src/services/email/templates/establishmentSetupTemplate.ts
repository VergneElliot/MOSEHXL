/**
 * Establishment Setup Template
 * Email template for establishment setup completion
 */

import { EmailTemplate, BuiltInTemplateId } from './types';

/**
 * Establishment setup completion template
 */
export class EstablishmentSetupTemplate {
  
  /**
   * Get establishment setup template
   */
  public static getTemplate(): EmailTemplate {
    return {
      id: BuiltInTemplateId.ESTABLISHMENT_SETUP,
      name: 'Establishment Setup Complete',
      subject: 'Welcome to MuseBar POS - {{establishmentName}} is ready!',
      variables: ['ownerName', 'establishmentName', 'loginUrl', 'supportUrl', 'dashboardUrl', 'setupDate'],
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Establishment Setup Complete</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { 
            display: inline-block; 
            background: #667eea; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 15px 10px; 
            font-weight: bold;
        }
        .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .feature-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
        .success-badge { background: #4caf50; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 10px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        @media (max-width: 600px) { .feature-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Congratulations!</h1>
            <h2>{{establishmentName}} is Live on MuseBar POS</h2>
            <div class="success-badge">✅ Setup Complete</div>
        </div>
        
        <div class="content">
            <h3>Hello {{ownerName}},</h3>
            
            <p>Fantastic news! Your establishment <strong>{{establishmentName}}</strong> has been successfully set up on MuseBar POS. You're now ready to start managing your business like never before!</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{loginUrl}}" class="button">🚀 Access Your Dashboard</a>
                <a href="{{supportUrl}}" class="button">📚 View Getting Started Guide</a>
            </div>
            
            <h3>🌟 What's Next? Your MuseBar POS Features:</h3>
            
            <div class="feature-grid">
                <div class="feature-box">
                    <h4>🍺 Order Management</h4>
                    <p>Process orders, manage tables, and handle payments seamlessly</p>
                </div>
                <div class="feature-box">
                    <h4>📊 Real-time Analytics</h4>
                    <p>Track sales, monitor performance, and gain business insights</p>
                </div>
                <div class="feature-box">
                    <h4>👥 Staff Management</h4>
                    <p>Create user accounts, assign roles, and monitor activity</p>
                </div>
                <div class="feature-box">
                    <h4>📋 Inventory Control</h4>
                    <p>Track stock levels, manage suppliers, and automate reordering</p>
                </div>
                <div class="feature-box">
                    <h4>💳 Payment Processing</h4>
                    <p>Accept multiple payment methods with integrated processing</p>
                </div>
                <div class="feature-box">
                    <h4>⚖️ Legal Compliance</h4>
                    <p>Automated reporting and compliance with local regulations</p>
                </div>
            </div>
            
            <h3>🎯 Quick Start Checklist:</h3>
            <ul>
                <li>✅ <strong>Establishment Setup</strong> - Complete ({{setupDate}})</li>
                <li>📝 <strong>Add Products & Categories</strong> - Start building your menu</li>
                <li>👥 <strong>Invite Staff Members</strong> - Add your team to the system</li>
                <li>💳 <strong>Configure Payment Methods</strong> - Set up your preferred payment options</li>
                <li>📱 <strong>Test First Order</strong> - Process a test transaction</li>
                <li>📊 <strong>Explore Dashboard</strong> - Familiarize yourself with reports and analytics</li>
            </ul>
            
            <div style="background: #e3f2fd; border: 1px solid #2196f3; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h4>💡 Pro Tips for Success:</h4>
                <ul>
                    <li><strong>Start Small:</strong> Add a few key products first, then expand your menu</li>
                    <li><strong>Train Your Team:</strong> Ensure all staff know how to use the system</li>
                    <li><strong>Monitor Daily:</strong> Check your daily reports to track performance</li>
                    <li><strong>Use Analytics:</strong> Leverage insights to optimize your operations</li>
                </ul>
            </div>
            
            <h3>🛟 Need Help?</h3>
            <p>Our support team is here to help you succeed:</p>
            <ul>
                <li>📚 <a href="{{supportUrl}}">Comprehensive Documentation</a></li>
                <li>💬 24/7 Chat Support (available in your dashboard)</li>
                <li>📞 Phone Support: 1-800-MUSEBAR</li>
                <li>📧 Email Support: support@musebar.com</li>
            </ul>
            
            <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h4>🔐 Important Account Information:</h4>
                <ul>
                    <li><strong>Dashboard URL:</strong> <a href="{{dashboardUrl}}">{{dashboardUrl}}</a></li>
                    <li><strong>Setup Date:</strong> {{setupDate}}</li>
                    <li><strong>Account Type:</strong> Professional POS System</li>
                </ul>
            </div>
            
            <p>Thank you for choosing MuseBar POS. We're excited to be part of your business journey and look forward to helping you achieve success!</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{loginUrl}}" class="button">🎯 Start Using MuseBar POS Now</a>
            </div>
            
            <p>Best regards,<br>
            <strong>The MuseBar POS Team</strong></p>
        </div>
        
        <div class="footer">
            <p>Welcome to the MuseBar POS family! This email was sent to confirm your successful setup.</p>
            <p>MuseBar POS - Professional Point of Sale Solutions for Modern Establishments</p>
        </div>
    </div>
</body>
</html>`,
      textBody: `
Congratulations! {{establishmentName}} is Live on MuseBar POS

Hello {{ownerName}},

Fantastic news! Your establishment {{establishmentName}} has been successfully set up on MuseBar POS. You're now ready to start managing your business like never before!

ACCESS YOUR DASHBOARD: {{loginUrl}}
GETTING STARTED GUIDE: {{supportUrl}}

YOUR MUSEBAR POS FEATURES:
- Order Management: Process orders, manage tables, and handle payments seamlessly
- Real-time Analytics: Track sales, monitor performance, and gain business insights
- Staff Management: Create user accounts, assign roles, and monitor activity
- Inventory Control: Track stock levels, manage suppliers, and automate reordering
- Payment Processing: Accept multiple payment methods with integrated processing
- Legal Compliance: Automated reporting and compliance with local regulations

QUICK START CHECKLIST:
✅ Establishment Setup - Complete ({{setupDate}})
📝 Add Products & Categories - Start building your menu
👥 Invite Staff Members - Add your team to the system
💳 Configure Payment Methods - Set up your preferred payment options
📱 Test First Order - Process a test transaction
📊 Explore Dashboard - Familiarize yourself with reports and analytics

PRO TIPS FOR SUCCESS:
- Start Small: Add a few key products first, then expand your menu
- Train Your Team: Ensure all staff know how to use the system
- Monitor Daily: Check your daily reports to track performance
- Use Analytics: Leverage insights to optimize your operations

NEED HELP?
- Documentation: {{supportUrl}}
- 24/7 Chat Support (available in your dashboard)
- Phone Support: 1-800-MUSEBAR
- Email Support: support@musebar.com

ACCOUNT INFORMATION:
- Dashboard URL: {{dashboardUrl}}
- Setup Date: {{setupDate}}
- Account Type: Professional POS System

Thank you for choosing MuseBar POS. We're excited to be part of your business journey and look forward to helping you achieve success!

Start using MuseBar POS now: {{loginUrl}}

Best regards,
The MuseBar POS Team

---
Welcome to the MuseBar POS family! This email was sent to confirm your successful setup.
MuseBar POS - Professional Point of Sale Solutions for Modern Establishments
      `.trim(),
      category: 'onboarding',
      isBuiltIn: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
