/**
 * Envio de e-mail. Com RESEND_API_KEY usa o Resend (https://resend.com); sem a chave,
 * em desenvolvimento, imprime o e-mail no console (para testar o fluxo sem provedor).
 * Em produção sem chave nada é enviado e o erro fica registrado no log do servidor.
 */
export type Mail = { to: string; subject: string; text: string };

export const outbox: Mail[] = []; // usado nos testes

/** Cópia oculta (Cco) de todo e-mail enviado pelo site. EMAIL_BCC=vazio desliga; vários separados por vírgula. */
const BCC_PADRAO = 'diandroavp@gmail.com';
export function bccFor(to: string): string[] {
  const raw = process.env.EMAIL_BCC ?? BCC_PADRAO;
  return raw.split(',').map((e) => e.trim()).filter((e) => e && e.toLowerCase() !== to.toLowerCase());
}

export async function sendEmail(mail: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== 'production') {
      outbox.push(mail);
      if (process.env.NODE_ENV === 'development') console.log(`[e-mail simulado] para ${mail.to}: ${mail.subject}\n${mail.text}`);
      return true;
    }
    console.error('RESEND_API_KEY ausente: e-mail não enviado.');
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? 'Simulaki <nao-responda@simulaki.com>', to: mail.to, ...(bccFor(mail.to).length ? { bcc: bccFor(mail.to) } : {}), subject: mail.subject, text: mail.text }),
  });
  if (!res.ok) console.error('Falha ao enviar e-mail:', res.status);
  return res.ok;
}
