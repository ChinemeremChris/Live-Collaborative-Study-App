import base64
import json
from datetime import datetime
from uuid import UUID

def encode_cursor(started_at, session_id):
    payload = {
        "started_at": started_at.isoformat(),
        "session_id": str(session_id)
    }
    raw = json.dumps(payload).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")

def decode_cursor(cursor):
    padding = "=" * (-len(cursor) % 4)
    raw = base64.urlsafe_b64decode(cursor + padding)
    data = json.loads(raw)
    return {
        "started_at": datetime.fromisoformat(data.get("started_at", None)),
        "session_id": UUID(data.get("session_id", None))
    }