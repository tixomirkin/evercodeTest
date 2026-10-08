# 🪙 Crypto Price Tracker API

Backend-сервис для отслеживания и агрегации цен криптовалют с использованием **CoinMarketCap API**, разработанный на **Node.js**, **Express**, **TypeScript** и **SQLite** (raw SQL без ORM).

---

## 📋 Оглавление
- [Функциональные возможности](#-функциональные-возможности)
- [Технологический стек](#-технологический-стек)
- [Архитектура и структура проекта](#-архитектура-и-структура-проекта)
- [Быстрый старт и запуск](#-быстрый-старт-и-запуск)
  - [1. Локальный запуск (pnpm)](#1-локальный-запуск-pnpm)
  - [2. Запуск в Docker / docker-compose](#2-запуск-в-docker--docker-compose)
- [Переменные окружения](#-переменные-окружения)
- [Документация API (Swagger / OpenAPI 3.0)](#-документация-api-swagger--openapi-30)
- [Эндпоинты API и примеры запросов](#-эндпоинты-api-и-примеры-запросов)
- [Тестирование](#-тестирование)
- [Фоновая синхронизация и Graceful Shutdown](#-фоновая-синхронизация-и-graceful-shutdown)

---

## 🚀 Функциональные возможности

- 🔐 **Аутентификация и авторизация**: Доступ ко всем эндпоинтам API защищен через заголовок `Authorization: Bearer <API_KEY>`.
- 📊 **CRUD для криптовалют**: Регистрация, просмотр списка, получение деталей, обновление и удаление отслеживаемых валют.
- ⚡ **Актуальные котировки CoinMarketCap**: Получение актуальных цен из официального API CoinMarketCap с валидацией, таймаутами и обработкой ошибок/недоступности.
- 📜 **История цен**: Сохранение истории изменения цен в базе данных SQLite с поддержкой пагинации, фильтрации по датам (`fromDate`, `toDate`) и сортировки (`asc`/`desc`).
- 🔄 **Фоновая синхронизация**: Периодическое автоматическое обновление цен в фоновом режиме с защитой от наложения циклов и обработкой ошибок без падения процесса.
- 🛑 **Graceful Shutdown**: Безопасная остановка планировщика фоновых задач, закрытие HTTP-соединений и отключение от SQLite при получении сигналов `SIGINT` / `SIGTERM`.
- 📖 **Интерактивная документация**: Встроенный Swagger UI (OpenAPI 3.0) по адресу `/docs`.
- 🛡️ **Строгая валидация**: Все входные данные (body, params, query) проверяются схемами Zod.
- 🗄️ **Чистый Raw SQL**: Полное отсутствие ORM (без Prisma, TypeORM, Sequelize). Используются параметризованные запросы `better-sqlite3` с индексами и транзакциями.

---

## 🛠 Технологический стек

- **Runtime**: Node.js 18+ (протестировано на Node.js 20/22/25)
- **Пакетный менеджер**: `pnpm`
- **Фреймворк**: Express.js
- **Язык**: TypeScript (strict mode)
- **База данных**: SQLite 3 (`better-sqlite3`) — **только raw SQL**
- **HTTP-клиент**: Axios (с таймаутами и маппингом ошибок)
- **Валидация**: Zod
- **Документация**: Swagger UI Express + OpenAPI 3.0 YAML
- **Тестирование**: Jest + ts-jest + Supertest
- **Контейнеризация**: Docker (multi-stage build), Docker Compose

---

## 📁 Архитектура и структура проекта

```
.
├── src/
│   ├── config/             # Конфигурация приложения и валидация env через Zod
│   ├── controllers/        # Контроллеры обработки запросов (CryptoController, HealthController)
│   ├── db/                 # Инициализация SQLite, Raw SQL DDL схемы таблиц и индексов
│   ├── docs/               # Спецификация OpenAPI 3.0 (openapi.yaml)
│   ├── errors/             # Доменные классы ошибок (AppError, ExternalApiError и др.)
│   ├── middlewares/        # Bearer Auth, Zod Validator, Centralized Error Handler
│   ├── repositories/       # Репозитории доступа к данным через Raw SQL prepared statements
│   │   ├── cryptocurrency.repository.ts
│   │   └── price-history.repository.ts
│   ├── routes/             # Маршруты Express
│   ├── services/           # Бизнес-логика, интеграция с CoinMarketCap API, фоновый планировщик
│   │   ├── cmc.service.ts
│   │   ├── crypto.service.ts
│   │   └── scheduler.service.ts
│   ├── types/              # TypeScript интерфейсы и DTO
│   ├── validators/         # Zod-схемы валидации входных параметров
│   ├── app.ts              # Конфигурация Express приложения
│   └── server.ts           # Точка входа, запуск сервера и graceful shutdown
├── tests/
│   ├── helpers/            # Хелперы для тестов (изолированная in-memory SQLite)
│   ├── integration/        # Интеграционные тесты всех API эндпоинтов (Supertest)
│   └── unit/               # Модульные тесты сервисов CMC и Background Scheduler
├── .env.example            # Пример переменных окружения
├── docker-compose.yml      # Конфигурация запуска в Docker Compose
├── Dockerfile              # Multi-stage Dockerfile
└── package.json
```

---

## 🚀 Быстрый старт и запуск

### 1. Локальный запуск (pnpm)

#### Шаг 1: Установка зависимостей
```bash
pnpm install
```

#### Шаг 2: Настройка переменных окружения
Создайте файл `.env` на основе примера:
```bash
cp .env.example .env
```
Заполните параметры:
- `API_BEARER_TOKEN`: токен для авторизации к вашему API (например, `my-secret-backend-token-12345`).
- `CMC_API_KEY`: ваш API Key от CoinMarketCap ([получить бесплатно здесь](https://pro.coinmarketcap.com/)).

#### Шаг 3: Запуск в режиме разработки
```bash
pnpm run dev
```

#### Шаг 4: Сборка и запуск в production-режиме
```bash
pnpm run build
pnpm start
```

---

### 2. Запуск в Docker / docker-compose

Сервис полностью упакован в легковесный multi-stage Docker-образ с non-root пользователем и healthcheck:

```bash
# Запуск контейнера
docker-compose up --build -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

База данных SQLite сохраняется на хост-машине в смонтированной директории `./data` (не попадает в репозиторий благодаря `.gitignore`).

---

## ⚙️ Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `PORT` | `3000` | Порт HTTP-сервера |
| `NODE_ENV` | `development` | Окружение (`development`, `production`, `test`) |
| `API_BEARER_TOKEN` | `my-secret-backend-token-12345` | Секретный Bearer-токен для доступа к API |
| `CMC_API_KEY` | - | API ключ от CoinMarketCap Developer Portal |
| `CMC_BASE_URL` | `https://pro-api.coinmarketcap.com` | Базовый URL API CoinMarketCap |
| `CMC_TIMEOUT_MS` | `10000` | Таймаут запросов к внешнему API (в миллисекундах) |
| `DB_PATH` | `./data/crypto_tracker.db` | Путь к файлу SQLite базы данных |
| `BASE_CURRENCY` | `USD` | Единая валюта для всех котировок |
| `SYNC_ENABLED` | `true` | Включение/выключение фоновой синхронизации |
| `SYNC_INTERVAL_MS`| `120000` | Интервал фоновой синхронизации (по умолчанию 2 мин) |

---

## 📖 Документация API (Swagger / OpenAPI 3.0)

Интерактивная документация с возможностью отправки тестовых запросов доступна в браузере:
- **Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **Спецификация OpenAPI**: [src/docs/openapi.yaml](file:///Users/tixomirkin/Desktop/EverCodeTest/src/docs/openapi.yaml)

В интерфейсе Swagger нажмите кнопку **Authorize** и введите ваш `API_BEARER_TOKEN`.

---

## 📡 Эндпоинты API и примеры запросов

> Во всех запросах к `/api/v1/*` передавайте заголовок:  
> `Authorization: Bearer <API_BEARER_TOKEN>`

### 1. Проверка состояния сервиса (публичный)
```bash
curl http://localhost:3000/health
```
**Ответ `200 OK`**:
```json
{
  "status": "ok",
  "timestamp": "2026-10-08T12:00:00.000Z",
  "uptime": 12.34,
  "services": {
    "database": "ok",
    "backgroundSync": "running"
  }
}
```

---

### 2. Добавить криптовалюту для отслеживания
```bash
curl -X POST http://localhost:3000/api/v1/cryptocurrencies \
  -H "Authorization: Bearer my-secret-backend-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTC", "name": "Bitcoin"}'
```
**Ответ `201 Created`**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "symbol": "BTC",
    "name": "Bitcoin",
    "created_at": "2026-10-08T12:00:00.000Z",
    "last_updated_at": "2026-10-08T12:00:00.000Z"
  }
}
```

---

### 3. Получить список всех отслеживаемых криптовалют
```bash
curl http://localhost:3000/api/v1/cryptocurrencies \
  -H "Authorization: Bearer my-secret-backend-token-12345"
```
**Ответ `200 OK`**:
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": 1,
      "symbol": "BTC",
      "name": "Bitcoin",
      "created_at": "2026-10-08T12:00:00.000Z",
      "last_updated_at": "2026-10-08T12:00:00.000Z",
      "latest_price": 68420.5,
      "currency": "USD"
    }
  ]
}
```

---

### 4. Получить данные криптовалюты по ID
```bash
curl http://localhost:3000/api/v1/cryptocurrencies/1 \
  -H "Authorization: Bearer my-secret-backend-token-12345"
```

---

### 5. Обновить данные криптовалюты
```bash
curl -X PUT http://localhost:3000/api/v1/cryptocurrencies/1 \
  -H "Authorization: Bearer my-secret-backend-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"name": "Bitcoin Core"}'
```

---

### 6. Запросить актуальную цену из CoinMarketCap и сохранить в историю
```bash
curl -X POST http://localhost:3000/api/v1/cryptocurrencies/1/price \
  -H "Authorization: Bearer my-secret-backend-token-12345"
```
**Ответ `200 OK`**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "cryptocurrency_id": 1,
    "symbol": "BTC",
    "price": 68420.5,
    "currency": "USD",
    "recorded_at": "2026-10-08T12:01:00.000Z"
  }
}
```

---

### 7. Получить историю цен с фильтрами и пагинацией
Параметры query:
- `page`: номер страницы (по умолчанию `1`)
- `limit`: записей на страницу (по умолчанию `20`, макс `100`)
- `fromDate`: начальная дата в формате ISO 8601 (опционально)
- `toDate`: конечная дата в формате ISO 8601 (опционально)
- `order`: порядок сортировки по времени `asc` или `desc` (по умолчанию `desc`)

```bash
curl "http://localhost:3000/api/v1/cryptocurrencies/1/history?page=1&limit=20&order=desc" \
  -H "Authorization: Bearer my-secret-backend-token-12345"
```
**Ответ `200 OK`**:
```json
{
  "success": true,
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "data": [
    {
      "id": 1,
      "cryptocurrency_id": 1,
      "symbol": "BTC",
      "price": 68420.5,
      "currency": "USD",
      "recorded_at": "2026-10-08T12:01:00.000Z"
    }
  ]
}
```

---

### 8. Принудительная синхронизация цен всех криптовалют
```bash
curl -X POST http://localhost:3000/api/v1/cryptocurrencies/sync \
  -H "Authorization: Bearer my-secret-backend-token-12345"
```

---

### 9. Удалить отслеживаемую криптовалюту
```bash
curl -X DELETE http://localhost:3000/api/v1/cryptocurrencies/1 \
  -H "Authorization: Bearer my-secret-backend-token-12345"
```

---

## 🧪 Тестирование

Тесты написаны на **Jest** и **Supertest**. Тестовая база данных изолирована в памяти (`:memory:`), поэтому тесты не влияют на реальные данные и не требуют сетевых запросов к CoinMarketCap (все внешние вызовы замоканы).

Каждый эндпоинт покрыт как минимум одним позитивным и одним негативным тестом. Также протестированы фоновые задачи и отказоустойчивость при ошибках внешнего API (таймауты, 401, 429, 500, сетевые сбои).

### Запуск всех тестов:
```bash
pnpm test
```

### Запуск тестов с генерацией отчета покрытия (Coverage):
```bash
pnpm run test:coverage
```

### Структура тестов:
- `tests/unit/cmc.service.spec.ts`: Unit-тесты клиента CoinMarketCap (таймауты, неверные ключи, лимиты, сетевые сбои).
- `tests/unit/scheduler.service.spec.ts`: Unit-тесты фонового планировщика синхронизации цен и graceful shutdown.
- `tests/integration/api.spec.ts`: Интеграционные тесты всех эндпоинтов, Bearer-аутентификации, валидации входных данных и SQLite.

---

## 🔄 Фоновая синхронизация и Graceful Shutdown

1. **Фоновый планировщик (`BackgroundSyncService`)**:
   - Автоматически запускается вместе с сервером с интервалом `SYNC_INTERVAL_MS` (настраивается в `.env`).
   - Пакетом запрашивает котировки для всех отслеживаемых криптовалют из CoinMarketCap.
   - Сохраняет новые записи в таблицу `price_history` в рамках единой транзакции SQLite и обновляет `last_updated_at`.
   - Не падает при сбоях сети или внешнего сервиса (логирует ошибки и продолжает работу).
   - Предотвращает наложение циклов (если предыдущая синхронизация еще не завершилась, следующий тик пропускается).

2. **Graceful Shutdown**:
   - При получении сигналов `SIGINT` (Ctrl+C) или `SIGTERM` (остановка контейнера Docker) сервис:
     1. Останавливает планировщик фоновых задач и дожидается завершения текущей итерации.
     2. Закрывает HTTP-сервер Express, переставая принимать новые подключения.
     3. Безопасно закрывает соединение с базой данных SQLite.
     4. Корректно завершает процесс с кодом `0`.
