import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';
import { AdminMailController } from './admin-mail.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Global() // ✅ متاح في كل المشروع
@Module({
    imports: [PrismaModule],
    controllers: [AdminMailController],
    providers: [MailService],
    exports: [MailService],
})
export class MailModule { }