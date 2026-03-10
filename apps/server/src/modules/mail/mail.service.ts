import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host:   this.config.get('MAIL_HOST')        || 'smtp.gmail.com',
      port:   this.config.get<number>('MAIL_PORT') || 587,
      secure: false,
      auth: {
        user: this.config.get('MAIL_USER'),
        pass: this.config.get('MAIL_PASS'),
      },
    });
  }

  // ── Email de vérification ─────────────────────────────────
  async sendVerificationEmail(email: string, firstName: string, code: string) {
    await this.transporter.sendMail({
      from:    `"BloodLink 🩸" <${this.config.get('MAIL_USER')}>`,
      to:      email,
      subject: 'Vérification de votre compte BloodLink',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee;">
          <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:32px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:28px;">🩸 BloodLink</h1>
            <p style="color:#fca5a5;margin:8px 0 0;">Vérification de compte</p>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#111827;margin-bottom:8px;">Bonjour ${firstName} 👋</h2>
            <p style="color:#6b7280;line-height:1.6;">
              Merci de rejoindre <strong>BloodLink</strong> !<br>
              Utilisez le code ci-dessous pour vérifier votre adresse email.
            </p>
            <div style="background:#fef2f2;border:2px dashed #dc2626;border-radius:12px;
                        padding:24px;text-align:center;margin:24px 0;">
              <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Votre code de vérification</p>
              <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#dc2626;">${code}</span>
              <p style="color:#9ca3af;font-size:12px;margin:12px 0 0;">⏳ Ce code expire dans <strong>15 minutes</strong></p>
            </div>
          </div>
          <div style="background:#f9fafb;padding:16px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 BloodLink — Sauver des vies 💙</p>
          </div>
        </div>`,
    });
    this.logger.log(`✅ Email vérification → ${email}`);
  }

  // ── Email de notification ─────────────────────────────────
  async sendNotificationEmail(email: string, firstName: string, title: string, body: string, type: string) {
    const ICONS:  Record<string, string> = { DONATION:'✅', URGENT:'🚨', REQUEST:'🩸', SYSTEM:'ℹ️' };
    const COLORS: Record<string, string> = { DONATION:'#10b981', URGENT:'#dc2626', REQUEST:'#3b82f6', SYSTEM:'#6b7280' };
    const icon  = ICONS[type]  || '🔔';
    const color = COLORS[type] || '#dc2626';

    await this.transporter.sendMail({
      from:    `"BloodLink 🩸" <${this.config.get('MAIL_USER')}>`,
      to:      email,
      subject: `${icon} ${title}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee;">
          <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:24px 32px;">
            <h1 style="color:white;margin:0;font-size:22px;">🩸 BloodLink</h1>
          </div>
          <div style="padding:32px;">
            <div style="background:${color}15;border-left:4px solid ${color};border-radius:8px;padding:16px;margin-bottom:20px;">
              <h2 style="color:${color};margin:0 0 8px;font-size:18px;">${icon} ${title}</h2>
              <p style="color:#374151;margin:0;line-height:1.6;">${body}</p>
            </div>
            <p style="color:#6b7280;font-size:14px;">Bonjour <strong>${firstName}</strong>, vous avez une nouvelle notification sur BloodLink.</p>
            <a href="${this.config.get('FRONTEND_URL') || 'http://localhost:5173'}/notifications"
               style="display:inline-block;background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">
              Voir mes notifications →
            </a>
          </div>
          <div style="background:#f9fafb;padding:16px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 BloodLink 💙</p>
          </div>
        </div>`,
    });
  }

  // ✅ ── Email Broadcast (Admin) ──────────────────────────────
  async sendBulkEmail(
    recipients: { email: string; firstName: string }[],
    subject:    string,
    htmlBody:   string,
    adminName:  string,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0, failed = 0;

    // Envoyer en batch de 10 pour éviter les limites SMTP
    const BATCH = 10;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async ({ email, firstName }) => {
          try {
            await this.transporter.sendMail({
              from:    `"BloodLink Admin 🩸" <${this.config.get('MAIL_USER')}>`,
              to:      email,
              subject,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#fff;
                            border-radius:16px;overflow:hidden;border:1px solid #eee;">
                  <!-- Header -->
                  <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:32px;text-align:center;">
                    <h1 style="color:white;margin:0;font-size:26px;">🩸 BloodLink</h1>
                    <p style="color:#fca5a5;margin:6px 0 0;font-size:13px;">Message de l'équipe BloodLink</p>
                  </div>

                  <!-- Greeting -->
                  <div style="padding:32px 32px 0;">
                    <h2 style="color:#111827;margin:0 0 4px;font-size:20px;">Bonjour ${firstName} 👋</h2>
                    <p style="color:#6b7280;font-size:13px;margin:0;">Un message important de l'équipe BloodLink</p>
                  </div>

                  <!-- Divider -->
                  <div style="margin:24px 32px;height:1px;background:#f3f4f6;"></div>

                  <!-- Content -->
                  <div style="padding:0 32px 32px;">
                    <div style="background:#fafafa;border-radius:12px;padding:24px;
                                border:1px solid #f3f4f6;line-height:1.8;color:#374151;font-size:15px;">
                      ${htmlBody}
                    </div>

                    <!-- CTA -->
                    <div style="text-align:center;margin-top:28px;">
                      <a href="${this.config.get('FRONTEND_URL') || 'http://localhost:5173'}"
                         style="display:inline-block;background:#dc2626;color:white;padding:14px 32px;
                                border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;">
                        Accéder à BloodLink →
                      </a>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #f3f4f6;">
                    <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
                      Envoyé par <strong>${adminName}</strong> · Équipe BloodLink<br>
                      © 2026 BloodLink — Sauver des vies, connecter les cœurs 💙
                    </p>
                  </div>
                </div>`,
            });
            sent++;
          } catch (err) {
            failed++;
            this.logger.error(`❌ Email failed → ${email}: ${err}`);
          }
        }),
      );
      // Petite pause entre batches
      if (i + BATCH < recipients.length) await new Promise((r) => setTimeout(r, 500));
    }

    this.logger.log(`📧 Bulk email: ${sent} envoyés, ${failed} échecs`);
    return { sent, failed };
  }
}