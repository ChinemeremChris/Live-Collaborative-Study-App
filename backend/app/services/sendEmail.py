import os
from dotenv import load_dotenv
import resend
import logging

load_dotenv()
logger = logging.getLogger(__name__)

def SendEmail(to: str, subject: str, html: str):
    resend.api_key = os.getenv("RESEND_API_KEY")
    message = {
        "from": os.getenv("FROM_EMAIL"),
        "to": to,
        "subject": subject,
        "html": html
    }
    try:
        r = resend.Emails.send(message)
    except Exception as e:
        logger.error(f"SendEmail error: {e}", exc_info=True)


if __name__ == "__main__":
    SendEmail('ccjezzy@gmail.com', 'Knicks', '<p>Does this look good?</p>')
        