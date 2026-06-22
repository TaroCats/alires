from __future__ import annotations

import base64
import hashlib
import hmac
import time

from fastapi import Header, HTTPException

from api.config import settings


TOKEN_TTL_SECONDS = 60 * 60 * 12


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def issue_token(username: str) -> str:
    expires = int(time.time()) + TOKEN_TTL_SECONDS
    payload = f"{username}:{expires}"
    signature = hmac.new(settings.token_secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    raw = f"{payload}:{signature}".encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8")


def verify_token(token: str) -> str:
    try:
        decoded = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        username, expires, signature = decoded.split(":", 2)
    except Exception as exc:  # pragma: no cover - defensive branch
        raise HTTPException(status_code=401, detail="无效登录态") from exc
    payload = f"{username}:{expires}"
    expected = hmac.new(settings.token_secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="无效登录态")
    if int(expires) < int(time.time()):
        raise HTTPException(status_code=401, detail="登录已过期")
    return username


def require_auth(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="请先登录")
    return verify_token(authorization.split(" ", 1)[1])
