# Immersive Menu

A mobile-first digital menu platform. Guests open a cafe menu from its QR code; platform administrators manage cafes, categories, and menu items. Ordering, payment, POS, loyalty, reviews, and analytics are intentionally out of scope.

## Project layout

```text
.
├── backend/                 # Java 21, Spring Boot REST API
│   └── src/main/
│       ├── java/com/immersivemenu/
│       │   ├── config/      # CORS, Cloudinary, application configuration
│       │   ├── domain/      # JPA entities
│       │   ├── repository/  # Spring Data repositories
│       │   ├── security/    # JWT issuance, filter chain, admin identity
│       │   ├── service/     # Menu, image, and QR services
│       │   └── web/         # REST controllers and request/response DTOs
│       └── resources/
│           ├── application.yml
│           └── db/migration/ # Flyway schema migrations
├── frontend/                # React, Vite, TypeScript, Tailwind
│   └── src/
│       ├── api/             # Typed API client and menu contracts
│       ├── components/      # Shared UI and 3D scene
│       └── pages/           # Customer menu experience
├── compose.yaml             # Local PostgreSQL
└── .env.example
```

## Production deployment (Vercel + Render)

The frontend is a static Vite application on Vercel. Render runs the Spring Boot API as a Docker web service and hosts PostgreSQL. Cloudinary stores uploaded images. Render needs the included backend Dockerfile because it does not provide a native Java runtime. Use a persistent Render PostgreSQL plan and keep the database and API in the same region; free/ephemeral services are not suitable for production data.

1. **Create the Vercel project.** Import the repository, set the Root Directory to `frontend`, Framework Preset to Vite, Build Command to `npm run build`, and Output Directory to `dist`. Add the project’s Vercel production domain; the included `vercel.json` rewrites client routes such as `/cafe/{slug}` to the SPA entry point.
2. **Create the Render PostgreSQL database.** Choose a persistent plan and record its internal hostname, database name, username, and password. Keep the database in the same region as the API.
3. **Create the Render API web service.** Select Docker, set Root Directory to `backend`, use `Dockerfile`, and select a persistent service plan appropriate to the expected traffic. Set the health check path to `/actuator/health`.
4. **Set the API environment variables in Render.** Set `SPRING_PROFILES_ACTIVE=prod`; set `SPRING_DATASOURCE_URL` to `jdbc:postgresql://<internal-hostname>:5432/<database-name>` and set `SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD` from the Render database. Set `JWT_SECRET` to a newly generated random value of at least 32 bytes (for example, generate one locally with `openssl rand -base64 48`). Set `FRONTEND_ORIGIN` and `FRONTEND_BASE_URL` to the exact Vercel origin, with no path or trailing slash. Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` as Render environment secrets. Render supplies `PORT`; do not hardcode it.
5. **Bootstrap the platform admin once.** Before the first API deploy, set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD`. After the first successful startup, remove both values from Render and redeploy. Admin access thereafter is managed through the authenticated API; there is no public registration route.
6. **Configure Vercel’s API URL.** Set `VITE_API_BASE_URL` in the Vercel project to `https://<render-api-host>/api/v1` for Production, then redeploy. Production builds fail unless this is an absolute HTTPS API URL ending in `/api/v1`. Preview deployments are not allowed by the API’s exact-origin CORS policy unless their origin is explicitly configured in Render.
7. **Verify the deployment.** Confirm `https://<render-api-host>/actuator/health` returns `{"status":"UP"}`. Sign in at `<vercel-origin>/admin/login`, create and activate a cafe, then verify its public URL is `<vercel-origin>/cafe/<slug>` and loads its menu. The cafe QR PNG/PDF use the same URL because the API constructs it from `FRONTEND_BASE_URL` and the cafe slug. Verify an inactive cafe returns 404 from the public menu endpoint.

`frontend/.env.example` documents the Vercel build variable. The root `.env.example` documents backend variables; copy it to the root `.env` only for local development and replace the example database/frontend values with your local service addresses. Never put real credentials in either example file or in source control. The root `.gitignore` excludes `.env` files except `.env.example`.

Flyway applies versioned schema migrations at API startup. Keep `spring.jpa.hibernate.ddl-auto` set to `validate`; do not use Hibernate schema creation or Flyway clean against production. Add new schema changes as forward-only migration files under `backend/src/main/resources/db/migration`. The production profile disables Flyway clean, validates migrations, enables stdout logging, graceful shutdown, and health probes, and exposes only the non-detailed health endpoint.

## Local development

Requirements: Node.js 20+, Java 21, Maven 3.9+, and Docker for the local PostgreSQL service.

1. Copy the root `.env.example` to `.env`. Set database credentials and the JDBC URL to the local PostgreSQL listener, set `FRONTEND_ORIGIN` and `FRONTEND_BASE_URL` to the Vite development origin, and set a random `JWT_SECRET` of at least 32 bytes. `ADMIN_EMAIL` and `ADMIN_PASSWORD` are optional; set both once to provision the initial admin. Add Cloudinary credentials to enable image uploads.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Start the API with `cd backend && SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run`.
4. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_BASE_URL` to the API development origin plus `/api/v1`. Then run `cd frontend && npm install && npm run dev`.

Flyway initializes and evolves the schema on API startup. Hibernate validates the schema rather than modifying it.

To seed a local development admin, start the backend with `SPRING_PROFILES_ACTIVE=dev`. On an empty admin table, this profile creates `admin@immersivemenu.com` with password `Admin@123`, hashed using the configured BCrypt password encoder. The seed does nothing once any admin exists and is not active under the production profile.

## Authentication and access

`POST /api/v1/auth/login` issues a short-lived signed JWT for a provisioned platform admin. All `/api/v1/admin/**` routes require that token. There is deliberately no public admin-registration endpoint; the optional one-time bootstrap creates the initial admin only when both `ADMIN_EMAIL` and `ADMIN_PASSWORD` are supplied and the email does not already exist. Public cafe menu reads are limited to active cafes.

Set `JWT_SECRET` to a cryptographically random secret; never use the example value in a deployed environment. Configure CORS and `FRONTEND_BASE_URL` for the deployed frontend host. `FRONTEND_BASE_URL` is the frontend origin only; the API appends `/cafe/{slug}` to create each stable public menu URL. Keep Cloudinary credentials and database secrets in the deployment secret manager.

## REST API

Versioned routes use `/api/v1`; the required customer endpoint is also available at `/api/public/cafes/{slug}/menu`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/login` | Public | Exchange admin credentials for a JWT |
| GET | `/public/cafes/{slug}/menu` | Public | Read an active cafe, categories, and available items (also exposed at `/api/public/cafes/{slug}/menu`) |
| GET, POST | `/admin/cafes` | Admin | List and create cafes |
| GET, PUT, DELETE | `/admin/cafes/{cafeId}` | Admin | Read, update, and remove a cafe |
| GET | `/admin/cafes/{cafeId}/menu` | Admin | Read a cafe and its full menu, including inactive cafes |
| GET, POST | `/admin/cafes/{cafeId}/categories` | Admin | List category summaries (paginated) and add a category |
| GET, PUT, DELETE | `/admin/categories/{categoryId}` | Admin | Read, update, or remove a category |
| GET | `/admin/categories/{categoryId}/items` | Admin | List category items (paginated) |
| GET, POST | `/admin/items` or `/admin/items/{itemId}` | Admin | Read, add, update, or remove an item |
| POST | `/admin/images` | Admin | Upload an image to Cloudinary |
| DELETE | `/admin/images?publicId={publicId}` | Admin | Remove an uncommitted uploaded image |
| GET | `/admin/cafes/{cafeId}/qr` | Admin | Download a QR code as PNG |
| GET | `/admin/cafes/{cafeId}/qr/url` | Admin | Read the cafe’s canonical public menu URL |
| GET | `/admin/cafes/{cafeId}/qr.pdf` | Admin | Download a printable cafe QR sheet as PDF |

Prices are represented as decimal currency amounts (`NUMERIC(10,2)`) and each cafe declares a three-letter currency code for display. Images are stored remotely and their secure URLs are persisted. QR codes point to the customer-facing menu URL; no order or payment endpoints are provided.

Admin list endpoints accept `page` (zero-based) and `size` (1–100); the default page size is 20 for cafes and 50 for categories/items. OpenAPI JSON is served at `/v3/api-docs`, with Swagger UI at `/swagger-ui.html`.

## Frontend

The premium customer menu experience is available at `/cafe/:slug` and guides guests from a cafe welcome screen into a swipeable, spatial menu. The spatial food cards use cafe images rather than individual food models, with a low-cost decorative 3D atmosphere and reduced-motion support. QR codes use the configured `FRONTEND_BASE_URL` plus `/cafe/{slug}`; the cafe detail page shows the current QR, public URL, PNG download, and printable PDF. QR destinations remain valid across category and menu-item updates. Deactivating a cafe makes its public menu unavailable.

The platform-admin dashboard is available at `/admin`; sign in at `/admin/login` with the provisioned admin credentials. It supports cafe setup and status, category and menu-item management, availability and display order, Cloudinary image uploads with local preview and progress, and QR code downloads. Image files are validated and uploaded through the authenticated API; only the secure Cloudinary URL and public ID are stored in PostgreSQL. Cloudinary credentials remain server-side. Replaced and deleted images are removed after the database transaction commits; delivery URLs use automatic format/quality and size-limiting transformations. Admin JWTs are held for the current browser session and are cleared on logout or an expired/invalid API session.
