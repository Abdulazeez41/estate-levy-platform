import { ConflictException } from '@nestjs/common';
import { HouseholdsService } from '../src/households/households.service';

describe('HouseholdsService WhatsApp access management', () => {
  const household = {
    id: 'house-1',
    houseNumber: 'Block B, Flat 1',
    residentId: 'resident-1',
    resident: { id: 'resident-1', phone: '+2348011111111' },
  };

  it('normalizes a chairman-supplied number and invalidates outstanding OTP codes', async () => {
    const txOperations: unknown[] = [];
    const prisma: any = {
      household: { findUnique: jest.fn().mockResolvedValue(household) },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
      otpChallenge: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockImplementation(async (operations) => {
        txOperations.push(...operations);
        return Promise.all(operations);
      }),
    };

    const service = new HouseholdsService(prisma);
    await expect(service.updateWhatsApp(household.id, '08031234567', 'chairman-1')).resolves.toEqual({ phone: '+2348031234567' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'resident-1' }, data: { phone: '+2348031234567' } });
    expect(prisma.otpChallenge.updateMany).toHaveBeenCalled();
    expect(txOperations).toHaveLength(3);
  });

  it('does not permit one WhatsApp number to be shared by two houses', async () => {
    const prisma: any = {
      household: { findUnique: jest.fn().mockResolvedValue(household) },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'resident-2' }) },
    };
    const service = new HouseholdsService(prisma);
    await expect(service.updateWhatsApp(household.id, '+2348031234567', 'chairman-1')).rejects.toBeInstanceOf(ConflictException);
  });
});
