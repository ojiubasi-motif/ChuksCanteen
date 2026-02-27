BASE_URL: http://localhost:3005/api/v1

AUTHENTICATION
- Headers:
	- `Content-Type: application/json`
	- `token: bearer [your_access_token]` (for authenticated routes)

USER ROLES: [Customer, Admin]

--------------------------------------------------
1) AUTHENTICATION & USER ROUTES
--------------------------------------------------

POST `/auth/signup`  
DESC: Create a new user account. Generates an OTP (OTP logged/returned in non-production).  
AUTH: Not required  
Request JSON:
```json
{
	"email": "user@example.com",
	"phone": "07000000000",
	"password": "secret",
	"first_name": "John",
	"last_name": "Doe",
	"referralCode": "REF123"
}
```
Success (201):
```json
{
	"msg": "signup success, otp sent",
	"data": { "id": "<userId>" },
	"type": "SUCCESS",
	"code": 610,
	"rawOtp": "654321" // returned only in non-production
}
```
Errors:
- 400 (code 606): missing signup data
- 409 (code 609): email or phone already exists
- 500 (code 602): server error


-------------------------------
POST `/auth/verify-otp `   
DESC: Verify OTP, mark user verified, issue access token + refresh token (cookie).  
AUTH: Not required  
Request JSON:
```json
{
	"userId": "<userId>",
	"otp": "123456"
}
```
Success (200):
```json
{
	"msg": "verification success",
	"data": { "user": { /* user object */ }, "access_token": "<jwt>" },
	"type": "SUCCESS",
	"code": 600
}
```
Errors:
- 400 (code 606): missing payload
- 404 (code 604): user not found
- 400 (code 607): no otp pending
- 400 (code 608): otp expired
- 400 (code 609): invalid otp
- 500 (code 602): server error
----------------------------------------
POST `/auth/resend-otp`  
DESC: Resend OTP (OTP logged in dev).  
AUTH: Not required  
Request JSON:
```json
{ "userId": "<userId>" }
```
Success (200):
```json
{ "msg": "otp resent", "type": "SUCCESS", "code": 611 }
```
-------------------------------------------
POST `/accounts/auth`  
DESC: Login with email (or phone) and password. Returns access token and sets refresh cookie.  
AUTH: Not required  
Request JSON:
```json
{ "email": "user@example.com", "password": "secret" }
```
Success (200):
```json
{
	"msg": "login success",
	"data": { "user": { /* user payload */ }, "access_token": "<jwt>" },
	"type": "SUCCESS",
	"code": 600
}
```
Errors:
- 401 (code 605): login data missing / user not found / wrong credentials
- 500 (code 602): server error
-----------------------------------------------------------------
DEV (non-production) helper  
POST `/auth/dev/create-user`  
DESC: Create a user bypassing schema validation (development helper). Returns raw OTP.  
AUTH: Forbidden in production  
Request JSON: same as `/auth/signup`  
Success (201):
```json
{ "msg": "dev user created", "id": "<userId>", "rawOtp": "654321" }
```

--------------------------------------------------
2) FOOD ITEMS (MENU)
--------------------------------------------------

GET `/items`  
DESC: List available food items.  
AUTH: Not required  
Response (200):
```json
{ "msg": "success", "data": [ { "_id": "...", "name": "Jollof Rice", "price": 500, "available": true } ] }
```
--------------------------------------------------------
GET `/items/:id`  
DESC: Get a single food item by id.  
AUTH: Not required  
Response (200):
```json
{ "msg": "success", "data": { "_id": "...", "name": "Jollof Rice", "price": 500, "available": true } }
```
Errors:
- 404: not found
- 500: server error
--------------------------------------------------------
POST `/items`  
DESC: Create a food item (admin only).  
AUTH: Required (admin)  
Request JSON:
```json
{
	"name": "Jollof Rice",
	"description": "Spicy rice",
	"price": 500,
	"available": true,
	"tags": ["rice","popular"],
	"imageUrl": "https://..."
}
```
Success (201):
```json
{ "msg": "created", "data": { /* created item */ } }
```
-------------------------------------------------------------
PUT `/items/:id`  
DESC: Update a food item (admin only).  
AUTH: Required (admin)  
Request JSON: partial or full item fields  
Success (200):
```json
 { "msg": "updated", "data": { /* updated item */ } }
 ```

-------------------------------------------------------
PATCH `/items/:id/availability`  
DESC: Set item availability (admin only).  
AUTH: Required (admin)  
Request JSON:
```json
{ "available": true }
```
Success (200): 
```json 
{ "msg": "updated", "data": { /* updated item */ } }
```

--------------------------------------------------
3) CART & ORDERS (DESIGN + JSON)
--------------------------------------------------
Note: Endpoints scaffolded in design; implement as next steps.

POST `/cart`  
DESC: Add or update items in a user's cart.  
AUTH: Required  
Request JSON:
```json
{
	"userId": "<userId>",
	"items": [
		{ "foodItemId": "<foodItemId>", "qty": 2 }
	]
}
```
-------------------------------------------------------
POST `/orders`  
DESC: Place an order — validate items, calculate totals, create order with `pending` status.  
AUTH: Required  
Request JSON:
```json
{
	"userId": "<userId>",
	"items": [
		{ "foodItemId": "<foodItemId>", "qty": 2, "unitPrice": 500 }
	],
	"subtotal": 1000,
	"tax": 0,
	"total": 1000,
	"notes": "Leave at door"
}
```
Success (201):
```json
{ "msg": "order created", "data": { "orderId": "<id>", "status": "pending" } }
```
Errors:
- 409: item unavailable
- 400: invalid payload
--------------------------------------------------------------
GET `/orders/:id`  
DESC: Get order details and status.  
AUTH: Required  

-----------------------------------------------------------------
PATCH `/orders/:id/status`  
DESC: Admin updates order lifecycle: `confirmed`, `preparing`, `out_for_delivery`, `completed`, `cancelled`.  
AUTH: Required (admin)  
Request JSON:
```json
{ "status": "confirmed" }
```
----------------------------------------------------------------
POST `/orders/:id/cancel`.  
DESC: Cancel an order.  
Rules: customer can cancel before `preparing`/`out_for_delivery` depending on policy; admin can cancel anytime.  
AUTH: Required

--------------------------------------------------
4) ERROR CODES & MESSAGES
--------------------------------------------------
HTTP status mapping: 200, 201, 400, 401, 403, 404, 409, 500

App-specific JSON `code` values:
- 600: SUCCESS
- 602: FAILED (server error)
- 604: NOT_FOUND
- 605: WRONG_OR_MISSING_PAYLOAD (login)
- 606: WRONG_OR_MISSING_PAYLOAD (signup/verify)
- 607: NO_OTP
- 608: OTP_EXPIRED
- 609: OTP_INVALID or CONFLICT
- 610: SIGNUP_SUCCESS
- 611: OTP_RESENT

--------------------------------------------------
Notes
- All timestamps are ISO strings. Use bearer auth header for protected endpoints.
- OTPs are hashed in DB; raw OTPs are only available in non-production for testing.

File: ChuksCanteen API reference

