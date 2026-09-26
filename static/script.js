const form = document.getElementById("cafe-form");
const idField = document.getElementById("cafe-id");
const nameField = document.getElementById("cafe-name");
const cityField = document.getElementById("cafe-city");
const saveBtn = document.getElementById("save-btn");
const cancelBtn = document.getElementById("cancel-btn");
const formError = document.getElementById("form-error");

const loadingEl = document.getElementById("loading");
const tableEl = document.getElementById("cafe-table");
const tableBody = document.getElementById("cafe-table-body");
const emptyStateEl = document.getElementById("empty-state");
const toastContainer = document.getElementById("toast-container");

// In-memory cache of cafes, keyed by document id.
let cafesById = {};

// Ids we just changed ourselves, so we don't show a redundant toast when
// the corresponding Firestore snapshot event echoes back to this tab.
const recentlyChangedByMe = new Set();

function markAsMyChange(id) {
  recentlyChangedByMe.add(id);
  setTimeout(() => recentlyChangedByMe.delete(id), 4000);
}

// this function renders the table of cafes based on the current state of cafesById. It sorts the cafes by name, clears the table body, and creates a new row for each cafe with its name, city, and action buttons for editing and deleting. If there are no cafes, it shows an empty state message instead of the table.
function renderTable() {
  const cafes = Object.values(cafesById).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  loadingEl.classList.add("hidden");

  if (cafes.length === 0) {
    tableEl.classList.add("hidden");
    emptyStateEl.classList.remove("hidden");
    return;
  }

  emptyStateEl.classList.add("hidden");
  tableEl.classList.remove("hidden");

  tableBody.innerHTML = "";
  for (const cafe of cafes) {
    const tr = document.createElement("tr");
    tr.dataset.id = cafe.id;

    const nameTd = document.createElement("td");
    nameTd.textContent = cafe.name;

    const cityTd = document.createElement("td");
    cityTd.textContent = cafe.city;

    const actionsTd = document.createElement("td");
    actionsTd.className = "row-actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "edit-btn";
    editBtn.addEventListener("click", () => startEdit(cafe));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-btn";
    deleteBtn.addEventListener("click", () => deleteCafe(cafe.id, cafe.name));

    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(deleteBtn);

    tr.appendChild(nameTd);
    tr.appendChild(cityTd);
    tr.appendChild(actionsTd);
    tableBody.appendChild(tr);
  }
}

// This function shows a toast notification with the given message and optional kind (e.g., "added", "removed"). It creates a new div element, sets its class and text content, appends it to the toast container, and removes it after 3 seconds.
function showToast(message, kind) {
  const toast = document.createElement("div");
  toast.className = "toast" + (kind ? ` ${kind}` : "");
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// This function sets the error message for the form. If a message is provided, it displays the message and removes the "hidden" class from the form error element. If no message is provided, it clears the text content and adds the "hidden" class to hide the error message.
function setFormError(message) {
  if (message) {
    formError.textContent = message;
    formError.classList.remove("hidden");
  } else {
    formError.textContent = "";
    formError.classList.add("hidden");
  }
}

// This function is called when the user clicks the "Edit" button for a cafe. It populates the form fields with the cafe's data, changes the save button text to "Update", shows the cancel button, clears any form error messages, and focuses on the name field for editing.
function startEdit(cafe) {
  idField.value = cafe.id;
  nameField.value = cafe.name;
  cityField.value = cafe.city;
  saveBtn.textContent = "Update";
  cancelBtn.classList.remove("hidden");
  setFormError("");
  nameField.focus();
}

// This function resets the form to its initial state. It clears the id, name, and city fields, changes the save button text back to "Save", hides the cancel button, and clears any form error messages.
function resetForm() {
  idField.value = "";
  nameField.value = "";
  cityField.value = "";
  saveBtn.textContent = "Save";
  cancelBtn.classList.add("hidden");
  setFormError("");
}

cancelBtn.addEventListener("click", resetForm);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setFormError("");

  const name = nameField.value.trim();
  const city = cityField.value.trim();
  const id = idField.value;

  if (!name || !city) {
    setFormError("Please fill in both Name and City.");
    return;
  }

  const isUpdate = Boolean(id);
  const url = isUpdate ? `/api/cafes/${id}` : "/api/cafes";
  const method = isUpdate ? "PUT" : "POST";

  saveBtn.disabled = true;
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, city }),
    });
    const data = await res.json();

    if (!res.ok) {
      setFormError(data.error || "Something went wrong.");
      return;
    }

    // Update local cache immediately (the Socket.IO event will also arrive
    // and simply confirm the same data, which is harmless).
    cafesById[data.id] = { id: data.id, name: data.name, city: data.city };
    markAsMyChange(data.id);
    renderTable();
    resetForm();
  } catch (err) {
    setFormError("Network error: " + err.message);
  } finally {
    saveBtn.disabled = false;
  }
});

// This function is called when the user clicks the "Delete" button for a cafe. It asks for confirmation, then sends a DELETE request to the server. If successful, it removes the cafe from the local cache and updates the table. If the cafe being deleted is currently being edited, it resets the form.
async function deleteCafe(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;

  try {
    const res = await fetch(`/api/cafes/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Failed to delete cafe.", "removed");
      return;
    }

    markAsMyChange(id);
    delete cafesById[id];
    renderTable();

    // If we were editing this cafe when it got deleted, reset the form.
    if (idField.value === id) resetForm();
  } catch (err) {
    showToast("Network error: " + err.message, "removed");
  }
}

// This function fetches the list of cafes from the server and populates the local cache (cafesById). It then calls renderTable() to display the cafes. If there's an error during fetching, it displays an error message in the loading element.
async function loadCafes() {
  try {
    const res = await fetch("/api/cafes");
    const data = await res.json();
    cafesById = {};
    for (const cafe of data) {
      cafesById[cafe.id] = cafe;
    }
    renderTable();
  } catch (err) {
    loadingEl.textContent = "Failed to load cafes: " + err.message;
  }
}

// Real-time updates via Socket.IO
const socket = io();

socket.on("connect", () => {
  console.log("Connected to real-time server.");
});

socket.on("cafe_update", (payload) => {
  const { type, id, name, city } = payload;

  const isMine = recentlyChangedByMe.has(id);

  if (type === "ADDED") {
    cafesById[id] = { id, name, city };
    renderTable();
    if (!isMine) showToast(`Cafe "${name}" added`, "added");
  } else if (type === "MODIFIED") {
    cafesById[id] = { id, name, city };
    renderTable();
    if (!isMine) showToast(`Cafe "${name}" updated`);
  } else if (type === "REMOVED") {
    const existed = Boolean(cafesById[id]);
    delete cafesById[id];
    renderTable();
    if (existed && !isMine) showToast(`Cafe "${name}" deleted`, "removed");
  }
});

loadCafes();
