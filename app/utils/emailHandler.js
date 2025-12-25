import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("Email server error:", error);
  } else {
    console.log("Email server ready");
  }
});

export const sendHospitalRegistrationMail = async ({
    to,
    hospital_name,
    email,
    password,
  }) => {
    const title = "Hospital Registration Successful";
    const organization_name = "Hospital Management Team";
    const contact_info = "Contact us for any queries or support.";
    const loginUrl = process.env.LOGIN_URL;
  
    const html = `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              background-color: #f5f5f5;
              margin: 0;
              padding: 0;
          }
          .container {
              max-width: 600px;
              margin: 30px auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
              background: linear-gradient(45deg, #1565C0 30%, #42A5F5 90%);
              color: #fff;
              padding: 20px;
              text-align: center;
              font-size: 24px;
              font-weight: bold;
          }
          .content {
              padding: 20px;
              color: #333;
          }
          .content h2 {
              color: #1565C0;
              margin-top: 0;
          }
          .details {
              margin-top: 15px;
              border-collapse: collapse;
              width: 100%;
          }
          .details td {
              padding: 8px 0;
          }
          .footer {
              background-color: #f1f1f1;
              text-align: center;
              padding: 15px;
              font-size: 14px;
              color: #666;
          }
          a {
              color: #1565C0;
              text-decoration: none;
          }
          .login-button {
              display: block;
              width: fit-content;
              margin: 15px auto;
              background: linear-gradient(45deg, #1565C0 30%, #42A5F5 90%);
              color: #fff;
              padding: 10px 20px;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              ${title}
          </div>
          <div class="content">
              <p>Dear <strong>${hospital_name}</strong>,</p>
              <p>Your hospital has been successfully registered.</p>
              <p><strong>Login Credentials:</strong></p>
              <table class="details">
                  <tr>
                      <td><strong>Email:</strong></td>
                      <td>${email}</td>
                  </tr>
                  <tr>
                      <td><strong>Password:</strong></td>
                      <td>${password}</td>
                  </tr>
              </table>
              <p>Please change your password after your first login.</p>
              <p>Click the button below to log in:</p>
              <a href="${loginUrl}" class="login-button">Login Now</a>
              <p>We look forward to serving you!</p>
              <p>Best regards,<br><strong>${organization_name}</strong></p>
          </div>
          <div class="footer">
              ${contact_info}
          </div>
      </div>
  </body>
  </html>
    `;
  
    const mailOptions = {
      from: `"Hospital Management" <${process.env.SMTP_USER}>`,
      to,
      subject: title,
      html,
    };
  
    await transporter.sendMail(mailOptions);
  };
  