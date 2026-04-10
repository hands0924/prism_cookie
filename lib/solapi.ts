import { SolapiMessageService } from "solapi";
import { normalizePhone } from "./phone";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getService() {
  return new SolapiMessageService(requiredEnv("SOLAPI_API_KEY"), requiredEnv("SOLAPI_API_SECRET"));
}

export async function sendSolapiText(input: { to: string; text: string }) {
  const to = normalizePhone(input.to);
  if (to.length < 8) {
    throw new Error("phone_invalid");
  }

  const result = await getService().send({
    to,
    from: requiredEnv("SOLAPI_FROM"),
    text: input.text
  });
  return result;
}
