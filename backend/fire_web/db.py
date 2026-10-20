"""Lop du lieu SQLite: luu tai khoan nguoi dung va lich su phat hien chay/khoi.

Dung sqlite3 trong thu vien chuan cua Python (khong can cai them gi).
File CSDL nam o backend/data/fire_detection.db.
"""

import hashlib
import secrets
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

ROOT_DIR = Path(__file__).resolve().parent.parent  # thu muc backend/
DEFAULT_DB_PATH = ROOT_DIR / "data" / "fire_detection.db"

# Tham so bam mat khau bang PBKDF2-HMAC-SHA256 (co trong thu vien chuan).
_PBKDF2_ITERATIONS = 200_000
_HASH_ALGO = "sha256"

# SQLite khong an toan khi dung 1 connection tren nhieu luong => moi luong 1 conn.
_local = threading.local()
_db_path: Path = DEFAULT_DB_PATH


# --------------------------------------------------------------------------- #
# Ket noi & khoi tao
# --------------------------------------------------------------------------- #
def _connect() -> sqlite3.Connection:
    """Tra ve connection rieng cho luong hien tai (co cache)."""
    conn = getattr(_local, "conn", None)
    if conn is None:
        conn = sqlite3.connect(str(_db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        _local.conn = conn
    return conn


def init_db(db_path: str | Path = DEFAULT_DB_PATH) -> None:
    """Tao file CSDL + bang neu chua co, va seed tai khoan mac dinh."""
    global _db_path
    _db_path = Path(db_path)
    _db_path.parent.mkdir(parents=True, exist_ok=True)
    # Reset connection cache khi doi duong dan (huu ich cho test).
    if getattr(_local, "conn", None) is not None:
        try:
            _local.conn.close()
        except Exception:
            pass
        _local.conn = None

    conn = _connect()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            email         TEXT UNIQUE NOT NULL,
            username      TEXT,
            full_name     TEXT,
            password_hash TEXT NOT NULL,
            salt          TEXT NOT NULL,
            role          TEXT NOT NULL DEFAULT 'operator',
            created_at    TEXT NOT NULL,
            last_login_at TEXT
        );

        CREATE TABLE IF NOT EXISTS detections (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
            camera_name      TEXT NOT NULL DEFAULT '',
            type             TEXT NOT NULL,          -- 'fire' | 'smoke' | 'suspect'
            severity         TEXT NOT NULL DEFAULT 'medium',
            confidence       REAL NOT NULL DEFAULT 0,
            detected_classes TEXT NOT NULL DEFAULT '',  -- CSV: 'fire,smoke'
            box_count        INTEGER NOT NULL DEFAULT 0,
            image_path       TEXT,                   -- duong dan snapshot (neu luu)
            source           TEXT NOT NULL DEFAULT 'camera',  -- camera | ip | upload
            acknowledged     INTEGER NOT NULL DEFAULT 0,
            acknowledged_by  TEXT,
            created_at       TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_detections_created
            ON detections (created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_detections_type
            ON detections (type);
        """
    )
    conn.commit()

    # Seed tai khoan mac dinh (khop voi man dang nhap cua frontend) neu chua co ai.
    if _count_users(conn) == 0:
        _seed_default_users(conn)


def _seed_default_users(conn: sqlite3.Connection) -> None:
    defaults = [
        ("admin", "admin", "Quản trị hệ thống", "admin123", "admin"),
        ("sinh@gmail.com", "sinh", "Nhân viên trực ca", "111111", "operator"),
    ]
    for email, username, full_name, password, role in defaults:
        salt = secrets.token_hex(16)
        conn.execute(
            "INSERT INTO users (email, username, full_name, password_hash, salt, role, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?)",
            (email, username, full_name, _hash_password(password, salt), salt, role, _now()),
        )
    conn.commit()


# --------------------------------------------------------------------------- #
# Tien ich
# --------------------------------------------------------------------------- #
def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _hash_password(password: str, salt: str) -> str:
    dk = hashlib.pbkdf2_hmac(
        _HASH_ALGO, password.encode("utf-8"), salt.encode("utf-8"), _PBKDF2_ITERATIONS
    )
    return dk.hex()


def _count_users(conn: sqlite3.Connection) -> int:
    return conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"]


def _user_public(row: sqlite3.Row) -> dict[str, Any]:
    """Chuyen ban ghi user thanh dict cong khai (khong lo mat khau)."""
    return {
        "id": row["id"],
        "email": row["email"],
        "username": row["username"],
        "full_name": row["full_name"],
        "role": row["role"],
        "created_at": row["created_at"],
        "last_login_at": row["last_login_at"],
    }


# --------------------------------------------------------------------------- #
# Tai khoan
# --------------------------------------------------------------------------- #
def create_user(
    email: str,
    password: str,
    username: str = "",
    full_name: str = "",
    role: str = "operator",
) -> dict[str, Any]:
    """Tao tai khoan moi. Nem ValueError neu email da ton tai hoac thieu du lieu."""
    email = (email or "").strip().lower()
    if not email or not password:
        raise ValueError("Thiếu email hoặc mật khẩu.")
    if len(password) < 6:
        raise ValueError("Mật khẩu phải có ít nhất 6 ký tự.")

    conn = _connect()
    if conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
        raise ValueError("Email này đã được đăng ký.")

    salt = secrets.token_hex(16)
    cur = conn.execute(
        "INSERT INTO users (email, username, full_name, password_hash, salt, role, created_at)"
        " VALUES (?, ?, ?, ?, ?, ?, ?)",
        (email, username or None, full_name or None, _hash_password(password, salt), salt, role, _now()),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    return _user_public(row)


def verify_user(email: str, password: str) -> Optional[dict[str, Any]]:
    """Kiem tra dang nhap. Tra ve dict user neu dung, None neu sai."""
    email = (email or "").strip().lower()
    conn = _connect()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if row is None:
        return None
    if not secrets.compare_digest(row["password_hash"], _hash_password(password, row["salt"])):
        return None
    conn.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (_now(), row["id"]))
    conn.commit()
    return _user_public(row)


def get_user(user_id: int) -> Optional[dict[str, Any]]:
    conn = _connect()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return _user_public(row) if row else None


def list_users() -> list[dict[str, Any]]:
    conn = _connect()
    rows = conn.execute("SELECT * FROM users ORDER BY id").fetchall()
    return [_user_public(r) for r in rows]


# --------------------------------------------------------------------------- #
# Phat hien chay/khoi
# --------------------------------------------------------------------------- #
def insert_detection(
    type: str,
    confidence: float = 0.0,
    camera_name: str = "",
    severity: str = "medium",
    detected_classes: Optional[list[str]] = None,
    box_count: int = 0,
    image_path: Optional[str] = None,
    source: str = "camera",
    user_id: Optional[int] = None,
) -> dict[str, Any]:
    """Luu 1 su kien phat hien chay/khoi vao CSDL."""
    conn = _connect()
    classes_csv = ",".join(detected_classes or [])
    cur = conn.execute(
        "INSERT INTO detections"
        " (user_id, camera_name, type, severity, confidence, detected_classes,"
        "  box_count, image_path, source, created_at)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            user_id, camera_name, type, severity, float(confidence),
            classes_csv, int(box_count), image_path, source, _now(),
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM detections WHERE id = ?", (cur.lastrowid,)).fetchone()
    return _detection_public(row)


def _detection_public(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "camera_name": row["camera_name"],
        "type": row["type"],
        "severity": row["severity"],
        "confidence": row["confidence"],
        "detected_classes": [c for c in (row["detected_classes"] or "").split(",") if c],
        "box_count": row["box_count"],
        "image_path": row["image_path"],
        "source": row["source"],
        "acknowledged": bool(row["acknowledged"]),
        "acknowledged_by": row["acknowledged_by"],
        "created_at": row["created_at"],
    }


def list_detections(
    limit: int = 100,
    offset: int = 0,
    type: Optional[str] = None,
    acknowledged: Optional[bool] = None,
) -> list[dict[str, Any]]:
    conn = _connect()
    clauses: list[str] = []
    params: list[Any] = []
    if type:
        clauses.append("type = ?")
        params.append(type)
    if acknowledged is not None:
        clauses.append("acknowledged = ?")
        params.append(1 if acknowledged else 0)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    params.extend([max(1, min(500, limit)), max(0, offset)])
    rows = conn.execute(
        f"SELECT * FROM detections {where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
        params,
    ).fetchall()
    return [_detection_public(r) for r in rows]


def acknowledge_detection(detection_id: int, operator_name: str = "") -> Optional[dict[str, Any]]:
    conn = _connect()
    conn.execute(
        "UPDATE detections SET acknowledged = 1, acknowledged_by = ? WHERE id = ?",
        (operator_name or None, detection_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM detections WHERE id = ?", (detection_id,)).fetchone()
    return _detection_public(row) if row else None


def detection_stats() -> dict[str, Any]:
    """Thong ke nhanh cho dashboard."""
    conn = _connect()
    total = conn.execute("SELECT COUNT(*) AS n FROM detections").fetchone()["n"]
    by_type_rows = conn.execute(
        "SELECT type, COUNT(*) AS n FROM detections GROUP BY type"
    ).fetchall()
    unack = conn.execute(
        "SELECT COUNT(*) AS n FROM detections WHERE acknowledged = 0"
    ).fetchone()["n"]
    today = datetime.now(timezone.utc).date().isoformat()
    today_count = conn.execute(
        "SELECT COUNT(*) AS n FROM detections WHERE created_at LIKE ?", (f"{today}%",)
    ).fetchone()["n"]
    return {
        "total": total,
        "today": today_count,
        "unacknowledged": unack,
        "by_type": {r["type"]: r["n"] for r in by_type_rows},
    }
