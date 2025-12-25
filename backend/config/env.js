import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

if (!process.env.EMAIL_HOST) {
  throw new Error("❌ EMAIL_HOST missing. .env not loaded correctly.");
}

export default process.env;
