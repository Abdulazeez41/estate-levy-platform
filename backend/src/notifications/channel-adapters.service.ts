import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import nodemailer from 'nodemailer';

export type DeliveryChannel = 'email' | 'sms' | 'whatsapp' | 'in_app';

type DeliveryPayload = {
  recipientName?: string;
  email?: string | null;
  phone?: string | null;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class ChannelAdaptersService {
  private readonly logger = new Logger(ChannelAdaptersService.name);

  async deliver(channel: DeliveryChannel, payload: DeliveryPayload) {
    if (channel === 'in_app') return { delivered: true, channel, provider: 'database' };
    if (channel === 'email') return this.sendEmail(payload);
    if (channel === 'sms') return this.sendSms(payload);
    return this.sendWhatsApp(payload);
  }

  private async sendEmail(payload: DeliveryPayload) {
    const provider = (process.env.EMAIL_PROVIDER ?? 'smtp').toLowerCase();
    if (!payload.email) {
      this.logger.warn('Email adapter skipped because recipient email is unavailable');
      return { delivered: false, channel: 'email', provider };
    }

    if (provider === 'sendgrid') {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey || !process.env.EMAIL_FROM) return { delivered: false, channel: 'email', provider };
      await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [{ to: [{ email: payload.email, name: payload.recipientName }] }],
          from: { email: process.env.EMAIL_FROM, name: process.env.EMAIL_FROM_NAME ?? 'Greenview Estate' },
          subject: payload.title,
          content: [
            { type: 'text/plain', value: payload.message },
            { type: 'text/html', value: this.renderEmailHtml(payload.title, payload.message) },
          ],
        },
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
      return { delivered: true, channel: 'email', provider };
    }

    if (provider === 'postmark') {
      const serverToken = process.env.POSTMARK_SERVER_TOKEN;
      if (!serverToken || !process.env.EMAIL_FROM) return { delivered: false, channel: 'email', provider };
      await axios.post(
        'https://api.postmarkapp.com/email',
        {
          From: process.env.EMAIL_FROM,
          To: payload.email,
          Subject: payload.title,
          TextBody: payload.message,
          HtmlBody: this.renderEmailHtml(payload.title, payload.message),
          MessageStream: process.env.POSTMARK_MESSAGE_STREAM ?? 'outbound',
        },
        { headers: { 'X-Postmark-Server-Token': serverToken } },
      );
      return { delivered: true, channel: 'email', provider };
    }

    return this.sendSmtpEmail(payload);
  }

  private async sendSms(payload: DeliveryPayload) {
    const provider = (process.env.SMS_PROVIDER ?? 'webhook').toLowerCase();
    if (!payload.phone) {
      this.logger.warn('SMS adapter skipped because recipient phone is unavailable');
      return { delivered: false, channel: 'sms', provider };
    }

    if (provider === 'termii') {
      const apiKey = process.env.TERMII_API_KEY;
      const from = process.env.TERMII_SENDER_ID;
      if (!apiKey || !from) return { delivered: false, channel: 'sms', provider };
      await axios.post('https://api.ng.termii.com/api/sms/send', {
        api_key: apiKey,
        to: payload.phone,
        from,
        sms: payload.message,
        type: 'plain',
        channel: process.env.TERMII_CHANNEL ?? 'generic',
      });
      return { delivered: true, channel: 'sms', provider };
    }

    if (provider === 'twilio') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_SMS_FROM;
      if (!accountSid || !authToken || !from) return { delivered: false, channel: 'sms', provider };
      const body = new URLSearchParams({ To: payload.phone, From: from, Body: payload.message });
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        body.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          auth: { username: accountSid, password: authToken },
        },
      );
      return { delivered: true, channel: 'sms', provider };
    }

    return this.sendWebhook(process.env.SMS_WEBHOOK_URL, 'sms', payload);
  }

  private async sendWhatsApp(payload: DeliveryPayload) {
    const provider = (process.env.WHATSAPP_PROVIDER ?? 'webhook').toLowerCase();
    if (!payload.phone) {
      this.logger.warn('WhatsApp adapter skipped because recipient phone is unavailable');
      return { delivered: false, channel: 'whatsapp', provider };
    }

    if (provider === 'meta') {
      const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
      if (!token || !phoneNumberId) return { delivered: false, channel: 'whatsapp', provider };
      await axios.post(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: payload.phone,
          type: 'text',
          text: { preview_url: false, body: `${payload.title}\n\n${payload.message}` },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return { delivered: true, channel: 'whatsapp', provider };
    }

    if (provider === 'twilio') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_WHATSAPP_FROM;
      if (!accountSid || !authToken || !from) return { delivered: false, channel: 'whatsapp', provider };
      const normalizedFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
      const normalizedTo = payload.phone.startsWith('whatsapp:') ? payload.phone : `whatsapp:${payload.phone}`;
      const body = new URLSearchParams({ To: normalizedTo, From: normalizedFrom, Body: `${payload.title}\n\n${payload.message}` });
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        body.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          auth: { username: accountSid, password: authToken },
        },
      );
      return { delivered: true, channel: 'whatsapp', provider };
    }

    return this.sendWebhook(process.env.WHATSAPP_WEBHOOK_URL, 'whatsapp', payload);
  }

  private async sendSmtpEmail(payload: DeliveryPayload) {
    const transporter = this.getTransporter();
    if (!transporter || !payload.email) {
      this.logger.warn(`SMTP adapter unavailable for ${payload.email ?? 'unknown recipient'}`);
      return { delivered: false, channel: 'email', provider: 'smtp' };
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: payload.email,
      subject: payload.title,
      text: payload.message,
      html: this.renderEmailHtml(payload.title, payload.message),
    });

    return { delivered: true, channel: 'email', provider: 'smtp' };
  }

  private getTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private async sendWebhook(url: string | undefined, provider: 'sms' | 'whatsapp', payload: DeliveryPayload) {
    if (!url || !payload.phone) {
      this.logger.warn(`${provider} adapter unavailable for ${payload.phone ?? 'unknown recipient'}`);
      return { delivered: false, channel: provider, provider };
    }

    await axios.post(url, {
      to: payload.phone,
      name: payload.recipientName,
      title: payload.title,
      message: payload.message,
      metadata: payload.metadata,
    });

    return { delivered: true, channel: provider, provider };
  }

  private renderEmailHtml(title: string, message: string) {
    return `<div style="font-family:Arial,sans-serif;padding:24px"><h2 style="color:#1b5e20;margin:0 0 12px">${title}</h2><p style="line-height:1.6;white-space:pre-line">${message}</p></div>`;
  }
}
