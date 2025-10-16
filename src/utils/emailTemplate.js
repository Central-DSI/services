export function passwordResetTemplate({ appName, fullName, resetUrl, expiresInMinutes = 15 }) {
	return `
	<div style="font-family: Arial, sans-serif; line-height:1.6; max-width: 600px;">
		<h2>${appName || "App"} - Password Reset</h2>
		<p>Hi ${fullName || "User"},</p>
		<p>We received a request to reset your password. Click the button below to proceed. This link will expire in ${expiresInMinutes} minutes.</p>
		<p style="text-align:center; margin: 24px 0;">
			<a href="${resetUrl}" style="background:#2563eb; color:#fff; padding:10px 16px; border-radius:6px; text-decoration:none;">Reset Password</a>
		</p>
		<p>If you did not request this, you can safely ignore this email.</p>
		<p>Thanks,<br/>The ${appName || "App"} Team</p>
	</div>`;
}

export function simpleButtonTemplate({ title, message, buttonText, url }) {
	return `
	<div style="font-family: Arial, sans-serif; line-height:1.6; max-width: 600px;">
		<h2>${title || "Notification"}</h2>
		<p>${message || ""}</p>
		${url ? `<p style="text-align:center; margin: 24px 0;"><a href="${url}" style="background:#2563eb; color:#fff; padding:10px 16px; border-radius:6px; text-decoration:none;">${buttonText || "Open"}</a></p>` : ""}
	</div>`;
}

