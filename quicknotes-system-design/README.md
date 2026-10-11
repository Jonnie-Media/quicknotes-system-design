# QuickNotes System Design

QuickNotes is a small browser API client plus system-design documents for a proposed notes service that can grow to support one million users. The client uses the public JSONPlaceholder practice API to demonstrate GET, POST, and DELETE. The documents describe a separate, production-ready API and architecture.

## Project files

- `index.html` — accessible HTML5 page with load and create controls.
- `style.css` — responsive styling and distinct success/error states.
- `api.js` — reusable fetch wrapper, GET/POST/DELETE requests, validation, status messages, and safe DOM rendering.
- [`docs/api-design.md`](docs/api-design.md) — REST endpoints, JSON examples, status codes, and error contract.
- [`docs/data-model.md`](docs/data-model.md) — relational schema, relationships, SQL examples, indexes, and database choice.
- [`docs/architecture.md`](docs/architecture.md) — requirements, scale estimates, architecture diagram, request flows, trade-offs, and resilience.

## Run the API client

1. Download or clone this repository.
2. Open the project folder in a terminal.
3. Start a local static server, for example with Python:

   ```bash
   python -m http.server 8000
   ```

4. Open `http://localhost:8000` in your browser.
5. Click **Load notes** or submit the create-note form. An internet connection is required because the practice API is remote.

You can also use the VS Code Live Server extension. Opening `index.html` directly may work, but a local server is the more consistent option.

## Important practice API limitation

JSONPlaceholder is a fake REST API. GET returns sample posts; POST and DELETE simulate successful server responses but do not persist changes on the remote service. A created note is therefore added to the current browser page for the session, and a deleted note is removed from the current page after the simulated success response. Reloading the sample notes can restore the original fixture data. Do not enter private or sensitive notes.

## What I learned

- How to structure a reusable `fetch` request helper and handle HTTP failures separately from network failures.
- How to represent loading, success, error, and empty states while disabling controls during requests.
- Why DOM text should be inserted with `textContent` rather than `innerHTML` when displaying server data.
- How REST methods and status codes communicate intent and outcomes to clients.
- How primary/foreign keys, indexes, joins, caches, replicas, queues, and app-server redundancy support a growing service.

## Git history and submission

Make the following meaningful commits in order (one after each task is completed and checked):

1. `Add API client with GET`
2. `Add create note with POST`
3. `Add delete with DELETE`
4. `Add API design doc`
5. `Add data model doc`
6. `Add architecture doc`
7. `Add README`

Push the `main` branch to your public GitHub repository and submit its URL. The Day 8 presentation is separate from this repository submission.
