# ССК ГУАП — секции, расписание, посещаемость (PWA)

React + Vite + TypeScript + Tailwind v4 + Supabase. Стиль iOS «жидкое стекло». Много секций (баскетбол, футбол, волейбол и т. д.), у каждой — тренеры, расписание и журнал.

## Роли
- **Студент** — регистрируется, заполняет профиль, отмечает свои секции, видит их тренировки, отмечается по геолокации (радиус 100 м от зала секции).
- **Тренер секции** — ведёт только свои секции: расписание, журнал, отметки вручную, экспорт Excel/PDF.
- **Главный админ** — всё то же по всем секциям + создаёт секции и назначает тренеров (вкладка «Секции»).

## 1. Supabase
1. [supabase.com](https://supabase.com) → New project.
2. **SQL Editor** → выполните по очереди [`supabase/schema.sql`](supabase/schema.sql), затем [`supabase/migrations/002_sections.sql`](supabase/migrations/002_sections.sql). Второй файл создаёт секции, тренеров, участников и новые права доступа (RLS).
3. **Authentication → Providers → Email**: для быстрых тестов выключите «Confirm email».
   **Authentication → URL Configuration**: добавьте в Redirect URLs `http://localhost:5180/**` и адрес сайта (для входа по ссылке).
4. **Project Settings → API**: скопируйте `Project URL` и `anon / publishable key`.

## 2. Локальный запуск
```bash
npm install
cp .env.example .env   # впишите URL и ключ
npm run dev            # http://localhost:5180
```
Координаты зала задаются на странице «Расписание» (адрес или пара «59.86, 30.31»); `VITE_GYM_*` — только запасные значения. Радиус отметки — `VITE_GYM_RADIUS_M` (100 м).

## 3. Главный админ
Зарегистрируйтесь в приложении, затем в SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```
Тренеров назначает уже админ в приложении: «Секции» → почта человека (он должен один раз войти в приложение) → «Назначить».

## 4. Деплой
**GitHub Pages**: Settings → Pages → Source: **GitHub Actions**; в Settings → Secrets and variables → Actions добавьте secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Каждый push в `main` запускает [`deploy.yml`](.github/workflows/deploy.yml).

**Vercel**: Import репозитория, те же `VITE_*` переменные.

Роутинг на хэшах (`/#/...`), `base: './'` — работает по любому пути.

## 5. На iPhone
Safari → «Поделиться» → «На экран “Домой”». Геолокация работает только по HTTPS.

## Заметки
- Проверка расстояния делается на клиенте и обходится подменой координат; для строгости — Edge Function.
- Логотипов секций нет: вместо них цветной значок с эмодзи вида спорта. Цвет и название секции меняет админ.
- Service worker/офлайн не включён: для установки на экран он не нужен.
