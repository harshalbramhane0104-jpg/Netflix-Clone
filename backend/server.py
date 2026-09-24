from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import aiomysql
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
MYSQL_PORT = int(os.environ.get('MYSQL_PORT', '3306'))
MYSQL_USER = os.environ.get('MYSQL_USER', 'netflix_app')
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', 'netflix_pw_123')
MYSQL_DB = os.environ.get('MYSQL_DB', 'netflix_clone')

JWT_SECRET = os.environ.get('JWT_SECRET', 'netflix-clone-secret-change-me-please-2025')
JWT_ALGO = 'HS256'
JWT_EXPIRE_DAYS = 30

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

pool: Optional[aiomysql.Pool] = None


# ---------- Models ----------
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    created_at: datetime


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class MyListItem(BaseModel):
    tmdb_id: int
    media_type: str
    title: str
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    overview: Optional[str] = None
    vote_average: Optional[float] = None


class MyListItemOut(MyListItem):
    id: str
    added_at: datetime


# ---------- DB setup ----------
SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(80) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    """
    CREATE TABLE IF NOT EXISTS mylist (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        tmdb_id INT NOT NULL,
        media_type VARCHAR(20) NOT NULL,
        title VARCHAR(255) NOT NULL,
        poster_path VARCHAR(255),
        backdrop_path VARCHAR(255),
        overview TEXT,
        vote_average FLOAT,
        added_at DATETIME NOT NULL,
        UNIQUE KEY uniq_user_tmdb (user_id, tmdb_id),
        CONSTRAINT fk_mylist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
]


async def init_db():
    global pool
    pool = await aiomysql.create_pool(
        host=MYSQL_HOST, port=MYSQL_PORT, user=MYSQL_USER, password=MYSQL_PASSWORD,
        db=MYSQL_DB, autocommit=True, minsize=1, maxsize=10,
    )
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            for stmt in SCHEMA:
                await cur.execute(stmt)
    logger.info(f"Connected to MySQL database '{MYSQL_DB}' at {MYSQL_HOST}:{MYSQL_PORT}")


async def close_db():
    if pool:
        pool.close()
        await pool.wait_closed()


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user = await cur.fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def user_to_out(u: dict) -> UserOut:
    return UserOut(id=u["id"], email=u["email"], name=u["name"], created_at=u["created_at"])


def item_to_out(row: dict) -> MyListItemOut:
    return MyListItemOut(
        id=row["id"], tmdb_id=row["tmdb_id"], media_type=row["media_type"], title=row["title"],
        poster_path=row["poster_path"], backdrop_path=row["backdrop_path"], overview=row["overview"],
        vote_average=row["vote_average"], added_at=row["added_at"],
    )


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Netflix Clone API"}


@api_router.post("/auth/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT id FROM users WHERE email = %s", (req.email.lower(),))
            if await cur.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered")
            user_doc = {
                "id": str(uuid.uuid4()),
                "email": req.email.lower(),
                "name": req.name,
                "password_hash": pwd_ctx.hash(req.password),
                "created_at": now_utc(),
            }
            await cur.execute(
                "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (%s, %s, %s, %s, %s)",
                (user_doc["id"], user_doc["email"], user_doc["name"], user_doc["password_hash"], user_doc["created_at"]),
            )
    token = create_token(user_doc["id"])
    return AuthResponse(token=token, user=user_to_out(user_doc))


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT * FROM users WHERE email = %s", (req.email.lower(),))
            user = await cur.fetchone()
    if not user or not pwd_ctx.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"])
    return AuthResponse(token=token, user=user_to_out(user))


@api_router.get("/auth/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return user_to_out(user)


@api_router.get("/mylist", response_model=List[MyListItemOut])
async def get_mylist(user=Depends(get_current_user)):
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(
                "SELECT * FROM mylist WHERE user_id = %s ORDER BY added_at DESC", (user["id"],)
            )
            rows = await cur.fetchall()
    return [item_to_out(r) for r in rows]


@api_router.post("/mylist", response_model=MyListItemOut)
async def add_to_mylist(item: MyListItem, user=Depends(get_current_user)):
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(
                "SELECT * FROM mylist WHERE user_id = %s AND tmdb_id = %s", (user["id"], item.tmdb_id)
            )
            existing = await cur.fetchone()
            if existing:
                return item_to_out(existing)
            doc = item.dict()
            doc.update({"id": str(uuid.uuid4()), "user_id": user["id"], "added_at": now_utc()})
            await cur.execute(
                """INSERT INTO mylist (id, user_id, tmdb_id, media_type, title, poster_path, backdrop_path,
                   overview, vote_average, added_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (doc["id"], doc["user_id"], doc["tmdb_id"], doc["media_type"], doc["title"],
                 doc["poster_path"], doc["backdrop_path"], doc["overview"], doc["vote_average"], doc["added_at"]),
            )
    return item_to_out(doc)


@api_router.delete("/mylist/{tmdb_id}")
async def remove_from_mylist(tmdb_id: int, user=Depends(get_current_user)):
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "DELETE FROM mylist WHERE user_id = %s AND tmdb_id = %s", (user["id"], tmdb_id)
            )
            deleted = cur.rowcount
    return {"deleted": deleted}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()


@app.on_event("shutdown")
async def shutdown():
    await close_db()
