import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadsService {
  private allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

  private async persistFile(file: Express.Multer.File, targetFolder: 'receipts' | 'meeting-attachments') {
    if (!file) throw new BadRequestException('File is required');
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, and PDF files are allowed');
    }

    const maxMb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 8);
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`File exceeds ${maxMb}MB limit`);
    }

    const folder = join(process.cwd(), 'storage', targetFolder);
    await mkdir(folder, { recursive: true });
    const filename = `${randomUUID()}${extname(file.originalname) || '.bin'}`;
    await writeFile(join(folder, filename), file.buffer);
    const baseUrl = process.env.LOCAL_UPLOAD_BASE_URL ?? 'http://localhost:4000/storage';

    return {
      url: `${baseUrl}/${targetFolder}/${filename}`,
      mimeType: file.mimetype,
      size: file.size,
      fileName: file.originalname,
      storedFileName: filename,
    };
  }

  uploadReceipt(file: Express.Multer.File) {
    return this.persistFile(file, 'receipts');
  }

  uploadMeetingAttachment(file: Express.Multer.File) {
    return this.persistFile(file, 'meeting-attachments');
  }
}
