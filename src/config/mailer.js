import nodemailer from "nodemailer";
import { ENV } from "./env.js";

// Use connection pooling and built-in rate limiting to avoid provider throttling
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
	pool: true,
	maxConnections: 1, // keep a single connection to reduce login attempts
	maxMessages: Infinity,
	// send at most ~10 messages per minute from this pooled transport
	rateDelta: 60_000,
	rateLimit: 10,
});

export async function sendMail({ to, subject, html, text }) {
	const from = ENV.SMTP_FROM || ENV.SMTP_USER;
	if (!from) throw new Error("SMTP_FROM or SMTP_USER must be set");
	return transporter.sendMail({ from, to, subject, html, text });
}

export default transporter;

