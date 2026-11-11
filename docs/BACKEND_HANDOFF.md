# CITIA-IS Backend Integration Handoff Prompt
## Stages 12–15: FastAPI, YOLOv8n-cls, PostgreSQL, and Frontend Integration

### Instructions for the coding agent

You are an experienced FastAPI, Python, YOLOv8, PostgreSQL, and Next.js integration developer helping me complete the backend for my undergraduate thesis system.

Work autonomously through the authorized implementation and verification steps. Inspect the smallest sufficient set of relevant files, avoid unnecessary repository exploration, and do not repeatedly read files without a reason.

Do not modify files immediately. First inspect the current project and produce a concise implementation assessment identifying prerequisites, risks, and the recommended sequence. Then implement in small, testable stages. Do not ask for approval between routine, safe steps already authorized by this prompt. If Antigravity requires explicit permission for a command, stop and tell me what to approve; never bypass permission controls.

---

## 1. Project overview

**Project title:** Community-Driven Mahogany Tree Identification and Recommendation Management Information System Using YOLOv8 (CITIA-IS).

**Academic context:** BS Information Systems thesis, MSU-IIT, Philippines.

**Stakeholder:** CENRO Iligan City.

CITIA-IS is a browser-based citizen science and administrative information system. Community users can use the identification feature without creating an account, submit a Mahogany sighting report, and provide relevant photographs and location information. Authorized CENRO staff review submitted reports through the administrative portal.

The frontend uses Next.js, React, TypeScript, Tailwind CSS, and existing UI components. The admin portal includes:

- Dashboard and demonstration statistics.
- Reports Queue and individual Report Details pages.
- Photo documentation and CENRO review controls.
- Environmental Monitoring map.
- Species and Management Recommendations section, currently being developed.

The existing admin report records and review decisions are still demonstration data. Review decisions currently use `sessionStorage`, not PostgreSQL.

**Primary objective:** Replace the mocked AI classification and demonstration-only report persistence with a tested backend architecture while preserving the existing frontend and security model.

Do not rebuild the frontend from scratch.

## 2. Exact AI classification specification

Use YOLOv8 in classification mode, specifically YOLOv8n-cls, through the Ultralytics Python package.

The model must have exactly these three output classes:

1. `Mahogany` — the target species, *Swietenia macrophylla*.
2. `Non-Mahogany` — other tree or plant leaf images that are not classified as Mahogany.
3. `Non-Tree` — images that do not represent the intended tree/leaf subject, such as unrelated objects.

Do not add additional tree species as model classes. Do not turn CITIA-IS into a general-purpose tree species identification system.

### Important classification limitations

- `Non-Mahogany` does not mean “non-invasive.” It means the image was not classified as Mahogany.
- A predicted `Mahogany` result is not definitive scientific identification and does not establish that a particular tree is legally subject to removal.
- A conventional classifier chooses among its trained classes. If an image is unclear or confidence is insufficient, the application should request a clearer image or indicate that the result requires review, rather than treating uncertainty as proof of `Non-Tree`.
- Confidence scores are model outputs, not guarantees of correctness.

The model response contract is:

    {
      "label": "Mahogany",
      "confidence": 94.8
    }

`label` must be one of the three exact strings. `confidence` must be a finite numeric percentage from 0 to 100, rounded to one decimal place.

### Model weights prerequisite

The intended model path is:

    backend/models/mahogany_cls.pt

The trained weights must be produced from the project's actual training dataset. Do not invent a model file, fabricate predictions, or silently substitute a pretrained model that has not been trained for these three classes.

Before enabling inference, verify that:

- The model file exists and can be loaded.
- Its class names and index order match the required three classes.
- The trained model is the expected classification architecture.
- A real test image can be processed successfully.

If the weights are not available, implement and test the backend structure as far as possible, but report that real inference is blocked. Never claim that real AI inference is working until it has been tested with the actual trained weights.

## 3. Stage 12 — FastAPI backend foundation

Create a dedicated `backend/` directory without disrupting the existing Next.js application.

Suggested initial structure:

    backend/
    ├── main.py
    ├── classifier.py
    ├── config.py
    ├── database.py
    ├── models/
    │   └── mahogany_cls.pt
    ├── uploads/
    ├── requirements.txt
    ├── .env.example
    └── tests/

The trained model weights and private environment files must not be committed to source control. Add appropriate ignore rules only after inspecting the existing `.gitignore`.

Use a suitable, maintainable PostgreSQL integration approach. Keep database configuration, model loading, inference logic, API routing, and persistence logic separate where practical.

Suggested dependencies include:

- FastAPI
- Uvicorn
- Ultralytics
- Pillow
- python-multipart
- A PostgreSQL driver and database access library
- A migration tool if needed for reliable schema changes

Choose compatible dependency versions and document them. Avoid installing unnecessary packages.

### Required endpoints

**`GET /health`**

Provides a basic liveness check and, where practical, indicates whether the model is ready for inference.

Do not report inference readiness if the required model weights have not loaded.

**`POST /classify`**

Accepts one uploaded image using `multipart/form-data` and returns the three-class prediction contract.

The inference model must be loaded once during application startup, not once per request. Use the framework's supported application lifespan mechanism where appropriate.

### Input validation and security

- Accept supported JPEG and PNG images.
- Validate actual image decoding and content, not just the client-supplied MIME type.
- Apply a configurable maximum upload size.
- Handle corrupted, empty, oversized, and unsupported files.
- Limit image dimensions or decoded pixel counts to reduce resource-exhaustion risks.
- Normalize valid images to RGB before inference.
- Return appropriate HTTP errors without exposing internal paths, stack traces, or sensitive exception details.
- Do not permanently save classification uploads unless required by the application's explicitly defined data-retention policy.
- Do not log uploaded image contents or unnecessary personal information.

Use structured, consistent error responses.

## 4. Stage 13 — Connect real inference to the frontend

### Existing frontend file

    components/identify/camera-scanner.tsx

Inspect the current implementation before editing. Locate the mock classification function and the actual scan handler rather than assuming the file has not changed.

Replace the random mock result with a real request to the FastAPI `/classify` endpoint.

Requirements:

- Preserve the existing scanner UI, camera/file upload functionality, and status transitions.
- Retain the original `File` object for upload; a blob URL alone is not the original image.
- Send the file with `FormData`.
- Do not manually set the multipart `Content-Type` header; let the browser generate the boundary.
- Validate the API response before using it as a `ClassificationResult`.
- Handle loading, success, invalid image, network failure, unavailable backend, and server error states.
- Allow the user to retry a failed request.
- Prevent duplicate submissions while inference is running.
- Remove the random mock inference from the production path. If a development mock is retained, make it explicitly opt-in and visibly label its results as simulated.

Use a configurable API base URL rather than hardcoding `localhost:8000` throughout the application.

For example, the frontend may use:

    NEXT_PUBLIC_API_URL=http://localhost:8000

For production, configure the actual deployment URL. Do not invent a production domain.

CORS must allow only the necessary frontend origins. Use explicit configuration for development and production. Do not use unrestricted origins as a shortcut.

Document how to start the backend and frontend independently.

## 5. Stage 14 — PostgreSQL sighting report persistence

The current report form does not persist reports to a database. Replace the demonstration-only submission behavior with real persistence.

Inspect the existing report form, scanner, location helpers, and report data model before designing the API. Reuse existing field names and user-facing terminology where appropriate.

### Suggested minimum database fields

The final schema should support:

- Stable report ID and human-readable report reference.
- Submission timestamp with consistent timezone handling.
- AI label and confidence, when classification has occurred.
- Optional latitude, longitude, and GPS accuracy.
- Study area, barangay, and landmark where supplied.
- Observation type and community notes.
- Optional reporter information, collected only when necessary.
- Image storage reference and metadata.
- Review status.
- CENRO review notes.
- Reviewing staff identifier and review timestamp.

The initial review statuses should be consistent with the existing application, such as:

- `pending_review`
- `verified`
- `rejected`

Define explicit mappings if the frontend currently uses display labels such as “Pending,” “Verified,” and “Rejected.” Do not let inconsistent strings silently spread across the application.

Use appropriate database constraints, indexes, and migrations. GPS coordinates must be nullable and validated for legal latitude and longitude ranges.

### Image handling

Prefer storing uploaded images in a controlled file/object storage location and keeping their storage references in PostgreSQL. Do not store raw image blobs or large base64 strings in report rows unless there is a documented architectural reason.

Use generated filenames rather than trusting user-supplied filenames. Validate image content, restrict file size, and prevent path traversal.

Do not expose private filesystem paths to the browser. Provide a safe way to retrieve report images, with access controls appropriate to whether the image is public or staff-only.

### Report submission API

Implement an endpoint such as:

    POST /reports

The request contract must be based on the existing report form and should support the necessary report metadata and image upload.

Prefer `multipart/form-data` when the request includes a photo, rather than embedding the entire image in JSON as base64.

The successful response should include the created report's ID/reference and review status, for example:

    {
      "report_id": "SGT-0231",
      "status": "pending_review"
    }

This example illustrates the response shape; do not hardcode the ID.

### Trust and validation

Do not blindly trust an AI label or confidence score supplied by the browser. Establish a clear relationship between the submitted image and the classification result. For the most reliable design, associate the result with the exact image that was classified, or perform/revalidate inference on the submitted image when appropriate.

Validate user-provided fields server-side. Guest report submission must not allow a public user to set a report to `verified` or `rejected`, choose a reviewing staff identity, or submit administrative notes.

Avoid collecting unnecessary personal information. Reporter name and contact details should remain optional unless the approved thesis requirements explicitly say otherwise.

### Frontend integration

Update the report form so it:

- Submits the actual report and associated image.
- Displays a success message only after the server confirms persistence.
- Shows meaningful validation and network errors.
- Prevents accidental duplicate submissions.
- Preserves the user's entered data after a recoverable failure.
- Handles the absence of a scanner result according to the approved reporting workflow.

The AI result may be passed between frontend pages using the existing session-storage mechanism, but session storage is only a client-side convenience—not a trusted record of the result.

## 6. Stage 15 — Connect the administrative portal to real reports

The current admin dashboard, Reports Queue, Report Details, and Environmental Monitoring map use demonstration data. Replace these demo sources progressively with backend-backed data after the relevant APIs and database schema are verified.

Provide the API operations needed to:

- List reports with pagination, search, status filtering, and study-area filtering.
- Retrieve one report with its metadata and associated image references.
- Record a CENRO review decision with notes and timestamps.
- Retrieve reports with valid coordinates for the monitoring map.
- Return summary statistics and recent activity based on persisted records, where required.

Keep response contracts consistent with the frontend TypeScript types.

### Administrative security

The community reporting workflow may allow guest submissions, but administrative report listing, report details, and review decisions must be restricted to authorized staff.

The current frontend has a server-side staff-session mechanism. Inspect its implementation before deciding how the FastAPI service will trust administrative requests.

Do not assume that a browser request is authorized merely because it comes from the admin page. Do not expose administrative credentials or session secrets in client-side JavaScript.

Choose and document an appropriate integration pattern, such as authenticated Next.js server-side proxy routes or another securely validated server-to-server mechanism. Do not duplicate or weaken the existing authentication system.

Review decisions must be validated server-side and recorded consistently. Where practical, preserve an audit trail of administrative changes.

### Monitoring map data integrity

- Plot reports only when valid coordinates exist.
- Keep reports without coordinates accessible in the report list.
- Never invent or randomize coordinates to populate the map.
- Preserve the distinction between demonstration coordinates and verified observations until real records replace them.
- Keep map filters and report selection synchronized with actual report IDs.

### Dashboard integrity

Calculate totals, pending reviews, verified reports, rejected reports, and recent activity from real persisted records once the integration is complete.

Do not mix demo records with real records without clearly distinguishing them. If no reports exist, show zero counts and appropriate empty states rather than hardcoded sample values.

## 7. Frontend-to-backend data contract

Use a consistent shared contract for the three classification labels:

    type ClassificationLabel =
      | "Mahogany"
      | "Non-Mahogany"
      | "Non-Tree";

    interface ClassificationResult {
      label: ClassificationLabel;
      confidence: number;
    }

The backend must enforce the same allowed labels independently. Validate numeric confidence values and reject invalid or non-finite values.

Keep the AI classification result separate from the CENRO review status. A classification result is an AI prediction; a review status is an administrative decision.

Do not use “Non-Mahogany” and “Non-Invasive” interchangeably. Do not claim that the system can identify the exact species of every non-Mahogany tree.

## 8. Testing and verification

Implement tests alongside the features, not only at the end.

### Backend tests

Test:

- Health and model readiness.
- Valid image upload.
- Unsupported MIME type and invalid image content.
- Empty and oversized uploads.
- Missing or invalid model weights.
- Model output class mapping.
- Invalid classification output.
- Database connection failures.
- Successful report creation and persistence.
- Input validation and duplicate-submission handling where applicable.
- Public access restrictions for administrative endpoints.
- Authorized and unauthorized review decisions.
- Reports with and without GPS coordinates.

Use a mock classifier for isolated unit tests if the actual trained model is unavailable, but clearly label these as mock-based tests. Do not use mock predictions to claim real inference has been verified.

### Frontend tests and checks

Run:

    npx tsc --noEmit

Run ESLint on changed frontend files and the relevant backend test suite.

Run:

    npm run build

Also verify the integration manually when the required services are available:

1. Start FastAPI and confirm its health endpoint.
2. Test classification with real sample images and the actual trained weights.
3. Scan a Mahogany image and verify the real response appears.
4. Test Non-Mahogany and Non-Tree images.
5. Submit a sighting and confirm the database record and image reference are saved.
6. Open the report in the admin portal and verify its details and image.
7. Review a report and confirm the change persists after refresh and a new session.
8. Verify that the monitoring map plots only reports with valid coordinates.
9. Confirm that unauthenticated users cannot access administrative operations.

If required model weights, PostgreSQL credentials, external services, or permissions are unavailable, complete the tests that can be run and report the remaining blockers honestly.

## 9. Autonomous execution and repository safety

- Inspect only the files necessary for each stage.
- Do not recursively read every project file or repeatedly rediscover completed work.
- Make targeted, maintainable changes.
- Preserve existing uncommitted work.
- Do not modify unrelated landing-page or UI components.
- Do not modify secrets, `.env.local`, or credentials without explicit authorization.
- Provide `.env.example` with placeholder values only.
- Do not bypass permission prompts.
- Do not commit, push, or run destructive Git operations.
- Run verification commands yourself, wait for completion, and inspect their actual results.
- Fix errors introduced by your changes; distinguish them from pre-existing issues.
- If an architectural decision would materially expand the scope or risk the existing system, explain the issue and stop before making that change.

## 10. Final handoff report

At the end of each stage, provide a concise report with:

1. Features implemented.
2. Files created or modified.
3. API endpoints and their request/response contracts.
4. Database schema and migration status, where applicable.
5. Whether actual model weights were available and real inference was tested.
6. Tests and commands run, with actual results.
7. Security considerations and remaining limitations.
8. The next recommended stage.

Never claim the backend, database, model inference, or frontend integration is operational unless it has actually been tested.

### Start here

Begin with a focused read-only inspection of the existing scanner, report form, session/location helpers, report data model, administrative session mechanism, and project configuration.

Return a concise readiness assessment, identify missing prerequisites—especially the trained model weights and PostgreSQL configuration—and propose the smallest safe implementation sequence.

Do not begin by rewriting the entire frontend or backend.