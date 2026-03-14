import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from core.config import GMAIL_SENDER, GMAIL_APP_PASSWORD

def send_reset_email(to_email: str, full_name: str, reset_link: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Réinitialisation de votre mot de passe — Atlantic Re"
    msg["From"] = f"Atlantic Re <{GMAIL_SENDER}>"
    msg["To"] = to_email

    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #f5f6f8; padding: 40px;">
      <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1E2D3D, #2D3E50); padding: 32px; text-align: center;">
          <h1 style="color: white; font-size: 1.4rem; margin: 0;">
            Atlantic<span style="color:#8AAF35">Re</span>
          </h1>
          <p style="color: rgba(255,255,255,0.45); font-size: 0.7rem; letter-spacing: 0.15em; margin: 4px 0 0;">
            CDG GROUP
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 36px 32px;">
          <p style="color:#2D3E50;font-size:0.95rem;">
            Bonjour <strong>{full_name}</strong>,
          </p>
          <p style="color:#4A5568;font-size:0.88rem; line-height:1.6;">
            Votre administrateur a demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
          </p>

          <!-- Bouton -->
          <div style="text-align:center;margin:32px 0;">
            <a href="{reset_link}" style="background: linear-gradient(135deg, #4E6820, #6B8C2A); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.9rem; display: inline-block;">
              🔑 Réinitialiser mon mot de passe
            </a>
          </div>

          <!-- Avertissements -->
          <div style="background:#FFF8E7; border-left: 3px solid #F4C842; padding: 12px 16px; border-radius: 6px; margin-bottom: 16px;">
            <p style="margin:0;color:#B07D00; font-size:0.82rem;">
              ⏱️ Ce lien expire dans <strong>24 heures</strong>
            </p>
          </div>

          <p style="color:#7A8A99;font-size:0.78rem;">
            Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Votre mot de passe ne sera pas modifié.
          </p>

          <!-- Lien brut en fallback -->
          <p style="color:#CBD2DA;font-size:0.72rem; word-break:break-all;">
            Lien : {reset_link}
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#F5F6F8; padding: 16px 32px; text-align: center; border-top: 1px solid #EEF0F3;">
          <p style="color:#7A8A99; font-size:0.72rem;margin:0;">
            Atlantic Re — CDG Group · Cet email est automatique, ne pas répondre.
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_SENDER, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_SENDER, to_email, msg.as_string())

def send_welcome_email(to_email: str, full_name: str, username: str, temp_password: str, role: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Bienvenue sur Atlantic Re — Vos accès"
    msg["From"] = f"Atlantic Re <{GMAIL_SENDER}>"
    msg["To"] = to_email

    role_colors = {
        "admin": "#1E2D3D",
        "souscripteur": "#4E6820",
        "lecteur": "#7A8A99",
    }
    role_labels = {
        "admin": "Administrateur",
        "souscripteur": "Souscripteur",
        "lecteur": "Lecteur",
    }
    badge_color = role_colors.get(role, "#7A8A99")
    role_label = role_labels.get(role, role)

    from core.config import FRONTEND_URL

    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #f5f6f8; padding: 40px;">
      <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #1E2D3D, #2D3E50); padding: 32px; text-align: center;">
          <h1 style="color:white; font-size:1.4rem; margin:0;">
            Atlantic<span style="color:#8AAF35">Re</span>
          </h1>
          <p style="color:rgba(255,255,255,0.45); font-size:0.7rem; letter-spacing:0.15em; margin:4px 0 0;">
            CDG GROUP
          </p>
        </div>
        <div style="padding: 36px 32px;">
          <p style="color:#2D3E50; font-size:0.95rem;">
            Bonjour <strong>{full_name}</strong>,
          </p>
          <p style="color:#4A5568; font-size:0.88rem; line-height:1.6;">
            Votre compte Atlantic Re a été créé. Voici vos identifiants de connexion :
          </p>
          <div style="background:#F5F6F8; border:1px solid #EEF0F3; border-radius:10px; padding:20px 24px; margin:24px 0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
              <span style="color:#7A8A99; font-size:0.78rem;">Identifiant</span>
              <strong style="color:#2D3E50; font-size:0.88rem;">{username}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
              <span style="color:#7A8A99; font-size:0.78rem;">Mot de passe temporaire</span>
              <strong style="color:#2D3E50; font-family:monospace; font-size:1rem; letter-spacing:0.1em; background:#EEF0F3; padding:2px 10px; border-radius:4px;">
                {temp_password}
              </strong>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#7A8A99; font-size:0.78rem;">Rôle</span>
              <span style="background:{badge_color}; color:white; padding:2px 12px; border-radius:12px; font-size:0.75rem; font-weight:600;">
                {role_label}
              </span>
            </div>
          </div>
          <div style="background:#FFF8E7; border-left:3px solid #F4C842; padding:12px 16px; border-radius:6px; margin-bottom:20px;">
            <p style="margin:0;color:#B07D00; font-size:0.82rem;">
              ⚠️ Ce mot de passe est <strong>temporaire</strong>. Vous devrez le modifier dès votre première connexion.
            </p>
          </div>
          <div style="text-align:center; margin:28px 0;">
            <a href="{FRONTEND_URL}/login" style="background:linear-gradient(135deg,#4E6820,#6B8C2A); color:white; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:600; font-size:0.9rem; display:inline-block;">
              🔐 Accéder à Atlantic Re
            </a>
          </div>
          <p style="color:#7A8A99; font-size:0.78rem;">
            Si vous n'êtes pas concerné par cet email, contactez votre administrateur.
          </p>
        </div>
        <div style="background:#F5F6F8; padding:16px 32px; text-align:center; border-top:1px solid #EEF0F3;">
          <p style="color:#7A8A99; font-size:0.72rem; margin:0;">
            Atlantic Re — CDG Group · Cet email est automatique, ne pas répondre.
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_SENDER, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_SENDER, to_email, msg.as_string())
