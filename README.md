# ☁️ CloudStorage — Full-Stack Cloud Storage Management System

A full-featured Google Drive / Dropbox clone built with **React + Spring Boot + MySQL**.

---

## ✨ Features

| Category | Features |
|---|---|
| **Auth** | JWT Registration & Login, Refresh Tokens, Change Password |
| **Files** | Upload (drag & drop), Download, Rename, Delete, Restore |
| **Folders** | Create, Rename, Delete, Nested sub-folders |
| **Sharing** | Share with users by email or public link, Permissions (View / Download / Edit) |
| **Search** | Full-text search across files and folders |
| **Filtering** | Filter by type: Image, Video, PDF, Document |
| **Trash** | Soft-delete, Restore, Permanent delete |
| **Dashboard** | Storage usage bar, pie chart, bar chart |
| **Admin** | User management, Storage quota control, Analytics, Activity logs |
| **Security** | AES-256 file encryption, HTTPS-ready, BCrypt passwords |
| **Versioning** | File version history on every upload |
| **Email** | Welcome email, file-shared notification |
| **UI** | Responsive, Dark / Light mode, Grid / List view, File preview (Image & PDF) |

---

## 🗂️ Project Structure

```
cloud-storage/
├── backend/                  # Spring Boot application
│   ├── src/main/java/com/cloudstorage/
│   │   ├── config/           # Security & CORS config
│   │   ├── controller/       # REST controllers
│   │   ├── dto/              # Request / response DTOs
│   │   ├── entity/           # JPA entities
│   │   ├── exception/        # Global exception handling
│   │   ├── repository/       # Spring Data repositories
│   │   ├── security/         # JWT provider & filter
│   │   └── service/          # Business logic
│   ├── Dockerfile
│   └── pom.xml
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page-level components
│   │   ├── services/         # Axios API client
│   │   └── store/            # Zustand global state
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── database/
│   └── schema.sql            # MySQL DDL
├── docker-compose.yml
└── .env.example
```

---

## 🚀 Quick Start (Docker — recommended)

### Prerequisites
- Docker 24+ and Docker Compose v2

```bash
# 1. Clone / open the project
cd "cloud-storage"

# 2. Create your environment file
copy .env.example .env
# Edit .env with your values

# 3. Start everything
docker compose up --build -d

# 4. Open the app
open http://localhost
```

Default admin account (created by schema.sql):
- **Email:** admin@cloudstorage.com
- **Password:** Admin@1234

---

## 🛠️ Local Development (without Docker)

### Backend

**Prerequisites:** Java 21, Maven 3.9+, MySQL 8

```bash
cd backend

# 1. Create the database
mysql -u root -p < ../database/schema.sql

# 2. Edit src/main/resources/application.yml
#    Set: spring.datasource.password and spring.mail.*

# 3. Run
mvn spring-boot:run
# API available at http://localhost:8080
```

### Frontend

**Prerequisites:** Node 20+

```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:3000
```

---

## 🔌 REST API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/change-password` | Change password |

### Files
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/files/upload` | Upload file (multipart) |
| GET | `/api/files` | List files (optional `?folderId=`) |
| GET | `/api/files/recent` | Recent files |
| GET | `/api/files/search?q=` | Search files |
| GET | `/api/files/filter?type=` | Filter by type |
| GET | `/api/files/download/{id}` | Download file |
| PATCH | `/api/files/{id}/rename` | Rename file |
| DELETE | `/api/files/{id}` | Move to trash |
| POST | `/api/files/{id}/restore` | Restore from trash |
| DELETE | `/api/files/{id}/permanent` | Permanently delete |
| GET | `/api/files/trash` | List trashed files |
| GET | `/api/files/dashboard` | Storage dashboard |

### Folders
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/folders` | Create folder |
| GET | `/api/folders` | List root folders |
| GET | `/api/folders/{id}` | Get folder |
| GET | `/api/folders/{id}/subfolders` | List sub-folders |
| PATCH | `/api/folders/{id}/rename` | Rename |
| DELETE | `/api/folders/{id}` | Move to trash |
| POST | `/api/folders/{id}/restore` | Restore |
| GET | `/api/folders/trash` | Trashed folders |
| GET | `/api/folders/search?q=` | Search folders |

### Sharing
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/files/share` | Share file |
| GET | `/api/files/shared/with-me` | Files shared with me |
| GET | `/api/files/shared/by-me` | Files I shared |
| DELETE | `/api/files/share/{id}` | Revoke share |
| GET | `/api/files/shared/public/{token}` | View public share |
| GET | `/api/files/shared/download/{token}` | Download via token |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | All users |
| PATCH | `/api/admin/users/{id}/toggle-active` | Enable/disable user |
| PATCH | `/api/admin/users/{id}/storage-quota` | Update quota |
| GET | `/api/admin/logs` | Activity logs (paginated) |
| GET | `/api/admin/analytics` | Analytics data |

---

## 🗄️ Database Tables

| Table | Purpose |
|---|---|
| `users` | User accounts, roles, storage quota |
| `folders` | Nested folder tree |
| `files` | File metadata, type, encryption flag |
| `file_versions` | Version history per file |
| `shared_files` | Share records with tokens & permissions |
| `activity_logs` | Audit trail of all user actions |

---

## 🔒 Security

- Passwords hashed with **BCrypt** (strength 10)
- Files encrypted at rest with **AES-256-CBC** (per-file IV)
- Stateless **JWT** authentication (access + refresh tokens)
- Role-based access control (`USER` / `ADMIN`)
- CORS configured for frontend origin
- Input validation via Bean Validation

---

## ☁️ Switching to AWS S3

1. Set `STORAGE_TYPE=s3` in `.env`
2. Set `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
3. Ensure the IAM user/role has `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`

---

## 📧 Email Setup (Gmail)

1. Enable 2-Step Verification on your Google account
2. Create an **App Password** at myaccount.google.com/apppasswords
3. Set `MAIL_USERNAME` and `MAIL_PASSWORD` in `.env`

---

## 🐳 Deployment

### Production checklist
- [ ] Change all default passwords in `.env`
- [ ] Use a strong random `JWT_SECRET` (64+ hex chars)
- [ ] Use a strong random `ENCRYPTION_KEY` (exactly 32 chars)
- [ ] Set `STORAGE_TYPE=s3` for scalable storage
- [ ] Place a TLS-terminating load balancer in front
- [ ] Set `APP_CORS_ALLOWED_ORIGINS` to your domain

### Scale the backend
```bash
docker compose up --scale backend=3 -d
```

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Query, Recharts |
| Backend | Spring Boot 3.2, Spring Security, Spring Data JPA |
| Database | MySQL 8 |
| Auth | JWT (jjwt 0.12) |
| Storage | Local FS or AWS S3 SDK v2 |
| Encryption | AES-256-CBC (javax.crypto) |
| Email | Spring Mail (JavaMailSender) |
| Container | Docker, Docker Compose, Nginx |

---

## 📄 License

MIT — use freely in personal and commercial projects.
