API Endpoints
Управление API‑ключами (требует JWT):
POST /api-keys — создать ключ
GET /api-keys — список ключей пользователя
GET /api-keys/:id — получить ключ
PUT /api-keys/:id — обновить ключ
DELETE /api-keys/:id — удалить ключ
Вебхуки:
POST /public/webhooks — создать вебхук (требует API‑ключ)
GET /webhooks — список вебхуков пользователя (требует JWT)
GET /webhooks/analytics — аналитика (требует JWT)
# omnicore-back
