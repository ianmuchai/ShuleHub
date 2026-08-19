export type NotificationChannel = "sms" | "whatsapp" | "email";

export type NotificationMessage = {
  channel: NotificationChannel;
  to: string;
  subject?: string;
  body: string;
};

export type DeliveryResult = {
  configured: boolean;
  provider?: string;
  status: "queued" | "configuration_required";
  providerMessageId?: string;
};

export const providerStatus = (provider?: string, secret?: string) => ({
  provider: provider || "not configured",
  configured: Boolean(provider && secret),
});

export const sendNotification = (message: NotificationMessage, provider?: string, secret?: string): DeliveryResult => {
  if (!provider || !secret) {
    return { configured: false, provider, status: "configuration_required" };
  }

  return {
    configured: true,
    provider,
    status: "queued",
    providerMessageId: `${message.channel}-${Date.now()}`,
  };
};
