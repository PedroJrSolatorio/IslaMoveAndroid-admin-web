const BREVO_API_KEY = process.env.REACT_APP_BREVO_API_KEY;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Send email using Brevo API
 * @param {Object} emailData - Email configuration
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.toName - Recipient name
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.htmlContent - HTML email content
 */

let emailsSentToday = 0;
const EMAIL_LIMIT = 300;

export const sendEmail = async (emailData) => {
  if (emailsSentToday >= EMAIL_LIMIT) {
    console.warn("Daily email limit reached");
    return { success: false, error: "Daily limit reached" };
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Islamove Admin",
          email: "noreply@islamove.com", // Change to your verified sender email
        },
        to: [
          {
            email: emailData.to,
            name: emailData.toName,
          },
        ],
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Brevo API Error:", error);
      throw new Error(
        `Failed to send email: ${error.message || response.statusText}`
      );
    }

    const result = await response.json();
    console.log("Email sent successfully:", result);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }

  emailsSentToday++;
};

/**
 * Send driver approval email
 */
export const sendDriverApprovalEmail = async (driver) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Congratulations!</h1>
        </div>
        <div class="content">
          <h2>Your Driver Application Has Been Approved!</h2>
          <p>Dear ${driver.displayName},</p>
          <p>Great news! Your driver application for <strong>Islamove</strong> has been approved. You can now start accepting ride requests and earning money.</p>
          
          <h3>What's Next?</h3>
          <ul>
            <li>Open the Islamove Driver app</li>
            <li>Go online to start receiving ride requests</li>
            <li>Provide excellent service to passengers</li>
          </ul>
          
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          
          <p>Welcome to the Islamove family!</p>
          
          <p><strong>Best regards,</strong><br>Islamove Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; 2024 Islamove. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: driver.email,
    toName: driver.displayName,
    subject: "🎉 Your Islamove Driver Application is Approved!",
    htmlContent: htmlContent,
  });
};

/**
 * Send passenger ID approval email
 */
export const sendPassengerApprovalEmail = async (passenger) => {
  const discountText = passenger.discountPercentage
    ? `<p style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
        <strong>🎁 Special Discount:</strong> You now have a <strong>${passenger.discountPercentage}% discount</strong> on all rides!
       </p>`
    : "";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2196F3; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ ID Verification Successful!</h1>
        </div>
        <div class="content">
          <h2>Your Student ID Has Been Verified</h2>
          <p>Dear ${passenger.displayName},</p>
          <p>Great news! Your student ID has been successfully verified for <strong>Islamove</strong>.</p>
          
          ${discountText}
          
          <h3>What's Next?</h3>
          <ul>
            <li>Open the Islamove app</li>
            <li>Book rides with confidence</li>
            <li>Enjoy your verified student status${
              passenger.discountPercentage ? " and discount" : ""
            }</li>
          </ul>
          
          <p>Thank you for verifying your identity. This helps us maintain a safe community for everyone.</p>
          
          <p><strong>Best regards,</strong><br>Islamove Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; 2024 Islamove. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: passenger.email,
    toName: passenger.displayName,
    subject: "✅ Your Islamove Student ID is Verified!",
    htmlContent: htmlContent,
  });
};

/**
 * Send driver rejection email
 */
export const sendDriverRejectionEmail = async (driver, reason) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .reason-box { background-color: #ffebee; padding: 15px; border-radius: 5px; border-left: 4px solid #f44336; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Update</h1>
        </div>
        <div class="content">
          <h2>Driver Application Status</h2>
          <p>Dear ${driver.displayName},</p>
          <p>Thank you for your interest in becoming an Islamove driver. Unfortunately, we are unable to approve your application at this time.</p>
          
          <div class="reason-box">
            <strong>Reason:</strong><br>
            ${reason || "Application does not meet current requirements"}
          </div>
          
          <h3>What Can You Do?</h3>
          <ul>
            <li>Review the reason for rejection</li>
            <li>Update your documents or information</li>
            <li>Reapply once you've addressed the issues</li>
            <li>Contact support if you have questions</li>
          </ul>
          
          <p>We appreciate your understanding and hope to see your application again soon.</p>
          
          <p><strong>Best regards,</strong><br>Islamove Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; 2024 Islamove. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: driver.email,
    toName: driver.displayName,
    subject: "Islamove Driver Application Update",
    htmlContent: htmlContent,
  });
};

/**
 * Send passenger ID rejection email
 */
export const sendPassengerRejectionEmail = async (passenger, reason) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ff9800; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .reason-box { background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ff9800; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ID Verification Update</h1>
        </div>
        <div class="content">
          <h2>Student ID Verification Status</h2>
          <p>Dear ${passenger.displayName},</p>
          <p>Thank you for submitting your student ID for verification. Unfortunately, we are unable to verify your ID at this time.</p>
          
          <div class="reason-box">
            <strong>Reason:</strong><br>
            ${reason || "ID document does not meet verification requirements"}
          </div>
          
          <h3>What Can You Do?</h3>
          <ul>
            <li>Review the reason for rejection</li>
            <li>Upload a clear, valid student ID</li>
            <li>Ensure all information is visible and readable</li>
            <li>Contact support if you have questions</li>
          </ul>
          
          <p>You can still use Islamove without verification, but some features may be limited.</p>
          
          <p><strong>Best regards,</strong><br>Islamove Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; 2024 Islamove. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: passenger.email,
    toName: passenger.displayName,
    subject: "Islamove Student ID Verification Update",
    htmlContent: htmlContent,
  });
};
