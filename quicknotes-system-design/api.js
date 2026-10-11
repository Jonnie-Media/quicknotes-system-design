const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.getElementById("load-btn");
const statusElement = document.getElementById("status");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitButton = document.getElementById("submit-btn");
const notesList = document.getElementById("notes-list");

const activeRequests = new Set();
const deletingIds = new Set();

function setStatus(message, kind = "info") {
  statusElement.textContent = message;
  statusElement.className = `status ${kind}`;
}

function setRequestActive(name, active) {
  if (active) activeRequests.add(name);
  else activeRequests.delete(name);
  loadButton.disabled = activeRequests.has("load");
  submitButton.disabled = activeRequests.has("create");
  // Each delete button is disabled only while its own note is being deleted.
  notesList.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.disabled = deletingIds.has(button.dataset.deleteId);
  });
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const error = new Error(`The server returned HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }

  // JSONPlaceholder returns an empty body for DELETE; don't try to parse it.
  if (response.status === 204 || options.method === "DELETE") {
    return { data: null, status: response.status };
  }

  const data = await response.json();
  return { data, status: response.status };
}

function renderEmptyState(message = "No notes yet. Load notes or create your first note.") {
  notesList.replaceChildren();
  const item = document.createElement("li");
  item.className = "empty-state";
  item.textContent = message;
  notesList.appendChild(item);
}

function renderNote(note, prepend = false) {
  // Build elements and assign all user/server-provided text with textContent.
  // Never use innerHTML for note data.
  const item = document.createElement("li");
  item.className = "note-card";
  item.dataset.noteId = String(note.id);

  const title = document.createElement("h3");
  title.textContent = note.title || "(Untitled note)";
  const body = document.createElement("p");
  body.textContent = note.body || "";
  const meta = document.createElement("div");
  meta.className = "note-meta";
  meta.textContent = `Note ID: ${note.id}`;

  const actions = document.createElement("div");
  actions.className = "note-actions";
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-btn";
  deleteButton.textContent = "Delete";
  deleteButton.dataset.deleteId = String(note.id);
  deleteButton.setAttribute("aria-label", `Delete note ${note.id}`);
  deleteButton.addEventListener("click", () => deleteNote(note.id, item, deleteButton));
  actions.appendChild(deleteButton);

  item.append(title, body, meta, actions);

  const currentEmpty = notesList.querySelector(".empty-state");
  if (currentEmpty) currentEmpty.remove();
  if (prepend) notesList.prepend(item);
  else notesList.appendChild(item);
}

async function loadNotes() {
  setRequestActive("load", true);
  setStatus("Loading notes...", "loading");
  try {
    const { data } = await request(`${API_URL}?_limit=10`);
    notesList.replaceChildren();
    if (!Array.isArray(data) || data.length === 0) {
      renderEmptyState("No notes were found. Create a note to get started.");
      setStatus("No notes found.", "info");
      return;
    }
    data.forEach((note) => renderNote(note));
    setStatus(`Loaded ${data.length} notes from the server.`, "success");
  } catch (error) {
    setStatus(
      error.status
        ? `Could not load notes (HTTP ${error.status}). Please try again.`
        : "Could not connect to the server. Check your internet connection and try again.",
      "error"
    );
    if (notesList.children.length === 0) renderEmptyState("Notes could not be loaded. Please try again.");
  } finally {
    setRequestActive("load", false);
  }
}

async function createNote(event) {
  event.preventDefault();
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title) {
    setStatus("Please enter a title before creating a note.", "error");
    titleInput.focus();
    return;
  }
  if (title.length > 100) {
    setStatus("The title must be 100 characters or fewer.", "error");
    titleInput.focus();
    return;
  }

  setRequestActive("create", true);
  setStatus("Creating note...", "loading");
  try {
    const { data, status } = await request(API_URL, {
      method: "POST",
      body: JSON.stringify({ title, body, userId: 1 })
    });
    // JSONPlaceholder simulates POST and returns an ID (usually 101), but does
    // not persist the new post. We show it in this page's list for this session.
    renderNote(data, true);
    setStatus(`Note created (status ${status}, id ${data.id}).`, "success");
    noteForm.reset();
  } catch (error) {
    setStatus(
      error.status
        ? `Could not create the note (HTTP ${error.status}). Please try again.`
        : "Could not connect to the server. Your note was not created.",
      "error"
    );
  } finally {
    setRequestActive("create", false);
  }
}

async function deleteNote(id, item, button) {
  const idString = String(id);
  if (deletingIds.has(idString)) return;
  deletingIds.add(idString);
  button.disabled = true;
  setStatus(`Deleting note ${id}...`, "loading");
  try {
    await request(`${API_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
    item.remove();
    if (notesList.children.length === 0) {
      renderEmptyState("No notes left. Load notes or create a new note.");
    }
    setStatus(`Note ${id} deleted.`, "success");
  } catch (error) {
    setStatus(
      error.status
        ? `Could not delete note ${id} (HTTP ${error.status}). Please try again.`
        : "Could not connect to the server. The note was not deleted.",
      "error"
    );
    button.disabled = false;
  } finally {
    deletingIds.delete(idString);
    setRequestActive("delete", false);
  }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);
