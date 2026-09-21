# Lists App — Backend

Backend for the family shopping lists application. Built with Django + Django REST
Framework (JSON-only API), JWT authentication, Celery/Redis for background tasks,
and PostgreSQL (SQLite fallback for local development).

## Tech stack

- Python 3.12, Django 5.2, Django REST Framework 3.16
- SimpleJWT (access/refresh tokens with refresh rotation and blacklist)
- Celery 5 + Redis (background tasks and periodic cleanup)
- drf-spectacular (OpenAPI schema + Swagger UI)
- PostgreSQL (production) / SQLite (local fallback)
- django-environ for 12-factor style configuration

## Project layout

```
backend/
├── config/                 # settings, root urls, wsgi/asgi, celery app
├── common/                 # shared code: APIError, exception handler, utils
├── apps/
│   ├── users/              # custom User model, /me endpoints
│   ├── authentication/     # phone/email registration, login, JWT refresh/logout
│   ├── groups/             # groups, memberships, invitations
│   ├── lists/              # lists, items, participants, duplication
│   └── notifications/      # device push-token registration + push stubs
├── manage.py
└── requirements.txt
```

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# configure environment (defaults are fine for local SQLite dev)
cp .env.example .env

python manage.py migrate
python manage.py runserver
```

- API root: `http://localhost:8000/api/v1/`
- Swagger UI: `http://localhost:8000/api/schema/swagger/`
- OpenAPI schema: `http://localhost:8000/api/schema/`

### Celery (optional for local dev)

```bash
celery -A config worker -l info
celery -A config beat -l info
```

Tests force `CELERY_TASK_ALWAYS_EAGER=True`, so background tasks run synchronously
without a broker.

## API overview

All endpoints live under `/api/v1/` and require JWT authentication except the
`auth/*` registration/login/refresh endpoints.

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register/phone`, `POST /auth/register/email`, `POST /auth/register/verify`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| User | `GET /me`, `POST /me/change-phone/start`, `POST /me/change-phone/confirm` |
| Groups | `GET/POST /groups/`, `GET/PATCH/DELETE /groups/<id>/`, `POST /groups/<id>/invitations/` (and `GET /invitations/` for the recipient) |
| Lists | `GET/POST /lists`, `GET/PATCH /lists/<id>`, `POST /lists/<id>/archive`, `POST /lists/<id>/restore`, `POST /lists/<id>/duplicate`, `GET/POST /lists/<id>/items`, `POST /lists/<id>/items/reorder`, `PATCH/DELETE /lists/<id>/items/<item_id>`, `POST /lists/<id>/items/<item_id>/restore` |
| Devices | `POST /devices/` (register/update push token) |

### List visibility

Lists can be `private`, `group`, or `custom`:

- `private` — only the owner.
- `group` — all members of the owning group.
- `custom` — the owner plus an explicit set of participants (must be group members).

### Item lifecycle

Items have a status (`active`, `done`, `failed`) and a `position` used for ordering.
Updates and deletes are soft: `DELETE` marks an item as deleted, and it can be
restored with the `restore` endpoint.

## Testing

```bash
cd backend
python manage.py test
```

## Notes

- The API is JSON-only (`DEFAULT_PARSER_CLASSES = JSONParser`); clients must send
  `Content-Type: application/json`.
- Push notification delivery is currently stubbed (`apps/notifications/services.py`
  logs instead of sending). Wire in a provider (FCM/APNs) for production.
- Email codes use the console backend by default; set `EMAIL_BACKEND_URL` to an SMTP
  URL in production.
