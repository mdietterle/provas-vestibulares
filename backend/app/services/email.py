"""Serviço de envio de e-mail via Resend (https://resend.com).

Configuração via variáveis de ambiente:
  RESEND_API_KEY  — chave da API do Resend (obrigatório para enviar)
  EMAIL_FROM      — endereço remetente (ex: convites@suaescola.com.br)
  FRONTEND_URL    — URL base do frontend (ex: https://app.suaescola.com.br)
"""
import textwrap

import requests

from app.core.config import settings

_RESEND_URL = "https://api.resend.com/emails"


def _send(to: str, subject: str, html: str) -> None:
    if not settings.RESEND_API_KEY:
        print(f"[EMAIL] Para: {to} | Assunto: {subject} (RESEND_API_KEY não configurado — e-mail não enviado)")
        return

    resp = requests.post(
        _RESEND_URL,
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": settings.EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        },
        timeout=10,
    )
    if not resp.ok:
        raise RuntimeError(f"Resend API error {resp.status_code}: {resp.text}")


def send_student_invitation(
    *,
    to_email: str,
    student_name: str,
    institution_name: str,
    token: str,
) -> None:
    magic_link = f"{settings.FRONTEND_URL}/convite/{token}"
    expire_days = settings.INVITATION_EXPIRE_DAYS
    subject = f"Convite para a plataforma — {institution_name}"
    html = textwrap.dedent(f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,35,111,.10)">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#00236f 0%,#6b38d4 100%);padding:36px 40px 28px;text-align:center">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-.5px">
                  Você foi convidado! 🎉
                </h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px">
                <p style="margin:0 0 12px;font-size:16px;color:#0b1c30">Olá, <strong>{student_name}</strong>!</p>
                <p style="margin:0 0 24px;font-size:15px;color:#444651;line-height:1.6">
                  A instituição <strong>{institution_name}</strong> convidou você para acessar a
                  plataforma de avaliações. Clique no botão abaixo para criar sua senha e começar a usar.
                </p>
                <div style="text-align:center;margin:32px 0">
                  <a href="{magic_link}"
                     style="display:inline-block;background:linear-gradient(135deg,#00236f,#6b38d4);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:.3px">
                    Criar minha senha e acessar
                  </a>
                </div>
                <p style="margin:24px 0 0;font-size:13px;color:#757682;text-align:center">
                  Ou copie e cole este link no seu navegador:<br>
                  <span style="color:#6b38d4;word-break:break-all">{magic_link}</span>
                </p>
                <hr style="margin:32px 0;border:none;border-top:1px solid #e5eeff">
                <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
                  Este link é pessoal e expira em <strong>{expire_days} dias</strong>.<br>
                  Se você não esperava este e-mail, pode ignorá-lo com segurança.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """)
    _send(to_email, subject, html)


def send_feedback_report(
    *,
    message: str,
    page_url: str,
    reporter_email: str | None,
) -> None:
    to_email = "martim.dietterle@gmail.com"
    subject = "Sugestões Cognition"
    safe_message = message.replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
    reporter_line = reporter_email or "não identificado"
    html = textwrap.dedent(f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,35,111,.10)">
            <tr>
              <td style="background:linear-gradient(135deg,#2563EB 0%,#6366F1 100%);padding:36px 40px 28px;text-align:center">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-.5px">
                  Novo reporte de usuário
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px">
                <p style="margin:0 0 6px;font-size:13px;color:#757682">Página: <strong>{page_url}</strong></p>
                <p style="margin:0 0 20px;font-size:13px;color:#757682">Usuário: <strong>{reporter_line}</strong></p>
                <hr style="margin:0 0 20px;border:none;border-top:1px solid #e5eeff">
                <p style="margin:0;font-size:15px;color:#0b1c30;line-height:1.6">{safe_message}</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """)
    _send(to_email, subject, html)


def send_password_reset(
    *,
    to_email: str,
    name: str,
    token: str,
) -> None:
    reset_link = f"{settings.FRONTEND_URL}/redefinir-senha/{token}"
    expire_hours = settings.PASSWORD_RESET_EXPIRE_HOURS
    subject = "Redefinição de senha — Plataforma de Avaliações"
    html = textwrap.dedent(f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,35,111,.10)">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#00236f 0%,#6b38d4 100%);padding:36px 40px 28px;text-align:center">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-.5px">
                  Redefinir senha 🔒
                </h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px">
                <p style="margin:0 0 12px;font-size:16px;color:#0b1c30">Olá, <strong>{name}</strong>!</p>
                <p style="margin:0 0 24px;font-size:15px;color:#444651;line-height:1.6">
                  Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para
                  escolher uma nova senha.
                </p>
                <div style="text-align:center;margin:32px 0">
                  <a href="{reset_link}"
                     style="display:inline-block;background:linear-gradient(135deg,#00236f,#6b38d4);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:.3px">
                    Redefinir minha senha
                  </a>
                </div>
                <p style="margin:24px 0 0;font-size:13px;color:#757682;text-align:center">
                  Ou copie e cole este link no seu navegador:<br>
                  <span style="color:#6b38d4;word-break:break-all">{reset_link}</span>
                </p>
                <hr style="margin:32px 0;border:none;border-top:1px solid #e5eeff">
                <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
                  Este link é pessoal e expira em <strong>{expire_hours} horas</strong>.<br>
                  Se você não pediu essa redefinição, pode ignorar este e-mail com segurança — sua senha
                  continua a mesma.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """)
    _send(to_email, subject, html)
