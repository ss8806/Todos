from pathlib import Path
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from jinja2 import Environment, FileSystemLoader
from app.core.config import settings

# Jinja2 テンプレート環境
template_dir = Path(__file__).resolve().parent.parent / "templates" / "email"
jinja_env = Environment(loader=FileSystemLoader(str(template_dir)))

# fastapi-mail 設定
mail_config = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USER or "",
    MAIL_PASSWORD=settings.SMTP_PASSWORD or "",
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_HOST,
    MAIL_STARTTLS=settings.SMTP_TLS,
    MAIL_SSL_TLS=settings.SMTP_SSL,
    USE_CREDENTIALS=bool(settings.SMTP_USER),
    VALIDATE_CERTS=settings.SMTP_TLS or settings.SMTP_SSL,
    TEMPLATE_FOLDER=str(template_dir),
)

fastmail = FastMail(mail_config)


async def send_reset_password_email(email: str, reset_token: str) -> None:
    """パスワードリセットメールを送信する"""
    template = jinja_env.get_template("reset_password.html")
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    html_content = template.render(
        reset_url=reset_url,
        expire_hours=settings.RESET_TOKEN_EXPIRE_HOURS,
        app_name=settings.MAIL_FROM_NAME,
    )

    text_template = jinja_env.get_template("reset_password.txt")
    text_content = text_template.render(
        reset_url=reset_url,
        expire_hours=settings.RESET_TOKEN_EXPIRE_HOURS,
        app_name=settings.MAIL_FROM_NAME,
    )

    message = MessageSchema(
        subject=f"【{settings.MAIL_FROM_NAME}】パスワードリセットのご案内",
        recipients=[email],
        body=html_content,
        subtype="html",
    )

    await fastmail.send_message(message)
