export const VerificationRequestHTMLEMailTemplate = (code) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Email Verification</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:40px 20px;">
    <tr>
      <td align="center">

        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">

          <tr>
            <td style="background:#111827;padding:24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;">
                Verify Your Email
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 32px;color:#374151;font-size:16px;line-height:1.6;">

              <p style="margin-top:0;">
                Hello,
              </p>

              <p>
                Thank you for signing up. Use the verification code below to complete your email verification.
              </p>

              <div style="margin:40px 0;text-align:center;">
                <span style="
                  display:inline-block;
                  padding:18px 32px;
                  font-size:34px;
                  font-weight:bold;
                  letter-spacing:10px;
                  color:#111827;
                  background:#f3f4f6;
                  border:2px dashed #d1d5db;
                  border-radius:8px;
                ">
                  ${code}
                </span>
              </div>

              <p>
                This verification code will expire shortly. If you did not request this email, you can safely ignore it.
              </p>

              <p style="margin-bottom:0;">
                Thanks,<br>
                <strong>Your Team</strong>
              </p>

            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb;padding:20px;text-align:center;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">
              This is an automated email. Please do not reply.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
};