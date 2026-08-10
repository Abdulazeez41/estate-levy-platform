import { PrismaClient, PaymentMethod, PaymentStatus, Role, LevyStatus, MeetingStatus, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const levyAmount = 5000;
const currentLevyMonth = 8;
const currentLevyYear = 2026;

const residents = [
  { houseNumber: 'Block A, Flat 2', fullName: 'Mr. Adewale Ogunleye', email: 'adewale@greenview.test', phone: '08032214590', status: 'paid' },
  { houseNumber: 'Block A, Flat 5', fullName: 'Mrs. Chidinma Eze', email: 'chidinma@greenview.test', phone: '08057712288', status: 'pending' },
  { houseNumber: 'Block B, Flat 1', fullName: 'Alhaji Musa Bello', email: 'musa@greenview.test', phone: '08134007712', status: 'overdue' },
  { houseNumber: 'Block B, Flat 3', fullName: 'Mrs. Funmilayo Adeyemi', email: 'funmi@greenview.test', phone: '08029901123', status: 'paid' },
  { houseNumber: 'Block B, Flat 6', fullName: 'Engr. Emeka Nwachukwu', email: 'emeka@greenview.test', phone: '07065528834', status: 'paid' },
  { houseNumber: 'Block C, Flat 2', fullName: 'Mrs. Grace Okon', email: 'grace@greenview.test', phone: '08176630091', status: 'overdue' },
  { houseNumber: 'Block C, Flat 4', fullName: 'Dr. Tunde Bakare', email: 'tunde@greenview.test', phone: '08102249981', status: 'pending' },
  { houseNumber: 'Block D, Flat 1', fullName: 'Mrs. Ngozi Umeh', email: 'ngozi@greenview.test', phone: '09091123345', status: 'paid' },
  { houseNumber: 'Block D, Flat 3', fullName: 'Chief Bassey Effiong', email: 'bassey@greenview.test', phone: '08038876620', status: 'overdue' },
];

async function main() {
  await prisma.paymentReceipt.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.levy.deleteMany();
  await prisma.household.deleteMany();
  await prisma.refreshSession.deleteMany();
  await prisma.receivingAccount.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const chairman = await prisma.user.create({
    data: {
      fullName: 'Chief Seyi Oladipo',
      email: 'chairman@greenview.test',
      phone: '08030000001',
      passwordHash,
      role: Role.CHAIRMAN,
    },
  });

  const levy = await prisma.levy.create({
    data: {
      month: currentLevyMonth,
      year: currentLevyYear,
      amount: levyAmount,
      dueDate: new Date('2026-08-10T23:59:59.000Z'),
      status: LevyStatus.ACTIVE,
    },
  });

  await prisma.meeting.create({
    data: {
      title: 'Monthly EXCO Meeting',
      description: 'Review levy collections and estate operations.',
      venue: 'Estate Hall',
      meetingDate: new Date('2026-08-14T17:00:00.000Z'),
      status: MeetingStatus.UPCOMING,
    },
  });

  await prisma.receivingAccount.createMany({
    data: [
      { bankName: 'OPay', accountName: 'Greenview Estate', accountNumber: '8132209911', providerKey: 'opay', instructions: 'Use your house number as narration.' },
      { bankName: 'Moniepoint', accountName: 'Greenview Estate', accountNumber: '1340052891', providerKey: 'moniepoint', instructions: 'Upload receipt after transfer.' },
      { bankName: 'PalmPay', accountName: 'Greenview Estate', accountNumber: '2981104450', providerKey: 'palmpay', instructions: 'Use exact levy amount where possible.' },
      { bankName: 'GTBank', accountName: 'Greenview Estate Residents Association', accountNumber: '0039128847', providerKey: 'traditional-bank', instructions: 'Include transfer reference in your submission.' },
    ],
  });

  for (const resident of residents) {
    const user = await prisma.user.create({
      data: {
        fullName: resident.fullName,
        email: resident.email,
        phone: resident.phone,
        passwordHash,
        role: Role.RESIDENT,
        household: {
          create: {
            houseNumber: resident.houseNumber,
            block: resident.houseNumber.split(',')[0],
            address: `${resident.houseNumber}, Greenview Estate`,
            moveInDate: new Date('2024-01-01T00:00:00.000Z'),
          },
        },
      },
    });

    if (resident.status === 'paid') {
      const payment = await prisma.payment.create({
        data: {
          levyId: levy.id,
          residentId: user.id,
          paymentMethod: PaymentMethod.MANUAL_BANK,
          amount: levyAmount,
          status: PaymentStatus.COMPLETED,
          reference: `GV-${resident.houseNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-202608`,
          receiptUrl: 'https://example.com/receipts/paid.pdf',
          submittedAt: new Date('2026-08-02T10:00:00.000Z'),
          confirmedAt: new Date('2026-08-02T15:00:00.000Z'),
          confirmedBy: chairman.id,
          transferDate: new Date('2026-08-02T09:30:00.000Z'),
        },
      });
      await prisma.paymentReceipt.create({
        data: {
          paymentId: payment.id,
          fileUrl: `https://example.com/receipts/${payment.reference}.pdf`,
          mimeType: 'application/pdf',
          size: 184000,
        },
      });
    }

    if (resident.status === 'pending') {
      const payment = await prisma.payment.create({
        data: {
          levyId: levy.id,
          residentId: user.id,
          paymentMethod: PaymentMethod.MANUAL_BANK,
          amount: levyAmount,
          status: PaymentStatus.AWAITING_CONFIRMATION,
          reference: `PENDING-${resident.houseNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-202608`,
          submittedAt: resident.fullName.includes('Chidinma') ? new Date('2026-08-02T12:00:00.000Z') : new Date('2026-08-01T11:00:00.000Z'),
          transferDate: resident.fullName.includes('Chidinma') ? new Date('2026-08-02T10:30:00.000Z') : new Date('2026-08-01T10:00:00.000Z'),
          receiptUrl: 'https://example.com/receipts/pending.png',
          note: 'Uploaded from resident dashboard',
        },
      });
      await prisma.notification.create({
        data: {
          recipientId: chairman.id,
          type: NotificationType.PAYMENT_SUBMITTED,
          title: 'New payment submitted',
          message: `${resident.fullName} submitted proof for August 2026 levy.`,
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PAYMENT_SUBMITTED',
          entity: 'Payment',
          entityId: payment.id,
          newValue: { status: PaymentStatus.AWAITING_CONFIRMATION, reference: payment.reference },
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
