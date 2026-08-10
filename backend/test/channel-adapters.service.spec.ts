import axios from 'axios';
import { ChannelAdaptersService } from '../src/notifications/channel-adapters.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ChannelAdaptersService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.EMAIL_PROVIDER;
    delete process.env.SMS_PROVIDER;
    delete process.env.WHATSAPP_PROVIDER;
  });

  it('uses SendGrid when EMAIL_PROVIDER=sendgrid', async () => {
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'sg-key';
    process.env.EMAIL_FROM = 'no-reply@test.com';
    mockedAxios.post.mockResolvedValue({ data: {} } as any);

    const service = new ChannelAdaptersService();
    const result = await service.deliver('email', { email: 'resident@test.com', title: 'Notice', message: 'Hello' });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.sendgrid.com/v3/mail/send',
      expect.any(Object),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer sg-key' }) }),
    );
    expect(result).toEqual({ delivered: true, channel: 'email', provider: 'sendgrid' });
  });

  it('uses Twilio for SMS when configured', async () => {
    process.env.SMS_PROVIDER = 'twilio';
    process.env.TWILIO_ACCOUNT_SID = 'AC123';
    process.env.TWILIO_AUTH_TOKEN = 'secret';
    process.env.TWILIO_SMS_FROM = '+15550001111';
    mockedAxios.post.mockResolvedValue({ data: {} } as any);

    const service = new ChannelAdaptersService();
    const result = await service.deliver('sms', { phone: '+2348012345678', title: 'Reminder', message: 'Pay levy' });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(result).toEqual({ delivered: true, channel: 'sms', provider: 'twilio' });
  });

  it('uses WhatsApp Cloud API when configured', async () => {
    process.env.WHATSAPP_PROVIDER = 'meta';
    process.env.WHATSAPP_CLOUD_API_TOKEN = 'wa-token';
    process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID = '123456';
    mockedAxios.post.mockResolvedValue({ data: {} } as any);

    const service = new ChannelAdaptersService();
    const result = await service.deliver('whatsapp', { phone: '2348012345678', title: 'Reminder', message: 'Pay levy' });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v20.0/123456/messages',
      expect.any(Object),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer wa-token' }) }),
    );
    expect(result).toEqual({ delivered: true, channel: 'whatsapp', provider: 'meta' });
  });
});
