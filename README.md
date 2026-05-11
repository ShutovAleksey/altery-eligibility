# Altery Eligibility Checker — Deployment Guide

End-to-end deployment на Vercel со Stripe тестовыми платежами.
**Время:** ~10 минут. **Стоимость:** $0 (всё в free tier).

После деплоя у тебя будет permanent URL вида `https://altery-eligibility.vercel.app`, который можно расшарить команде. Card test `4242 4242 4242 4242` пройдёт реальный PaymentIntent через Stripe и появится в Dashboard → Payments.

---

## Структура проекта

```
altery-deploy/
├── index.html                          ← Frontend (prototype)
├── api/
│   ├── create-payment-intent.js        ← Создаёт Stripe PaymentIntent
│   └── config.js                       ← Отдаёт publishable key из env
├── package.json                        ← Зависимость: stripe SDK
├── vercel.json                         ← Конфиг рантайма
├── .gitignore
└── README.md                           ← Этот файл
```

---

## Шаг 1 — Stripe аккаунт + ключи (~3 минуты)

1. Открой https://dashboard.stripe.com/register
2. Введи email + пароль → подтверди email
3. **Не нужно** заполнять бизнес-информацию — test mode работает сразу
4. После входа открой **Developers → API keys** в левом сайдбаре,
   или сразу: https://dashboard.stripe.com/test/apikeys
5. Скопируй и сохрани куда-нибудь временно:
   - **Publishable key** (начинается с `pk_test_...`)
   - **Secret key** — клик на «Reveal test key» (начинается с `sk_test_...`)

⚠️ Secret key никогда не должен попасть в браузер или Git. Мы его положим только в Vercel env vars.

---

## Шаг 2 — Установить Node.js (если ещё нет)

Проверка в терминале:
```bash
node --version
```

Если показывает `v18.x` или выше — пропускай шаг.
Если нет — поставь с https://nodejs.org/en/download (выбирай LTS).

---

## Шаг 3 — Установить Vercel CLI

```bash
npm install -g vercel
```

Один раз. Проверка:
```bash
vercel --version
```

---

## Шаг 4 — Первый деплой

В терминале:

```bash
cd /путь/к/altery-deploy
vercel
```

CLI задаст несколько вопросов — отвечай так:

| Вопрос | Ответ |
|---|---|
| `Set up and deploy?` | **Y** |
| `Which scope?` | Твой личный аккаунт (выбери стрелками + Enter) |
| `Link to existing project?` | **N** |
| `What's your project's name?` | `altery-eligibility` (или своё) |
| `In which directory is your code?` | `./` (Enter) |
| `Want to modify these settings?` | **N** |

После этого Vercel:
- Скачает `stripe` SDK через npm
- Соберёт проект
- Выдаст preview URL типа `https://altery-eligibility-abc123.vercel.app`

Этот URL **ещё не работает с платежами** — нужно добавить env vars.

---

## Шаг 5 — Добавить environment variables

Открой Vercel Dashboard:
1. https://vercel.com/dashboard
2. Кликни на свой проект `altery-eligibility`
3. **Settings → Environment Variables**
4. Добавь **две** переменные:

| Name | Value | Environment |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` (со Stripe Dashboard) | All (Production, Preview, Development) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` (со Stripe Dashboard) | All |

Для каждой:
- Жми **Save**
- Галочки на всех трёх Environment (Production / Preview / Development)

---

## Шаг 6 — Production deploy с env vars

В терминале:

```bash
vercel --prod
```

Получишь финальный URL: `https://altery-eligibility.vercel.app` (или с твоим именем проекта).

---

## Шаг 7 — End-to-end тест

1. Открой production URL
2. Пройди eligibility flow до конца (4 вопроса)
3. На result page жми **«Set up this account»**
4. Откроется Stripe Payment Element со всеми payment methods
5. Введи тестовую карту:
   - Номер: `4242 4242 4242 4242`
   - Expiry: любая будущая дата (`12/29`)
   - CVC: любые 3 цифры (`123`)
   - Postal code: любой (`12345`)
6. Жми **«Subscribe — £100/mo»**
7. Должен появиться зелёный success message
8. Проверь Stripe Dashboard → **Payments**: https://dashboard.stripe.com/test/payments — увидишь созданный PaymentIntent на €110 со статусом `succeeded`

✅ End-to-end работает!

---

## Дополнительные тестовые карты Stripe

| Сценарий | Номер карты |
|---|---|
| Успех | `4242 4242 4242 4242` |
| Требует 3D Secure | `4000 0027 6000 3184` |
| Declined (generic) | `4000 0000 0000 0002` |
| Declined (insufficient funds) | `4000 0000 0000 9995` |
| Visa (UK) | `4000 0082 6000 0000` |

Полный список: https://stripe.com/docs/testing#cards

---

## Дополнительные payment methods (BNPL, bank debit, redirect-based)

В Stripe Dashboard → **Settings → Payments → Payment methods**:
https://dashboard.stripe.com/test/settings/payment_methods

Включи там методы которые хочешь видеть в Payment Element: SEPA Direct Debit, iDEAL, Bancontact, Klarna, Afterpay, Giropay, EPS, P24, Sofort, BLIK, Multibanco, и т.д.

После включения — обнови страницу прототипа, методы появятся в Element автоматически (`automatic_payment_methods: enabled: true` на бэкенде сам их подхватит).

Большинство из них требуют `redirect: 'if_required'` (уже стоит в коде) — Stripe сам разрулит redirect dance. Возврат после оплаты приходит на `?paid=1`.

---

## Обновление прототипа

После любых изменений в коде:

```bash
vercel --prod
```

Через ~30 секунд новая версия на том же URL.

Хочешь preview URL для каждого PR/итерации (например показать команде без обновления production):
```bash
vercel
```
без `--prod` — получишь уникальный URL вида `altery-eligibility-git-xyz.vercel.app`.

---

## Расшарить с командой

Production URL `https://altery-eligibility.vercel.app` — permanent, можно просто скинуть в Slack.

Хочешь кастомный домен (например `eligibility.altery.com`):
1. Vercel Dashboard → проект → **Settings → Domains**
2. Add domain → введи свой домен
3. Vercel покажет DNS-записи которые нужно добавить у твоего регистратора
4. Через 5-30 минут DNS пропагируется и URL работает

---

## Что НЕ нужно делать

- ❌ **Не коммить `.env`** файлы в Git — они в `.gitignore`
- ❌ **Не светить `sk_test_...`** где-то кроме Vercel env vars
- ❌ **Не использовать `pk_live_...`** пока не пройдёшь Stripe activation (Settings → Business details) и не получишь готовый production setup

---

## Troubleshooting

### «Couldn't reach backend: HTTP 500…»
Скорее всего нет env var `STRIPE_SECRET_KEY`. Проверь Vercel Dashboard → Settings → Environment Variables. После добавления **обязательно** `vercel --prod` для нового деплоя.

### «Stripe.js script failed to load»
Production URL должен быть HTTPS (Vercel это даёт автоматически). Если открываешь preview URL без HTTPS — Stripe откажется работать. Vercel preview URLs всегда HTTPS, так что эта проблема обычно случается только при локальном `file://` открытии.

### «No clientSecret in backend response»
Бэкенд вернул не то. Открой Vercel Dashboard → проект → **Logs**, посмотри что ругается `create-payment-intent.js`. Обычно проблема в secret key (неправильный или из другого аккаунта).

### Логи серверных функций
Vercel Dashboard → проект → **Logs** (real-time) — там видно каждый запрос к `/api/*` с timing и output `console.error`.

### Локальная разработка
```bash
vercel dev
```
Поднимет http://localhost:3000 с frontend + рабочими `/api/*` endpoints. Использует те же env vars что в production (через `vercel env pull` можно скачать локально в `.env.local`).

---

## Что дальше

Когда нужно перейти от прототипа к реальному product:
1. Заменить деффердный flow на подписку (Stripe Subscriptions API, recurring billing)
2. Добавить webhook handler (`api/stripe-webhook.js`) для `payment_intent.succeeded` → создать аккаунт в Altery
3. После Stripe activation → переключить keys на `pk_live_/sk_live_`
4. Кастомный домен на `pay.altery.com` или подобный

Текущая архитектура (Vercel functions + frontend) масштабируется до десятков тысяч транзакций в месяц на том же free tier.
