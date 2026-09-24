# Netflix Clone — 3-Tier Architecture

A Netflix-style streaming UI: sign up / log in, browse rows of titles pulled live
from TMDB, search, save titles to "My List", watch trailers, and manage your account.

## The 3 tiers

1. **Presentation tier** — `frontend/` — React UI (Netflix-style, black/red theme,
   Tailwind CSS). Talks to the backend only over HTTP (`REACT_APP_BACKEND_URL`).
2. **Application/logic tier** — `backend/` — FastAPI. Handles auth (JWT + bcrypt),
   business rules, and all reads/writes to the database. This is the only thing
   that talks to the database.
3. **Data tier** — **MySQL** (or MariaDB, which is fully MySQL-compatible) —
   `users` and `mylist` tables. Nothing outside the backend touches it directly.

Each tier can run on its own machine — the frontend just needs the backend's URL,
and the backend just needs the MySQL host/port/credentials in `.env`.

## 1. Set up MySQL (data tier)

You need a MySQL server running somewhere reachable by the backend. Options:

**Local install (Windows):** install [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)
(the installer includes MySQL Workbench, a GUI you can use for the next step).

**Local install (Mac):** `brew install mysql && brew services start mysql`

**Docker (any OS), fastest if you have Docker:**
```bash
docker run --name netflix-mysql -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 -d mysql:8
```

Once MySQL is running, create the database and an app user (run in `mysql` CLI,
MySQL Workbench, or `docker exec -it netflix-mysql mysql -uroot -proot`):
```sql
CREATE DATABASE netflix_clone;
CREATE USER 'netflix_app'@'%' IDENTIFIED BY 'netflix_pw_123';
GRANT ALL PRIVILEGES ON netflix_clone.* TO 'netflix_app'@'%';
FLUSH PRIVILEGES;
```
(Change the password — this is just a placeholder.)

The backend auto-creates the `users` and `mylist` tables on first run — you don't
need to run `backend/schema.sql` yourself unless you want to inspect it or set the
schema up ahead of time.

## 2. Configure the backend

Edit `backend/.env` if your MySQL credentials differ from the defaults:
```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=netflix_app
MYSQL_PASSWORD=netflix_pw_123
MYSQL_DB=netflix_clone
```

## 3. Run the backend (application tier)

```bash
cd backend
python -m venv venv
venv\Scripts\Activate.ps1      # Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```
Ready when you see `Connected to MySQL database 'netflix_clone'` and
`Uvicorn running on http://0.0.0.0:8000`.

## 4. Run the frontend (presentation tier)

```bash
cd frontend
npm install
npm start
```
Opens `http://localhost:3000`. It already points at `http://localhost:8000` via
`frontend/.env` — change `REACT_APP_BACKEND_URL` if your backend runs elsewhere.

## Try it

1. Sign up on the landing page → lands you on the browse dashboard (rows load live
   from TMDB).
2. Search bar in the nav — type and get live results.
3. Click a title to open a modal that autoplays its YouTube trailer (via TMDB's
   video API — it only ever streams trailers, never full films).
4. Click **+** on any card to save it to My List; view saved titles under **My List**.
5. **Account** (profile menu) shows your info and lets you sign out.

## Verified working

I ran this against a live MySQL-compatible server end-to-end — signup, login, add/
remove from My List, and confirmed the rows land correctly in the `users` and
`mylist` tables — plus a full frontend production build with no errors.

## Inspecting your data

```sql
USE netflix_clone;
SELECT id, email, name, created_at FROM users;
SELECT * FROM mylist;
```
Passwords are stored as bcrypt hashes, never in plain text.
