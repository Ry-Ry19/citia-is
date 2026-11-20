# CITIA-IS Backend (FastAPI)

The Python API for CITIA-IS. It runs separately from the Next.js frontend.

**Current stage: 14B.** `POST /classify` validates uploads and returns
the classification contract, but **real AI inference is not available
yet**: the trained weights (`models/mahogany_cls.pt`) and the Ultralytics
package are not installed. Until they are, `/health` reports
`"inference_ready": false` and `/classify` answers 503. All
classification tests use a clearly labelled mock classifier.

`POST /reports` saves community sighting reports to Supabase PostgreSQL
and Supabase Storage. `GET /staff/me` checks a CENRO staff member's
Supabase sign-in. Their automated tests use fakes.

## Requirements

- Python 3.12 from python.org. The backend is tested on 3.12.7.
- A computer can have several Python versions installed at once, so the
  commands below call Python 3.12 by its full path instead of relying
  on `python` or the `py` launcher.
  - Default "install for me only" location:
    `$env:LOCALAPPDATA\Programs\Python\Python312\python.exe`
  - "Install for all users" location:
    `C:\Program Files\Python312\python.exe`

## First-time setup (Windows PowerShell, from the project root)

```powershell
cd backend
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" -m venv .venv
.\.venv\Scripts\python.exe --version
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

The `--version` line must print `Python 3.12.x`. If it prints anything
else, delete the `.venv` folder and create it again with the correct path.

The commands use `.\.venv\Scripts\python.exe` directly, so the
environment never needs to be "activated". This avoids the PowerShell
error "running scripts is disabled on this system".

## Run the API

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

- Health check: http://localhost:8000/health
- API docs (development only): http://localhost:8000/docs

The frontend still runs on its own with `npm run dev` from the project root.

## Run the tests

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

## AI classification — `POST /classify`

**Request:** `multipart/form-data` with one field, `image` (a JPEG or PNG).

**Success (200):**

```json
{ "label": "Mahogany", "confidence": 94.8, "low_confidence": false }
```

| Field | Meaning |
| --- | --- |
| `label` | `Mahogany`, `Non-Mahogany`, or `Non-Tree` |
| `confidence` | Classification Confidence, 0–100, one decimal place |
| `low_confidence` | `true` when `confidence` is below `LOW_CONFIDENCE_THRESHOLD` (70, provisional). The user should be asked for a clearer photo. |

**Errors** (all shaped `{"error": {"code": ..., "message": ...}}`):

| Status | `code` | When |
| --- | --- | --- |
| 400 | `empty_file` | The file is empty |
| 400 | `invalid_image` | The file is not a readable image, or is corrupted |
| 413 | `file_too_large` | Larger than `MAX_UPLOAD_BYTES` |
| 413 | `image_too_large` | Resolution above `MAX_IMAGE_PIXELS` |
| 415 | `unsupported_media_type` | A real image, but not JPEG or PNG |
| 422 | `validation_error` | No `image` field was sent |
| 500 | `classification_failed` | The model raised an error |
| 503 | `inference_unavailable` | No model is loaded |

A prediction is the model's best guess among its three classes — not a
scientific identification. `Non-Mahogany` does not mean "non-invasive".

### Enabling real inference (once the weights are ready)

1. Copy the trained weights to `backend/models/mahogany_cls.pt`
   (git-ignored).
2. The model's classes must be exactly `Mahogany`, `Non-Mahogany`,
   `Non-Tree` (indexes 0, 1, 2) — the training dataset folders must have
   exactly these names. Any other model is refused at startup with a
   message in the server log.
3. Install Ultralytics (a separate, approved step — it downloads PyTorch).
4. Set `MODEL_VERSION` in `backend/.env`. Without it inference stays
   unavailable, so no AI result can be saved without naming its model.
5. Restart the API. `/health` should report `"inference_ready": true`.
   Then test `/classify` with real Mahogany, Non-Mahogany and Non-Tree
   images before relying on it.

Only load weights the project trained itself: `.pt` files can run code
when loaded.

The upload limits protect the API itself. A deployed server should also
limit the request body size at its reverse proxy.

## Sighting reports — `POST /reports`

**Request:** `multipart/form-data` with exactly one `photo` (JPEG or PNG)
and these fields:

| Field | Required | Values |
| --- | --- | --- |
| `client_submission_id` | Yes | A UUID the form creates once per report |
| `study_area` | Yes | `palao`, `dalipuga`, `npc` |
| `observation_type` | Yes | `single_tree`, `multiple_trees`, `seedlings_saplings` |
| `consent_confirmed` | Yes | Must be `true` |
| `barangay`, `landmark` | No | Up to 100 and 200 characters |
| `community_notes` | No | Up to 2000 characters |
| `reporter_name`, `reporter_contact` | No | Up to 100 and 150 characters |
| `latitude`, `longitude` | No | Both or neither |
| `gps_accuracy_m` | No | Metres; needs coordinates |

**Success:** `201` for a new report, or `200` when this
`client_submission_id` was already saved (a double-click or retry):

    {
      "reference_number": "CITS-000019",
      "status": "pending_review",
      "classification": {"outcome": "unavailable"}
    }

When classification succeeds, `classification` also has `label`,
`confidence` and `low_confidence`. Reporter details are never returned.

**Errors:** `422` for invalid fields or a missing or second photo, `400`
for an unreadable image, `413` for a file that is too large, `415` for
another image type, and `503` when the database or Storage is unavailable.

**Photos** are re-encoded before storage, which removes metadata such as
GPS position. They go to a private bucket, and a failed save removes the
uploaded file.

**Reference numbers:** PostgreSQL never returns a sequence number, so a
failed or rolled-back insert leaves a gap. Gaps are expected.

## Staff: reading reports

For signed-in CENRO staff only. Each request needs
`Authorization: Bearer <Supabase access token>` for an account with an
**active** row in `citia.staff_profiles`. Without it the answer is 401
(not signed in) or 403 (not staff). None of these endpoints writes.

| Endpoint | Returns |
| --- | --- |
| `GET /staff/reports` | One page of reports, newest first, with the total. |
| `GET /staff/reports/{reference}` | One report in full, with its review history. |
| `GET /staff/reports/{reference}/photo` | The report's photo. |
| `GET /staff/dashboard` | Counts by status and study area, and the latest activity. |

`GET /staff/reports` options:

| Option | Values |
| --- | --- |
| `status` | `pending_review`, `verified`, `rejected` |
| `study_area` | `palao`, `dalipuga`, `npc` |
| `q` | Search text (up to 100 characters), matched against the reference number, barangay and landmark. |
| `has_location` | `true` returns only reports with coordinates. |
| `limit`, `offset` | Page size (1–200, default 25) and starting row. |

Personal details:

- The list and the dashboard never contain a reporter's name, contact or
  notes.
- `GET /staff/reports/{reference}` does. Each time it is used, the server
  log records the staff account and the reference number (never the
  details).
- The photo is fetched from the private bucket by the API and sent with
  `Cache-Control: private, no-store`, so the browser keeps no copy.

A report that does not exist is 404. If the database or storage cannot
be reached the answer is 503, never an empty list.

### Recording a review — `POST /staff/reports/{reference}/reviews`

```json
{ "decision": "rejected", "rejection_reason": "Not a Mahogany leaf.", "staff_notes": "Checked on site." }
```

- `decision` is `verified` or `rejected`. A rejection needs a
  `rejection_reason` (up to 1000 characters); a verification must not
  have one. `staff_notes` is optional (up to 2000 characters).
- The reviewer is the signed-in staff member. It cannot be named in the
  request; a request that tries is refused.
- A decision is **added** to the report's history and never changed or
  removed. The database then updates the report's status. A later
  decision is added on top, so the history shows both.
- The reply (201) is the report as it now stands, with its history.

## Dependencies

| File | Contains |
| --- | --- |
| `requirements.txt` | Packages the API imports directly, pinned exactly (`==`). |
| `requirements-dev.txt` | Test packages, pinned exactly. Also installs `requirements.txt`. |
| `constraints.txt` | Pins for two important indirect packages: Starlette and Pydantic. |

All other indirect packages are left unpinned so that fixes, such as
certificate updates, are still picked up.

**This is not a complete lock.** Direct dependencies and the selected
important indirect dependencies are pinned, but the remaining indirect
(transitive) dependencies are not, so a fresh install on another day may
receive newer versions of them. A complete lock file covering every
package will be introduced before deployment.

To upgrade a package: change its pin, reinstall with the setup command,
run the tests, and keep the change only if every test passes. New pins
should be releases at least two weeks old.

## Settings

All settings are read from `backend/.env` (git-ignored). See
`.env.example` for every option. Never commit real credentials.

## Security notes

- **Error responses** never include exception details, file paths, or
  submitted values. Only messages written for the public are returned
  (see `errors.py`).
- **Model weights** (`*.pt`, `*.pth`, `*.onnx`) and uploaded images are
  git-ignored and must never be committed.
- **Staff authentication.** Staff endpoints require a Supabase Auth
  access token (`Authorization: Bearer …`), sent only by the Next.js
  server. This API verifies the token's signature, expiry, issuer and
  audience, then checks the staff member's role and account status in
  `citia.staff_profiles` on every request. Roles are never read from
  the token itself. No shared API key is used.
  - Browsers cannot send the token to this API: CORS allows only the
    `Content-Type` request header, and the session cookies are httpOnly.
  - Never put Supabase keys or JWT secrets in `NEXT_PUBLIC_` variables.
