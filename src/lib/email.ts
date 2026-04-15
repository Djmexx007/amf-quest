/**
 * AMF Quest — Email Service
 *
 * Stratégie d'envoi (par ordre de priorité) :
 *   1. Resend API  (recommandé — fonctionne sur Vercel)
 *      → configurer RESEND_API_KEY + RESEND_FROM dans Vercel Dashboard
 *   2. Gmail SMTP  (fallback local — bloqué sur Vercel Hobby)
 *      → configurer GMAIL_USER + GMAIL_APP_PASSWORD
 */

import { Resend } from 'resend'
import nodemailer from 'nodemailer'

// ── Contenu de l'email ─────────────────────────────────────────────────────

function buildInviteHtml({
  greeting,
  inviterName,
  roleLabel,
  inviteUrl,
}: {
  greeting: string
  inviterName: string
  roleLabel: string
  inviteUrl: string
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation AMF Quest</title>
</head>
<body style="margin:0;padding:0;background:#080A12;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#111628;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
    <div style="background:linear-gradient(135deg,#0D1221,#161D35);padding:32px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="font-size:36px;margin-bottom:8px;">⚔️</div>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#D4A843;letter-spacing:3px;font-family:serif;">AMF QUEST</h1>
      <p style="margin:6px 0 0;color:#6B7280;font-size:13px;">Plateforme de préparation aux examens</p>
    </div>
    <div style="padding:36px 40px;">
      <p style="color:#E5E7EB;font-size:15px;margin:0 0 12px;">${greeting}</p>
      <p style="color:#9CA3AF;font-size:14px;line-height:1.6;margin:0 0 24px;">
        <strong style="color:#E5E7EB">${inviterName}</strong> t'invite à rejoindre
        <strong style="color:#D4A843">AMF Quest</strong> en tant que
        <strong style="color:#D4A843">${roleLabel}</strong>.<br><br>
        Prépare tes examens AMF et CSI à travers des mini-jeux RPG,
        un système de progression et des défis quotidiens.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${inviteUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#D4A843,#B8892A);color:#080A12;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.5px;">
          Accepter l'invitation →
        </a>
      </div>
      <p style="color:#6B7280;font-size:12px;text-align:center;margin:0 0 8px;">
        Ce lien expire dans <strong style="color:#9CA3AF">72 heures</strong>.
      </p>
      <p style="color:#4B5563;font-size:11px;text-align:center;word-break:break-all;margin:0;">
        ${inviteUrl}
      </p>
    </div>
    <div style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
      <p style="color:#374151;font-size:11px;margin:0;">
        Si tu n'attendais pas cette invitation, tu peux ignorer ce message.
      </p>
    </div>
  </div>
</body>
</html>`
}

// ── Params ─────────────────────────────────────────────────────────────────

export interface SendInvitationParams {
  to: string
  fullName: string | null
  inviteUrl: string
  role: string
  inviterName: string
}

// ── Envoi principal ────────────────────────────────────────────────────────

export async function sendInvitationEmail(params: SendInvitationParams): Promise<void> {
  const { to, fullName, inviteUrl, role, inviterName } = params

  const greeting = fullName ? `Bonjour ${fullName},` : 'Bonjour,'
  const roleLabels: Record<string, string> = {
    user:      'Utilisateur',
    moderator: 'Modérateur',
    god:       'Administrateur',
  }
  const roleLabel = roleLabels[role] ?? role
  const subject   = `${inviterName} t'invite sur AMF Quest ⚔️`
  const html      = buildInviteHtml({ greeting, inviterName, roleLabel, inviteUrl })

  // ── Stratégie 1 : Resend (fonctionne sur Vercel) ───────────────────────
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from   = process.env.RESEND_FROM ?? 'AMF Quest <onboarding@resend.dev>'

    const { error } = await resend.emails.send({ from, to, subject, html })
    if (error) throw new Error(`Resend: ${error.message}`)
    return
  }

  // ── Stratégie 2 : Gmail SMTP (fallback, local uniquement) ─────────────
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    await sendViaGmail({ to, subject, html })
    return
  }

  // ── Aucune config ──────────────────────────────────────────────────────
  throw new Error(
    'Email non configuré. ' +
    'Ajoute RESEND_API_KEY (recommandé) ou GMAIL_USER + GMAIL_APP_PASSWORD dans tes variables d\'environnement Vercel.'
  )
}

// ── Gmail SMTP helper ──────────────────────────────────────────────────────

async function sendViaGmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const transporter = nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   465,     // SSL (plus fiable que STARTTLS/587)
    secure: true,
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
    connectionTimeout: 15_000,
    socketTimeout:     15_000,
  })

  let lastErr: unknown
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await transporter.sendMail({
        from:    `AMF Quest <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html,
      })
      return
    } catch (err) {
      lastErr = err
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1_000))
    }
  }
  throw lastErr
}
