import { createTransport } from 'nodemailer';

export interface PasswordResetEmail {
  to: string;
  resetUrl: string;
  expiresAt: Date;
}

export interface PasswordResetMailer {
  sendPasswordReset(email: PasswordResetEmail): Promise<void>;
}

export interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
}

export function createSmtpPasswordResetMailer(options: SmtpOptions): PasswordResetMailer {
  const transport = createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: options.user ? { user: options.user, pass: options.password } : undefined,
  });

  return {
    async sendPasswordReset({ to, resetUrl, expiresAt }) {
      const expiresInMinutes = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 60_000));
      await transport.sendMail({
        from: options.from,
        to,
        subject: 'Reset your NgLab password',
        text: [
          'A password reset was requested for your NgLab account.',
          '',
          `Reset your password: ${resetUrl}`,
          '',
          `This link expires in ${expiresInMinutes} minutes and can be used once.`,
          'If you did not request this, you can ignore this email.',
        ].join('\n'),
      });
    },
  };
}
