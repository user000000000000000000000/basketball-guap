# Баскетбол ГУАП — учёт посещаемости (PWA)

React + Vite + TypeScript + Tailwind v4 + Supabase. Стиль iOS «жидкое стекло».

## 1. Supabase
1. [supabase.com](https://supabase.com) → New project.
2. **SQL Editor → New query** → вставьте весь [`supabase/schema.sql`](supabase/schema.sql) → Run.
   Создаст таблицы `profiles`, `events`, `attendance`, триггер автосоздания профиля и RLS-политики.
3. **Authentication → Providers → Email**: для быстрых тестов выключите «Confirm email».
   **Authentication → URL Configuration**: добавьте в Redirect URLs `http://localhost:5173/**` и адрес продакшена (для входа по ссылке).
4. **Project Settings → API**: скопируйте `Project URL` и `anon public key`.

## 2. Локальный запуск
```bash
npm install
cp .env.example .env   # впишите URL и ключ, координаты зала
npm run dev            # http://localhost:5173
```
Координаты зала: `VITE_GYM_LAT/LNG` (подставляются в форму мероприятия; в мероприятии можно переопределить). Радиус — `VITE_GYM_RADIUS_M` (100 м).

## 3. Назначить менеджера
Зарегистрируйтесь в приложении, затем в SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'manager@example.com';
```
Перезайдите — откроется админ-панель. Роль нельзя изменить из клиента (RLS).

## 4. Деплой
**GitHub Pages**
1. Создайте репозиторий, `git remote add origin <url>`, `git push -u origin main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Secrets and variables → Actions: secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; (опц.) variables `VITE_GYM_LAT`, `VITE_GYM_LNG`.
4. Push в `main` запускает [`deploy.yml`](.github/workflows/deploy.yml).

**Vercel**: Import репозитория, добавьте те же `VITE_*` переменные, остальное по умолчанию (`npm run build`, `dist`).

Роутинг на хэшах (`/#/...`), `base: './'` — работает по любому пути без доп. настройки.

## 5. На iPhone
Откройте сайт в Safari → «Поделиться» → «На экран “Домой”». Откроется без адресной строки (`manifest.json` + `apple-mobile-web-app-capable`).
Геолокация работает только по HTTPS (Pages/Vercel подходят; `localhost` тоже).

## Заметки
- Проверка 100 м делается на клиенте (как в ТЗ), её можно обойти подменой координат. Для строгости — вынести в Edge Function.
- Service worker/офлайн не включён: для установки на экран он не нужен.
