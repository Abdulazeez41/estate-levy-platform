import { InvoiceStatus, PaymentMethod, PaymentStatus, PrismaClient, Role, LevyStatus, MeetingStatus } from '@prisma/client';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';

loadEnv({ path: join(__dirname, '..', '.env'), override: true });

const prisma = new PrismaClient();
const levyAmount = 5000;
const now = new Date();
const currentLevyMonth = now.getMonth() + 1;
const currentLevyYear = now.getFullYear();

const houses = [
  ...'ABCDEFGHI'.split('').flatMap((block) => Array.from({ length: 6 }, (_, index) => `Block ${block}, Flat ${index + 1}`)),
  ...Array.from({ length: 5 }, (_, index) => `Block J, Flat ${index + 1}`),
];

const chairmanHouse = 'Block A, Flat 1';
const residentHouses = houses.filter((house) => house !== chairmanHouse);

async function main() {
  await prisma.paymentReceipt.deleteMany();
  await prisma.paymentAttempt.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.paymentIntent.deleteMany();
  await prisma.otpChallenge.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.meetingAttachment.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.levy.deleteMany();
  await prisma.household.deleteMany();
  await prisma.refreshSession.deleteMany();
  await prisma.receivingAccount.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      fullName: 'Chief Seyi Oladipo',
      email: 'chairman@greenview.test',
      phone: '+2348100000001',
      loginHouseNumber: chairmanHouse,
      role: Role.CHAIRMAN,
    },
  });

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() - 1);
  dueDate.setHours(23, 59, 59, 999);
  const levy = await prisma.levy.create({
    data: { month: currentLevyMonth, year: currentLevyYear, amount: levyAmount, dueDate, status: LevyStatus.ACTIVE },
  });

  const meetingDate = new Date(now);
  meetingDate.setDate(meetingDate.getDate() + 7);
  meetingDate.setHours(18, 0, 0, 0);
  await prisma.meeting.create({
    data: { title: 'Monthly EXCO Meeting', description: 'Review levy collections and estate operations.', venue: 'Estate Hall', meetingDate, status: MeetingStatus.UPCOMING },
  });

  for (const [index, houseNumber] of residentHouses.entries()) {
    const residentNumber = index + 2;
    const user = await prisma.user.create({
      data: {
        fullName: `Resident ${houseNumber}`,
        email: `resident${residentNumber}@greenview.test`,
        phone: `+2348100${residentNumber.toString().padStart(6, '0')}`,
        loginHouseNumber: houseNumber,
        role: Role.RESIDENT,
        household: {
          create: {
            houseNumber,
            block: houseNumber.split(',')[0],
            address: `${houseNumber}, Greenview Estate`,
            moveInDate: new Date('2024-01-01T00:00:00.000Z'),
          },
        },
      },
      include: { household: true },
    });

    if (!user.household) throw new Error(`Household was not created for ${houseNumber}`);
    const paid = index < 12;
    const processing = index >= 12 && index < 15;
    const invoice = await prisma.invoice.create({
      data: {
        levyId: levy.id,
        householdId: user.household.id,
        residentId: user.id,
        amount: levyAmount,
        currency: 'NGN',
        dueDate,
        status: paid ? InvoiceStatus.CONFIRMED : processing ? InvoiceStatus.PROCESSING : InvoiceStatus.OVERDUE,
        paidAt: paid ? now : null,
      },
    });

    if (paid || processing) {
      const reference = `GV-${houseNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${currentLevyYear}${String(currentLevyMonth).padStart(2, '0')}`;
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          levyId: levy.id,
          residentId: user.id,
          paymentMethod: paid ? PaymentMethod.PAYSTACK_CARD : PaymentMethod.PAYSTACK_BANK_TRANSFER,
          amount: levyAmount,
          status: paid ? PaymentStatus.CONFIRMED : PaymentStatus.PROCESSING,
          reference,
          gatewayReference: reference,
          gateway: 'paystack',
          submittedAt: now,
          confirmedAt: paid ? now : null,
        },
      });
    }
  }

  console.log(`Seeded ${houses.length} house login identities: 1 chairman and ${residentHouses.length} residents.`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
