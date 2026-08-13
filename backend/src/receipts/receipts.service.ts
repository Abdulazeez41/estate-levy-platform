import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { createWriteStream, statSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequestUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  private getBaseUrl() {
    return process.env.LOCAL_UPLOAD_BASE_URL ?? 'http://localhost:4000/storage';
  }

  async generatePaymentReceipt(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { levy: true, resident: { include: { household: true } } },
    });
    if (!payment || !payment.resident.household) throw new NotFoundException('Payment not found for receipt generation');
    const household = payment.resident.household;

    const folder = join(process.cwd(), 'storage', 'receipts');
    await mkdir(folder, { recursive: true });
    const filename = `${payment.reference}.pdf`;
    const filePath = join(folder, filename);
    const receiptUrl = `${this.getBaseUrl()}/receipts/${filename}`;
    const qrBuffer = await QRCode.toBuffer(receiptUrl, { margin: 1, width: 180, color: { dark: '#1B4332', light: '#FFFFFF' } });

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const stream = createWriteStream(filePath);
      doc.pipe(stream);

      doc.rect(0, 0, doc.page.width, 90).fill('#0F5132');
      doc.rect(0, 90, doc.page.width, 10).fill('#D4AF37');
      doc.fillColor('#FFFFFF').fontSize(24).text('Greenview Estate', 40, 28);
      doc.fontSize(12).fillColor('#E6F4EA').text('Estate Levy Payment Receipt', 40, 58);

      doc.roundedRect(40, 120, 515, 560, 18).lineWidth(1).strokeColor('#D7D5C8').stroke();
      doc.fillColor('#111827').fontSize(18).text('Payment Summary', 64, 148);
      doc.fontSize(11).fillColor('#6B7280').text('Verified receipt issued by the Greenview Estate levy platform.', 64, 172);

      const summaryRows = [
        ['Resident', payment.resident.fullName],
        ['House Number', household.houseNumber],
        ['Receipt Number', payment.reference],
        ['Payment Reference', payment.gatewayReference ?? payment.reference],
        ['Levy Cycle', `${payment.levy.month}/${payment.levy.year}`],
        ['Amount Paid', `NGN ${payment.amount.toLocaleString()}`],
        ['Payment Method', payment.paymentMethod],
        ['Submitted At', (payment.submittedAt ?? payment.createdAt).toLocaleString()],
        ['Confirmed At', payment.confirmedAt ? payment.confirmedAt.toLocaleString() : 'Pending'],
        ['Status', payment.status],
      ];

      let y = 210;
      for (const [label, value] of summaryRows) {
        doc.fillColor('#6B7280').fontSize(10).text(label.toUpperCase(), 64, y);
        doc.fillColor('#111827').fontSize(13).text(value, 64, y + 14);
        y += 46;
      }

      doc.image(qrBuffer, 390, 188, { width: 120 });
      doc.fillColor('#111827').fontSize(11).text('Scan to validate receipt', 378, 320, { width: 150, align: 'center' });
      doc.fillColor('#6B7280').fontSize(9).text(receiptUrl, 360, 338, { width: 185, align: 'center' });

      doc.roundedRect(64, 610, 220, 46, 12).fill('#F5E7A1');
      doc.fillColor('#2A1C05').fontSize(11).text('Treasury verification stamp', 86, 626);
      doc.roundedRect(320, 610, 180, 46, 12).fill('#E7F5EA');
      doc.fillColor('#0F5132').fontSize(11).text('Digitally generated', 360, 626);

      doc.fillColor('#6B7280').fontSize(10).text('Thank you for supporting estate operations and service continuity.', 64, 705, { width: 470, align: 'center' });
      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    const stats = statSync(filePath);
    const existing = await this.prisma.paymentReceipt.findUnique({ where: { paymentId } });
    if (existing) {
      await this.prisma.paymentReceipt.update({ where: { paymentId }, data: { fileUrl: receiptUrl, mimeType: 'application/pdf', size: stats.size } });
    } else {
      await this.prisma.paymentReceipt.create({ data: { paymentId, fileUrl: receiptUrl, mimeType: 'application/pdf', size: stats.size } });
    }
    await this.prisma.payment.update({ where: { id: paymentId }, data: { receiptUrl } });
    return { fileUrl: receiptUrl };
  }

  async getReceiptByPaymentId(paymentId: string, user: AuthenticatedRequestUser) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { paymentReceipt: true } });
    if (!payment?.paymentReceipt) throw new NotFoundException('Receipt not found');
    if (user.role !== Role.CHAIRMAN && payment.residentId !== user.sub) throw new ForbiddenException('You cannot access this receipt');
    return payment.paymentReceipt;
  }
}
