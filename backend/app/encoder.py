import base64
import json
from datetime import datetime
from uuid import UUID

def encode_cursor(item_date, id):
    payload = {
        "item_date": item_date.isoformat(),
        "id": str(id)
    }
    raw = json.dumps(payload).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")

def decode_cursor(cursor):
    padding = "=" * (-len(cursor) % 4)
    raw = base64.urlsafe_b64decode(cursor + padding)
    data = json.loads(raw)
    return {
        "item_date": datetime.fromisoformat(data.get("item_date", None)),
        "id": UUID(data.get("id", None))
    }