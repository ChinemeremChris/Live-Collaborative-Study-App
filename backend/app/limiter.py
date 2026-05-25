from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
from dotenv import load_dotenv

load_dotenv()
limiter = Limiter(key_func=get_remote_address, storage_uri=os.getenv("REDIS_URL"))