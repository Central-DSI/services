import nodemailer from "nodemailer";
import { ENV } from "./env.js";

const transporter = nodemailer.createTransport({
	host: ENV.SMTP_HOST,
	port: Number(ENV.SMTP_PORT) || 587,
	secure: Boolean(ENV.SMTP_SECURE),
	auth: ENV.SMTP_USER
		? {
				user: ENV.SMTP_USER,
				pass: ENV.SMTP_PASS,
			}
		: undefined,
});

export async function sendMail({ to, subject, html, text }) {
	const from = ENV.SMTP_FROM || ENV.SMTP_USER;
	if (!from) throw new Error("SMTP_FROM or SMTP_USER must be set");
	return transporter.sendMail({ from, to, subject, html, text });
}

export default transporter;

