const allowedEmailProviders = ['smtp', 'sendgrid', 'postmark'];
const allowedSmsProviders = ['webhook', 'termii', 'twilio'];
const allowedWhatsAppProviders = ['webhook', 'meta', 'twilio'];
const allowedPaystackModes = ['test', 'live', 'off'];

export default function envValidation(config: Record<string, unknown>) {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  if (String(config.NODE_ENV ?? '').toLowerCase() === 'production' && !config.OTP_SECRET) {
    throw new Error('Missing required production environment variable: OTP_SECRET');
  }

  const emailProvider = String(config.EMAIL_PROVIDER ?? 'smtp').toLowerCase();
  const smsProvider = String(config.SMS_PROVIDER ?? 'webhook').toLowerCase();
  const whatsappProvider = String(config.WHATSAPP_PROVIDER ?? 'webhook').toLowerCase();
  const paystackMode = String(config.PAYSTACK_MODE ?? 'test').toLowerCase();

  if (!allowedEmailProviders.includes(emailProvider)) {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${emailProvider}`);
  }
  if (!allowedSmsProviders.includes(smsProvider)) {
    throw new Error(`Unsupported SMS_PROVIDER: ${smsProvider}`);
  }
  if (!allowedWhatsAppProviders.includes(whatsappProvider)) {
    throw new Error(`Unsupported WHATSAPP_PROVIDER: ${whatsappProvider}`);
  }
  if (!allowedPaystackModes.includes(paystackMode)) {
    throw new Error(`Unsupported PAYSTACK_MODE: ${paystackMode}`);
  }
  if (paystackMode !== 'off') {
    for (const key of ['PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY', 'PAYSTACK_CALLBACK_URL']) {
      if (!config[key]) {
        throw new Error(`Missing required environment variable for payments: ${key}`);
      }
    }
    const expectedSecretPrefix = paystackMode === 'live' ? 'sk_live_' : 'sk_test_';
    const expectedPublicPrefix = paystackMode === 'live' ? 'pk_live_' : 'pk_test_';
    if (!String(config.PAYSTACK_SECRET_KEY).startsWith(expectedSecretPrefix)) {
      throw new Error(`PAYSTACK_SECRET_KEY must be a ${paystackMode} secret key beginning with ${expectedSecretPrefix}`);
    }
    if (!String(config.PAYSTACK_PUBLIC_KEY).startsWith(expectedPublicPrefix)) {
      throw new Error(`PAYSTACK_PUBLIC_KEY must be a ${paystackMode} public key beginning with ${expectedPublicPrefix}`);
    }
  }

  return config;
}
