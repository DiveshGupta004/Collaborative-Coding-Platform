import nodemailer from "nodemailer";

// 🔴 HARD FAIL if env is missing
if (!process.env.EMAIL_HOST) {
  throw new Error("EMAIL_HOST is undefined. .env not loaded.");
}
if (!process.env.EMAIL_PORT) {
  throw new Error("EMAIL_PORT is undefined. .env not loaded.");
}
if (!process.env.EMAIL_USER) {
  throw new Error("EMAIL_USER is undefined. .env not loaded.");
}
if (!process.env.EMAIL_PASS) {
  throw new Error("EMAIL_PASS is undefined. .env not loaded.");
}

console.log("✅ SMTP ENV LOADED:", {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  user: process.env.EMAIL_USER,
});

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // MUST be false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendMail = async ({ to, subject, html }) => {
  await transporter.verify(); // forces SMTP connection
  await transporter.sendMail({
    from: `"CodeMate" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
