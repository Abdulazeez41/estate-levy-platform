import { BadRequestException, Injectable } from '@nestjs/common';
import { InvoiceStatus, LevyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLevyDto } from './dto/create-levy.dto';

@Injectable()
export class LeviesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.levy.findMany({
      include: { _count: { select: { invoices: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async create(dto: CreateLevyDto, chairmanId: string) {
    const dueDate = new Date(dto.dueDate);
    if (Number.isNaN(dueDate.getTime())) throw new BadRequestException('A valid due date is required');
    const currency = (dto.currency ?? 'NGN').trim().toUpperCase();
    if (currency.length !== 3) throw new BadRequestException('Currency must be a three-letter code');

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.levy.updateMany({ where: { status: LevyStatus.ACTIVE }, data: { status: LevyStatus.CLOSED } });
        const levy = await tx.levy.create({
          data: {
            month: dto.month,
            year: dto.year,
            amount: dto.amount,
            currency,
            dueDate,
            reminderDaysBefore: dto.reminderDaysBefore ?? 3,
            status: LevyStatus.ACTIVE,
          },
        });
        const households = await tx.household.findMany({ select: { id: true, residentId: true } });
        if (households.length) {
          await tx.invoice.createMany({
            data: households.map((household) => ({
              levyId: levy.id,
              householdId: household.id,
              residentId: household.residentId,
              amount: levy.amount,
              currency: levy.currency,
              dueDate: levy.dueDate,
              status: InvoiceStatus.PENDING_PAYMENT,
            })),
          });
        }
        await tx.auditLog.create({
          data: {
            userId: chairmanId,
            action: 'LEVY_CYCLE_CREATED',
            entity: 'Levy',
            entityId: levy.id,
            newValue: { month: levy.month, year: levy.year, amount: levy.amount, currency: levy.currency, dueDate: levy.dueDate, invoiceCount: households.length },
          },
        });
        return { ...levy, invoiceCount: households.length };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('A levy cycle already exists for this month and year');
      }
      throw error;
    }
  }

  async syncInvoices(levyId: string, chairmanId: string) {
    const levy = await this.prisma.levy.findUnique({ where: { id: levyId } });
    if (!levy) throw new BadRequestException('Levy cycle not found');
    const households = await this.prisma.household.findMany({ select: { id: true, residentId: true } });
    let created = 0;
    for (const household of households) {
      const result = await this.prisma.invoice.createMany({
        data: [{ levyId, householdId: household.id, residentId: household.residentId, amount: levy.amount, currency: levy.currency, dueDate: levy.dueDate }],
        skipDuplicates: true,
      });
      created += result.count;
    }
    await this.prisma.auditLog.create({ data: { userId: chairmanId, action: 'LEVY_INVOICES_SYNCED', entity: 'Levy', entityId: levyId, newValue: { created } } });
    return { success: true, created };
  }
}
