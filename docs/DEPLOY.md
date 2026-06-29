# Altery Eligibility Checker — деплой на собственную инфраструктуру

> Хендофф для DevOps/админов при переезде с Vercel.
> Схема: **Cloudflare → Nginx → сервис (контейнер)**.
> Версия документа соответствует состоянию репозитория на момент сборки архива
> (короткий SHA — в имени `.tar.gz`). Все факты ниже сверены с кодом.

---

## 1. Что это за сервис (коротко)

Одностраничное веб-приложение («чекер пригодности» для бизнес-банкинга Altery):
анонимный опрос из 5 вопросов → страница с рекомендацией → опциональная отправка
PDF-проспекта на e-mail и заявка на обратный звонок. Кнопка «Start setup» уводит
пользователя на внешнюю регистрацию `app.altery.com`.

Ключевое для инфраструктуры:

- **Без шага сборки.** Это статический SPA: React + Babel компилируются прямо в
  браузере. Никакого `npm run build`, webpack/vite нет и не нужно.
- **Ноль runtime-зависимостей.** Серверный код (`server.js`, `api/*`, `lib/*`)
  использует только стандартную библиотеку Node и глобальный `fetch`. `npm install`
  на проде не выполняется. Образ = Node + наши исходники. (`esbuild` есть только в
  `devDependencies` — нужен тестам в CI, в образ не попадает.)
- **Сервис без состояния (stateless).** Нет базы данных, нет файловых томов, нет
  сессий на диске. Единственное состояние — счётчики rate-limit, и те либо в
  памяти процесса (эфемерные), либо во внешнем Redis (Upstash). Значит: можно
  свободно масштабировать горизонтально и перезапускать без потерь.
- **Без Stripe / без платежей.** Платёжный модуль и маршрут `/setup` удалены
  (июнь 2026). В коде остались только устаревшие комментарии-упоминания.

---

## 2. Технологический стек

| Слой | Технология |
|------|------------|
| Фронтенд | React 18.3.1 + ReactDOM (UMD), Babel-standalone 7.24.7 — всё с CDN, компиляция JSX в браузере |
| PDF | html2canvas 1.4.1 + jsPDF 2.5.1 (с CDN, генерация PDF на стороне клиента) |
| HTTP-сервер | `server.js` — нативный `node:http`, без фреймворка |
| Бэкенд-функции | `api/send-analysis.js` (письмо с PDF через Brevo), `api/hubspot-lead.js` (лид в HubSpot) |
| Аналитика | Microsoft Clarity — грузится **только после согласия** на cookie |
| Среда выполнения | Node.js 20 (alpine в Dockerfile) |

---

## 3. Контейнер: контракт запуска

| Параметр | Значение |
|----------|----------|
| Команда запуска | `node server.js` (это `CMD` в Dockerfile) |
| Порт | `3000` (переопределяется env-переменной `PORT`) |
| Health-проба | `GET /healthz` → `200`, тело `{"ok":true}` — вешать на liveness **и** readiness |
| Build | отсутствует; `docker build .` просто копирует исходники |
| Пользователь | non-root (`USER node` в Dockerfile) |

Сборка и запуск:

```bash
docker build -t altery-eligibility .
docker run -p 3000:3000 --env-file ./altery.env altery-eligibility
# health:
curl -fsS http://127.0.0.1:3000/healthz   # → {"ok":true}
```

`Dockerfile`, `.dockerignore` и пример `.gitlab-ci.yml` уже лежат в репозитории.
CI устроен как `test → build → deploy` (стадия `deploy` — заглушка под ваш способ
выката, запускается вручную).

---

## 4. Переменные окружения

Задаются на сервисе (секреты — через ваш secret-store, **не** в репозитории; в
коде/архиве секретов нет).

| Переменная | Обяз. | По умолчанию | Назначение / что будет, если не задать |
|------------|:----:|--------------|----------------------------------------|
| `BREVO_API_KEY` | **да** | — | Ключ Brevo для отправки писем. Без него отправка PDF на почту возвращает 500. |
| `FROM_EMAIL` | **да для прода** | sandbox-отправитель | Verified sender в Brevo, формат `Имя <addr@host>` или просто `addr@host`. Если не задать — используется песочный адрес, который **доходит только до владельца аккаунта Brevo** (т.е. пользователям письма не придут). |
| `REPLY_TO` | нет | `sales@altery.com` | Адрес, куда уходят ответы на письмо. |
| `HUBSPOT_TOKEN` | **да** | — | HubSpot private-app token со scope `crm.objects.contacts.read` + `...write`. Без него заявка-лид возвращает 500 `not_configured`. |
| `ALLOWED_ORIGINS` | **да при новом домене** | пусто | Список разрешённых Origin для POST на `/api/*`, через запятую, со схемой (`https://check.altery.com`). См. раздел 7.1 — **без этого формы на новом домене получают 403**. |
| `UPSTASH_REDIS_REST_URL` | рекоменд. | — | Общий счётчик rate-limit (Upstash Redis REST). Без него — fallback в память процесса. |
| `UPSTASH_REDIS_REST_TOKEN` | рекоменд. | — | Токен к Upstash; работает в паре с URL выше. |
| `PORT` | нет | `3000` | Порт прослушивания. |

Пример `altery.env`:

```
BREVO_API_KEY=xkeysib-…
FROM_EMAIL=Altery <noreply@send.altery.com>
REPLY_TO=sales@altery.com
HUBSPOT_TOKEN=pat-…
ALLOWED_ORIGINS=https://check.altery.com
UPSTASH_REDIS_REST_URL=https://….upstash.io
UPSTASH_REDIS_REST_TOKEN=…
```

### 4.1 Секреты как файлы (Docker / Swarm secrets, `/run/secrets/…`)

Если секреты монтируются файлами (`/run/secrets/<имя>`), а не env-переменными,
приложение **подхватывает их автоматически**: на старте `server.js` читает файл в
`process.env`. Никакого entrypoint-обёртки не нужно.

Порядок разрешения для каждого секрета: явная env-переменная (если задана и
непустая) → `<VAR>_FILE` (путь к файлу) → `/run/secrets/<var в нижнем регистре>`.

**Вариант А — назвать секреты как переменные в нижнем регистре** (самый простой,
0 доп. конфигурации). Имена файлов-секретов:

```
brevo_api_key   from_email   reply_to   hubspot_token
allowed_origins   upstash_redis_rest_url   upstash_redis_rest_token
```

**Вариант Б — любое имя секрета + указать путь через `<VAR>_FILE`:**

```yaml
# docker-compose (swarm) — пример
services:
  altery-eligibility:
    image: registry/altery-eligibility:latest
    environment:
      BREVO_API_KEY_FILE: /run/secrets/brevo_key   # имя секрета произвольное
      HUBSPOT_TOKEN_FILE: /run/secrets/hs_token
      ALLOWED_ORIGINS_FILE: /run/secrets/origins
    secrets: [brevo_key, hs_token, origins]
secrets:
  brevo_key: { external: true }
  hs_token:  { external: true }
  origins:   { external: true }
```

Значение из файла обрезается по краям (trailing newline безопасен). `PORT` —
не секрет, его проще оставить обычной env-переменной.

---

## 5. Сеть и внешние зависимости

Важно различать **два направления** трафика.

### 5.1 Что грузит БРАУЗЕР пользователя (важно для CSP)

Это запросы от клиента, не от сервера. Сервису сетевой доступ к ним не нужен —
нужно лишь, чтобы их разрешал Content-Security-Policy (см. раздел 6):

| Хост | Что |
|------|-----|
| `cdnjs.cloudflare.com` | React, ReactDOM, Babel-standalone, html2canvas, jsPDF (с SRI-хешами) |
| `www.clarity.ms`, `*.clarity.ms` | Microsoft Clarity — **только после согласия на cookie** (ID `ww9jtvpbv1` зашит в `cookie-consent.js`) |

### 5.2 Исходящие соединения СЕРВИСА (важно для egress-фаервола)

Контейнер сам ходит наружу. Если у сервиса ограничен egress — разрешить:

| Хост | Зачем |
|------|-------|
| `api.brevo.com` | отправка письма с PDF (`POST /v3/smtp/email`) |
| `api.hubapi.com` | запись лида в HubSpot (`POST /crm/v3/objects/contacts/batch/upsert`) |
| ваш `*.upstash.io` | rate-limit (только если используете Upstash) |

### 5.3 Внешний переход пользователя

Кнопка «Start setup» делает `window.location` на:

```
https://app.altery.com/n/registration-corporate?plan=…&country=…&industry=…&services=…
  &volume_in=…&volume_out=…&tx_in=…&tx_out=…&corridors_in=…&corridors_out=…&crypto=…
  &utm_source=…&utm_medium=…&utm_campaign=…&utm_term=…&utm_content=…
```

(PII — `email/firstname/lastname/phone/company` — добавляются только в потоках
PDF/письма и обратного звонка, в веб-CTA их нет.) Это просто редирект — никакой
интеграции на стороне сервиса не требуется.

---

## 6. Nginx — обязательные требования

Цепочка `Cloudflare → Nginx → сервис`. Nginx терминирует TLS, ставит
security-заголовки и проксирует на контейнер. **Заголовки/CSP раньше жили в
`vercel.json` — на новом проде их выставляет Nginx (см. раздел 7.2).**

Минимально необходимое:

1. **Проксировать на контейнер `:3000`.** Проще всего — весь трафик (контейнер сам
   отдаёт и статику, и `/api/*`). Если хотите, чтобы статику отдавал Nginx, а на
   контейнер шёл только `/api/*` — см. примечание ниже.
2. **Пробросить реальный IP и заголовки Forwarded** — критично (см. 7.3):
   `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`, `Host`.
3. **Выставить security-заголовки + CSP** (точные значения — в 7.2).

Референс-конфиг:

```nginx
server {
    listen 443 ssl http2;
    server_name check.altery.com;            # ← ваш итоговый домен

    # Письмо с PDF шлётся как base64 (~3–4 МБ). Дефолтный лимит nginx 1 МБ
    # режет такой POST → за Cloudflare это всплывает как HTTP 520. Сервис сам
    # принимает до 6 МБ, поэтому ставим с запасом:
    client_max_body_size 8m;

    # --- security-заголовки (раньше были в vercel.json) ---
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://www.clarity.ms https://*.clarity.ms; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://api.hubapi.com https://api.brevo.com https://www.clarity.ms https://*.clarity.ms https://cdnjs.cloudflare.com; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://altery_eligibility:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;  # ← rate-limit
        proxy_set_header X-Forwarded-Proto $scheme;                     # ← логотип в письме
        proxy_set_header X-Forwarded-Host  $host;                       # ← логотип в письме
        proxy_read_timeout 30s;                                         # ← запас на вызов Brevo
    }
}
```

Каждая security-директива (и каждый `add_header`) должна задаваться **один раз**.
Если `Content-Security-Policy` приходит с дублирующимися директивами (`form-action`,
`base-uri` и т.п.), браузер пишет `Ignoring duplicate Content-Security-Policy
directive …` — не фатально, но значит, что заголовок собран дважды (например,
`add_header` и в `http`, и в `server`/`location`, либо директива вписана два раза).

> **Примечание про раздачу статики Nginx’ом.** Если Nginx отдаёт файлы сам, а не
> проксирует всё на контейнер, обязательно: (а) `.jsx` отдавать с
> `Content-Type: application/javascript` (иначе Babel в браузере не скомпилит
> модули); (б) SPA-fallback — пути без расширения отдавать как `index.html`;
> (в) `/api/*` всё равно проксировать на контейнер. Эту логику `server.js` уже
> реализует сам, поэтому «проксировать всё на контейнер» — наименее
> ошибко­опасный путь.

---

## 7. Критичные нюансы (gotchas)

### 7.1 `ALLOWED_ORIGINS` — иначе формы молча отдают 403

`/api/*` (отправка PDF и заявка-лид) проверяет заголовок `Origin` по allow-list.
В коде зашиты только `altery.com`, `www.altery.com` и старый `*.vercel.app`. POST
с любого другого Origin → **403** (`{"error":"Request rejected.","code":"spam_check_failed"}`).
При этом статика и сам опрос работают как ни в чём не бывало — поэтому поломку
легко не заметить.

→ На новом домене задайте env `ALLOWED_ORIGINS=https://<домен>` (можно несколько
через запятую). Перевыката кода для этого не нужно. Запрос без заголовка `Origin`
(server-to-server, healthcheck) проходит — гейт только против чужих Origin в браузере.

### 7.2 CSP и security-заголовки в образ НЕ входят

Они описаны только в `vercel.json`, а `vercel.json` исключён из образа
(`.dockerignore`). `server.js` security-заголовки **не ставит** (это сознательно
делегировано Nginx). В репозитории нет готового nginx-конфига. → Заголовки и CSP
из раздела 6 нужно воссоздать на Nginx вручную, иначе приложение либо сломается
(CSP режет CDN-скрипты), либо потеряет защиту.

CSP завязан на источники ресурсов (`'self'` + перечисленные CDN), **не** на сам
домен сайта — поэтому при смене домена CSP менять не надо (в отличие от
`ALLOWED_ORIGINS`).

### 7.3 `X-Forwarded-*` — от них зависят rate-limit и логотип в письме

- **Rate-limit** берёт IP из `X-Forwarded-For` → `X-Real-IP` → иначе `"unknown"`.
  Если Nginx/Cloudflare не пробросят реальный IP, **весь трафик схлопнется в один
  бакет `unknown`** и легитимные пользователи начнут лимитировать друг друга.
- **Логотип в письме** строится из `X-Forwarded-Proto` / `X-Forwarded-Host` / `Host`
  (`${proto}://${host}/images/altery-logo.png`). Если их не пробросить — картинка
  в письме не загрузится (текст-фолбэк останется).

### 7.4 В HubSpot-портале должны существовать кастомные свойства

`/api/hubspot-lead` пишет свойства контакта: `checker_entity`, `checker_plan`,
`checker_monthly_volume_gbp`, `checker_est_annual_savings_gbp` и `utm_*`. HubSpot
**отклоняет весь upsert (502)**, если хоть одно из отправленных свойств не заведено
в целевом портале. → Перед включением убедиться, что эти кастомные свойства
созданы в том аккаунте HubSpot, на который выписан `HUBSPOT_TOKEN`.

### 7.5 Brevo: verified sender

`FROM_EMAIL` должен быть подтверждённым отправителем в Brevo (домен
`send.altery.com`). Иначе письма либо не уйдут, либо попадут в спам. DMARC для
домена уже настроен; нужно убедиться, что конкретный sender заведён.

### 7.6 Rate-limit на нескольких репликах

Без Upstash счётчик живёт в памяти процесса — у каждой реплики свой. Это «режет
большинство одиночного спама», но при нескольких инстансах лимит размывается.
Для серьёзной защиты при горизонтальном масштабировании задайте
`UPSTASH_REDIS_REST_URL` + `..._TOKEN` (или подставьте свой Redis-совместимый
REST-эндпойнт).

### 7.7 Отправка письма падает с HTTP 520 → лимит размера тела в nginx

`POST /api/send-analysis` несёт PDF в base64 (~3–4 МБ). `520` — это ошибка
Cloudflare «origin вернул непонятный ответ», **приложение такой код не отдаёт**
(его коды: 200/400/429/502/500). Значит запрос умирает на краю, не в коде.
Причина почти всегда — дефолтный `client_max_body_size 1m` в nginx: большой POST
не проходит, и за Cloudflare это всплывает как 520 (а не как чистый 413).

→ Поставить `client_max_body_size 8m;` (см. nginx-конфиг в разделе 6). Проверить:
в логах контейнера запрос либо вообще не появляется (режет nginx — это наш
случай), либо появляется и отдаёт 500/502 (тогда дело в env: `BREVO_API_KEY` /
`FROM_EMAIL`). `mailto`-ошибка «user gesture is required» в той же консоли — не
про это; она про кнопку «Contact our team», к отправке письма отношения не имеет.

---

## 8. Приёмочный smoke-тест (после выката)

1. `GET /healthz` → `{"ok":true}`.
2. Открыть сайт на новом домене, пройти опрос до страницы результата.
3. **«Отправить PDF на почту»** → письмо с PDF приходит (проверить, что логотип в
   письме виден — это проверяет проброс `X-Forwarded-*`).
4. **Заявка на обратный звонок** → в HubSpot появляется контакт с заполненными
   `checker_*` свойствами (это проверяет `HUBSPOT_TOKEN` + кастомные свойства).
5. **«Start setup»** → редирект на `app.altery.com/n/registration-corporate` с
   параметрами в URL.
6. В консоли браузера нет ошибок CSP (это проверяет корректность п. 7.2).

Если п. 3 или 4 отдают 403 — почти наверняка не задан `ALLOWED_ORIGINS` (см. 7.1).

---

## 9. Порядок выката

1. Зафиксировать итоговый домен (например `check.altery.com`).
2. Завести секреты/env на сервисе (раздел 4), включая `ALLOWED_ORIGINS` с этим доменом.
3. Проверить готовность внешних систем: Brevo verified sender (7.5), кастомные
   свойства в HubSpot (7.4), egress к `api.brevo.com` / `api.hubapi.com` (5.2).
4. Собрать образ из репозитория, поднять за Nginx, дождаться зелёного `/healthz`.
5. Настроить Nginx: проксирование + `X-Forwarded-*` + заголовки/CSP (раздел 6).
6. Завести DNS поддомена в Cloudflare на Nginx.
7. Прогнать smoke-тест (раздел 8).
8. Только после подтверждения — выключить проект на Vercel.

## 10. Откат

Vercel-деплой остаётся рабочим до подтверждения нового прода — откат = вернуть DNS
на Vercel. `vercel.json` оставлен в репозитории как референс заголовков/CSP; удалять
его можно после успешного переезда.
