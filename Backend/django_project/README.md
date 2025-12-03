Django backend (demo)

This folder contains a minimal Django project providing the same demo API as the express backend.

Quick start (Windows PowerShell):
1. Create a virtualenv and install:
```powershell
cd Backend\django_project
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
2. Run migrations and start server:
```powershell
python manage.py migrate
python manage.py runserver 8000
```
3. The API will be available at http://localhost:8000/api/

Endpoints:
- GET /api/ping
- POST /api/auth/register { username, password } — registers user and logs in (session cookie)
- POST /api/auth/login { username, password } — logs in (session cookie)
- GET /api/auth/me — returns current user if logged in
- POST /api/auth/change-password { oldPassword, newPassword }

Notes:
- This is a development scaffold. It disables CSRF protection for API endpoints via @csrf_exempt for convenience; do not use in production as-is.
- The DevCorsMiddleware sets Access-Control-Allow-Origin: * for ease of testing from a local frontend. For production, use proper CORS settings.
- The project uses SQLite (db.sqlite3) in the django_project folder.
