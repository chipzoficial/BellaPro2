import { absoluteAppUrl } from "@/lib/utils";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { AppointmentStatus } from "@prisma/client";

const resendApiUrl = "https://api.resend.com/emails";
const resendApiKey = process.env.RESEND_API_KEY;
const defaultFrom = process.env.RESEND_FROM_EMAIL ?? "BellaPro <no-reply@mail.bellapro.kadoshlabs.app.br>";

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(options: SendEmailOptions) {
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY não configurada. E-mail transacional não enviado.");
    return { success: false as const, skipped: true as const };
  }

  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: defaultFrom,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Falha ao enviar e-mail transacional. ${payload}`);
  }

  return { success: true as const };
}

export async function sendVerificationEmail(options: {
  to: string;
  name: string;
  token: string;
}) {
  const verificationUrl = absoluteAppUrl(`/confirmar-email?token=${options.token}`);

  return sendEmail({
    to: options.to,
    subject: "Confirme seu e-mail no BellaPro",
    text: [
      `Olá, ${options.name}.`,
      "",
      "Seu cadastro no BellaPro foi criado com sucesso.",
      `Confirme seu e-mail acessando este link: ${verificationUrl}`,
      "",
      "Se você não reconhece esse cadastro, ignore este e-mail.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #2b171d;">
        <p>Olá, ${options.name}.</p>
        <p>Seu cadastro no BellaPro foi criado com sucesso.</p>
        <p>
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 18px;background:#8a4760;color:#ffffff;text-decoration:none;border-radius:10px;">
            Confirmar e-mail
          </a>
        </p>
        <p>Se preferir, copie e cole este link no navegador:</p>
        <p>${verificationUrl}</p>
        <p>Se você não reconhece esse cadastro, ignore este e-mail.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(options: {
  to: string;
  name: string;
  token: string;
}) {
  const resetUrl = absoluteAppUrl(`/redefinir-senha?token=${options.token}`);

  return sendEmail({
    to: options.to,
    subject: "Redefina sua senha do BellaPro",
    text: [
      `Olá, ${options.name}.`,
      "",
      "Recebemos um pedido para redefinir sua senha no BellaPro.",
      `Use este link para criar uma nova senha: ${resetUrl}`,
      "",
      "Se você não solicitou essa alteração, ignore este e-mail.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #2b171d;">
        <p>Olá, ${options.name}.</p>
        <p>Recebemos um pedido para redefinir sua senha no BellaPro.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#8a4760;color:#ffffff;text-decoration:none;border-radius:10px;">
            Redefinir senha
          </a>
        </p>
        <p>Se preferir, copie e cole este link no navegador:</p>
        <p>${resetUrl}</p>
        <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
      </div>
    `,
  });
}

export async function sendBookingReceivedEmail(options: {
  to: string;
  clientName: string;
  organizationName: string;
  serviceName: string;
  professionalName: string;
  startAt: Date;
  priceInCents: number;
}) {
  const appointmentDate = formatDateTime(options.startAt, "dd/MM/yyyy 'às' HH:mm");
  const priceLabel = formatMoney(options.priceInCents);

  return sendEmail({
    to: options.to,
    subject: `Recebemos seu agendamento no ${options.organizationName}`,
    text: [
      `Olá, ${options.clientName}.`,
      "",
      `Recebemos seu pedido de agendamento no ${options.organizationName}.`,
      `${options.serviceName} com ${options.professionalName}`,
      `${appointmentDate}`,
      `Valor previsto: ${priceLabel}`,
      "",
      "O salão ainda pode confirmar esse horário antes do atendimento.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #2b171d;">
        <p>Olá, ${options.clientName}.</p>
        <p>Recebemos seu pedido de agendamento no <strong>${options.organizationName}</strong>.</p>
        <p>
          <strong>${options.serviceName}</strong><br />
          com ${options.professionalName}<br />
          ${appointmentDate}<br />
          Valor previsto: ${priceLabel}
        </p>
        <p>O salão ainda pode confirmar esse horário antes do atendimento.</p>
      </div>
    `,
  });
}

export async function sendAppointmentStatusEmail(options: {
  to: string;
  clientName: string;
  organizationName: string;
  serviceName: string;
  professionalName: string;
  startAt: Date;
  status: AppointmentStatus;
}) {
  const appointmentDate = formatDateTime(options.startAt, "dd/MM/yyyy 'às' HH:mm");

  const statusContentMap: Partial<
    Record<
      AppointmentStatus,
      {
        subject: string;
        title: string;
        body: string;
      }
    >
  > = {
    [AppointmentStatus.CONFIRMED]: {
      subject: `Seu horário foi confirmado no ${options.organizationName}`,
      title: "Seu horário foi confirmado",
      body: "Seu atendimento está confirmado e reservado para você.",
    },
    [AppointmentStatus.CANCELED]: {
      subject: `Seu horário foi cancelado no ${options.organizationName}`,
      title: "Seu horário foi cancelado",
      body: "Se precisar, entre em contato com o salão para remarcar.",
    },
    [AppointmentStatus.NO_SHOW]: {
      subject: `Atualização do seu horário no ${options.organizationName}`,
      title: "Seu atendimento foi marcado como falta",
      body: "Se isso não estiver correto, fale com o salão para ajustar.",
    },
  };

  const content = statusContentMap[options.status];

  if (!content) {
    return { success: false as const, skipped: true as const };
  }

  return sendEmail({
    to: options.to,
    subject: content.subject,
    text: [
      `Olá, ${options.clientName}.`,
      "",
      `${content.title}.`,
      `${options.serviceName} com ${options.professionalName}`,
      `${appointmentDate}`,
      "",
      content.body,
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #2b171d;">
        <p>Olá, ${options.clientName}.</p>
        <p><strong>${content.title}</strong></p>
        <p>
          ${options.serviceName}<br />
          com ${options.professionalName}<br />
          ${appointmentDate}
        </p>
        <p>${content.body}</p>
      </div>
    `,
  });
}
