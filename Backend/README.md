MentoraAI backend (demo)

This is a minimal Express-based backend scaffold intended for local development and prototyping.

Endpoints:
- GET /api/ping — health check
- POST /api/auth/register { username, password } — create account, returns token in HttpOnly cookie
- POST /api/auth/login { username, password } — login, returns token in HttpOnly cookie
- GET /api/auth/me — returns current user (requires cookie or Authorization header)
- POST /api/auth/change-password { oldPassword, newPassword } — change password for authenticated user

- File manager endpoints (added):
	- GET /api/files — list uploaded files
	- POST /api/files/upload — upload a file (form field `file`)
	- GET /api/files/download/:name — download a file
	- DELETE /api/files/:name — delete a file

Run locally:
1. cd Backend
2. npm install
3. npm start

Notes about file uploads:
- Uploaded files are stored in `Backend/uploads/`.
- Ensure `multer` is installed: `npm install` in the `Backend` folder will add it.

Security notes:
- This demo uses a simple JSON file `users.json` for storage. For production use, move to a proper database and rotate `JWT_SECRET`.
- The JWT secret is set via environment variable `JWT_SECRET` (default is a development secret).
- Cookies are set httpOnly but not secure in this demo. In production, use HTTPS and set secure flags.
