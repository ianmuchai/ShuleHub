import { AppConfig, MpesaEnvironment } from "./types";

const read = (env: NodeJS.ProcessEnv, key: string) => env[key]?.trim();

const requireValue = (env: NodeJS.ProcessEnv, key: string) => {
  const value = read(env, key);
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
};

export const loadConfig = (env: NodeJS.ProcessEnv): AppConfig => {
  const sessionSecret = requireValue(env, "SESSION_SECRET");
  const mpesaEnvironment = (read(env, "MPESA_ENVIRONMENT") ?? "sandbox") as MpesaEnvironment;
  const mpesaValues = {
    consumerKey: read(env, "MPESA_CONSUMER_KEY"),
    consumerSecret: read(env, "MPESA_CONSUMER_SECRET"),
    shortcode: read(env, "MPESA_SHORTCODE"),
    passkey: read(env, "MPESA_PASSKEY"),
    callbackUrl: read(env, "MPESA_CALLBACK_URL"),
  };
  const configured = Object.values(mpesaValues).every(Boolean);

  return {
    port: Number(read(env, "PORT") ?? 4000),
    sessionSecret,
    mpesa: {
      configured,
      environment: mpesaEnvironment,
      ...mpesaValues,
    },
    notifications: {
      smsProvider: read(env, "SMS_PROVIDER"),
      smsApiKey: read(env, "SMS_API_KEY"),
      whatsappProvider: read(env, "WHATSAPP_PROVIDER"),
      whatsappAccessToken: read(env, "WHATSAPP_ACCESS_TOKEN"),
      emailProvider: read(env, "EMAIL_PROVIDER"),
      emailApiKey: read(env, "EMAIL_API_KEY"),
    },
  };
};
