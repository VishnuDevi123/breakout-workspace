# Breakout Workspace

A Zoom App for planning and running breakout rooms.
The host plans rounds (or has AI draft them), gives every room a task, checklist and activities, launches the rounds from inside the meeting, and follows every room live.
Participants see their room's task and activities in the app panel.

Try it without Zoom in the interactive demo on the [project website](https://breakout-workspace.vercel.app/demo).
The website also has the [guide](https://breakout-workspace.vercel.app/docs), [support](https://breakout-workspace.vercel.app/support), [privacy policy](https://breakout-workspace.vercel.app/privacy) and [terms](https://breakout-workspace.vercel.app/terms).

## What's in this repo

| Folder      | What it is                                                                                                                                                  | Runs on          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `frontend/` | The Zoom App itself (Next.js). Runs inside the Zoom client and is the only part that calls the Zoom Apps SDK.                                               | `localhost:3000` |
| `backend/`  | Express API: stores meetings and templates in DynamoDB, receives Zoom webhooks, pushes live state to the app over SSE, calls ASU CreateAI for the AI builder. | `localhost:4000` |
| `website/`  | The project website, help and policy pages, and the interactive demo (static Next.js). Needs no backend.                                                    | `localhost:3100` |

`ARCHITECTURE.md` explains how the pieces fit together.

## Requirements

- Node.js 20 or newer and npm
- A Zoom account that can create apps on the [Zoom App Marketplace](https://marketplace.zoom.us/)
- [ngrok](https://ngrok.com/) (or another HTTPS tunnel) and [Caddy](https://caddyserver.com/), because Zoom only loads apps over HTTPS
- An AWS account with two DynamoDB tables (see below)
- For the AI builder: an ASU CreateAI API key

## 1. Install

```bash
git clone https://github.com/VishnuDevi123/breakout-workspace.git
cd breakout-workspace
(cd backend && npm install)
(cd frontend && npm install)
(cd website && npm install)   # only if you want the website
```

## 2. Configure the backend

Copy the example file and fill it in:

```bash
cp backend/.env.example backend/.env
```

The backend reads these values:

| Variable                                                   | Needed for                                                    | Where to get it                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `PORT`                                                     | Always                                                        | `4000` (Caddy forwards `/api/*` there)                                                            |
| `NODE_ENV`                                                 | Always                                                        | `development` locally, `production` when deployed                                                 |
| `FRONTEND_URL`                                             | A deployed frontend on another domain                         | The frontend's origin, exact and without a trailing slash. Leave empty locally.                   |
| `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`                     | Checking the Zoom app context token on every request          | Marketplace app, **App Credentials** (production set when deployed, development set locally)      |
| `ZOOM_DEV_CLIENT_ID`, `ZOOM_DEV_CLIENT_SECRET`             | Optional: letting the development app use a deployed backend  | Marketplace app, **App Credentials**, development set                                             |
| `ZOOM_WEBHOOK_SECRET`                                      | Verifying Zoom webhooks                                       | Marketplace app, **Features → Event Subscriptions → Secret Token**                                |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Storage                                                       | An IAM user limited to the two tables below. A local AWS CLI login works instead of the keys.     |
| `TEMPLATES_TABLE`                                          | Saved templates                                               | DynamoDB table, partition key `ownerUid` (string), sort key `id` (string)                         |
| `MEETINGS_TABLE`                                           | Workflows, rooms, tasks, answers and live state of a meeting | DynamoDB table, partition key `parentUUID` (string), sort key `item` (string), TTL on `expiresAt` |
| `CREATEAI_API_KEY`                                         | AI workflow builder                                           | ASU CreateAI, **Profile → API Keys** on platform.aiml.asu.edu                                     |

Create both tables with on-demand capacity.
The IAM user needs `GetItem`, `PutItem`, `Query`, `DeleteItem` and `BatchWriteItem` on them.
Meeting records expire a day after their last write, and are deleted as soon as Zoom reports the meeting ended.

The AI builder uses the `openai` SDK against ASU CreateAI, which is OpenAI-compatible.
To use OpenAI instead, change `BASE_URL` and `MODEL` in `backend/services/ai.ts`.

Never commit `backend/.env`.

## 3. Run it locally

Start everything at once:

```bash
./dev.sh
```

Or run each part in its own terminal:

```bash
# 1. Backend
cd backend && npm run dev

# 2. Zoom App
cd frontend && npm run dev

# 3. Caddy: one HTTPS-ready origin on :8080 (/api to the backend, the rest to the app)
caddy run --config Caddyfile

# 4. Tunnel: gives Zoom a public HTTPS address for :8080
ngrok http 8080
```

Copy the `https://….ngrok-free.app` (or `.dev`) address that ngrok prints. You need it in the next step.

`frontend/next.config.ts` lists the tunnel domain in `allowedDevOrigins`. Replace it with your own ngrok domain, or Next.js will block the app's dev requests.

## 4. Create the Zoom app

On the [Zoom App Marketplace](https://marketplace.zoom.us/), create a **General App** (user-managed), then:

1. **Basic information:** set the OAuth redirect URL to `https://<your-ngrok-domain>/auth/callback`, and the **Deauthorization notification** endpoint to `https://<your-ngrok-domain>/api/webhooks/zoom`.
2. **Features → Surface:** add the **Zoom App** surface for meetings, set the **Home URL** to `https://<your-ngrok-domain>/`, and add your ngrok domain to the **domain allow list**.
3. **Features → Zoom App SDK:** tick every API the app uses, or `config()` fails with `reason:app_not_support`:
   `getMeetingUUID`, `getUserContext`, `getAppContext`, `openUrl`, `getMeetingContext`, `onMyUserContextChange`, `getMeetingParticipants`, `configureBreakoutRooms`, `createBreakoutRooms`, `assignParticipantToBreakoutRoom`, `openBreakoutRooms`, `closeBreakoutRooms`, `getBreakoutRoomList`.
4. **Features → Event Subscriptions:** set the endpoint to `https://<your-ngrok-domain>/api/webhooks/zoom` and subscribe to:
   `meeting.participant_joined`, `meeting.participant_left`, `meeting.participant_joined_breakout_room`, `meeting.participant_left_breakout_room`, `meeting.participant_role_changed`, `meeting.ended`.
   Zoom validates the endpoint when you save, so the backend, Caddy and ngrok must be running.
5. Copy the **Client ID**, **Client Secret** and **Secret Token** into `backend/.env`, then restart the backend.
6. **Local test:** add the app to your account, start a Zoom meeting, and open it from **Apps** in the meeting toolbar.

The free ngrok plan gives you a new address each time you restart it. When that happens, update the Home URL, redirect URL, allow list and webhook endpoints in the Marketplace.

## 5. Deploy

- **Backend:** any Node.js host. Set the same variables as `backend/.env`, with the production Zoom credentials and `FRONTEND_URL` set to the frontend's origin.
- **Frontend:** any Next.js host. Set `NEXT_PUBLIC_BACKEND_URL` and `BACKEND_INTERNAL_URL` to the backend's URL.
- **Website:** a static export, so any static host works.

Point the Marketplace URLs at the deployed frontend (Home URL, OAuth redirect) and backend (webhook and deauthorization endpoints), and add both domains to the domain allow list.

## 6. Using the app

- **Host:** plan rounds on the workflow page (or describe the session and let the AI draft it), set rooms and tasks, then **Launch workflow**. The live page shows each room's progress and results.
- **Co-host:** can edit tasks, extend the timer and follow the rooms. Only the host launches, ends or skips rounds.
- **Participants:** open the app from **Apps**. It shows your room's task, checklist and activities once you are in your breakout room.
- Breakout rooms must be enabled for the Zoom account, and everyone must be signed in to Zoom.

## Checks

```bash
(cd backend && npx tsc --noEmit)
(cd frontend && npx tsc --noEmit && npx eslint lib app --quiet && npm test)
(cd website && npx tsc --noEmit && npx eslint . --quiet)
```

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).
