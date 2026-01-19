## Prisma Setup & Workflow

1. **Initialize Prisma**

In your backend root, run:
```sh
npx prisma init
```
Creates the `prisma/` folder, `schema.prisma`, and `.env`.  
Edit `schema.prisma` for your models and set your `DATABASE_URL` in `.env`.

2. **Update Database Schema**

After editing your models, update your database:
```sh
npx prisma db push
```
Synchronizes your schema changes with the database.

3. **Create & Apply Migrations** (recommended for production)

Each time your schema changes, create a migration:
```sh
npx prisma migrate dev --name <migration-name>
```
Replace `<migration-name>` (e.g. `add-user-table`). Migration files are stored in `prisma/migrations/` and applied to your DB.

4. **Open Prisma Studio** (GUI for browsing/editing data)

Start the visual data browser:
```sh
npx prisma studio
```

---
