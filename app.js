const ADMIN_KEY = "102938";
const STORAGE_KEY = "anonymous-mailbox-data";
const SEEN_KEY = "anonymous-mailbox-last-seen";
const SESSION_KEY = "anonymous-mailbox-session";
const USE_SHARED_API = location.protocol !== "file:";

const classmates = [
  "\u661f\u661f",
  "\u4e91\u6735",
  "\u6a58\u5b50",
  "\u8584\u8377",
  "\u6d77\u76d0",
  "\u6708\u4eae",
  "\u677e\u679c",
  "\u98ce\u94c3",
  "\u5c0f\u9e7f",
  "\u67e0\u6aac",
  "\u82b1\u706b",
  "\u5c71\u8336",
];

const state = {
  data: {
    questions: [],
  },
  lastSeenQuestionId: loadLastSeen(),
  session: loadSession(),
  pendingImage: "",
};

const homeScreen = document.querySelector("#homeScreen");
const questionsScreen = document.querySelector("#questionsScreen");
const openMailbox = document.querySelector("#openMailbox");
const backHome = document.querySelector("#backHome");
const questionGrid = document.querySelector("#questionGrid");
const emptyState = document.querySelector("#emptyState");
const addQuestion = document.querySelector("#addQuestion");
const composeModal = document.querySelector("#composeModal");
const composeForm = document.querySelector("#composeForm");
const questionText = document.querySelector("#questionText");
const questionImage = document.querySelector("#questionImage");
const imagePreview = document.querySelector("#imagePreview");
const composeError = document.querySelector("#composeError");
const nicknameLine = document.querySelector("#nicknameLine");
const currentName = document.querySelector("#currentName");
const logoutAdmin = document.querySelector("#logoutAdmin");
const newDot = document.querySelector("#newDot");
const adminEntry = document.querySelector("#adminEntry");
const adminModal = document.querySelector("#adminModal");
const adminForm = document.querySelector("#adminForm");
const adminKey = document.querySelector("#adminKey");
const adminError = document.querySelector("#adminError");

initialize();

async function initialize() {
  nicknameLine.textContent = `\u4f60\u4eca\u5929\u7684\u540d\u5b57\u662f\uff1a${getDisplayName()}`;
  updateCurrentName();
  registerEvents();
  await refreshQuestions();
}

function registerEvents() {
  openMailbox.addEventListener("click", showQuestions);
  backHome.addEventListener("click", showHome);
  addQuestion.addEventListener("click", openCompose);
  composeForm.addEventListener("submit", submitQuestion);
  questionImage.addEventListener("change", previewImage);
  questionGrid.addEventListener("submit", submitComment);
  questionGrid.addEventListener("click", handleQuestionClick);
  adminEntry.addEventListener("click", openAdmin);
  adminForm.addEventListener("submit", submitAdmin);
  logoutAdmin.addEventListener("click", exitAdmin);
}

async function refreshQuestions() {
  state.data = await loadData();
  renderQuestions();
  updateNewDot();
}

async function loadData() {
  const fallback = {
    questions: [],
  };

  if (USE_SHARED_API) {
    try {
      const response = await fetch("/api/questions");
      if (!response.ok) {
        throw new Error("Failed to load questions");
      }
      return { ...fallback, ...(await response.json()) };
    } catch {
      return fallback;
    }
  }

  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return fallback;
  }
}

function loadLastSeen() {
  return localStorage.getItem(SEEN_KEY);
}

function saveLastSeen() {
  if (state.lastSeenQuestionId) {
    localStorage.setItem(SEEN_KEY, state.lastSeenQuestionId);
  } else {
    localStorage.removeItem(SEEN_KEY);
  }
}

function loadSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (saved?.nickname) {
      return saved;
    }
  } catch {
    // Session will be recreated below.
  }

  const nickname = `${classmates[Math.floor(Math.random() * classmates.length)]}\u540c\u5b66`;
  const session = {
    nickname,
    isAdmin: false,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

async function saveData() {
  if (!USE_SHARED_API) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  }
}

function saveSession() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
}

function getDisplayName() {
  return state.session.isAdmin ? "\u7ba1\u7406\u5458" : state.session.nickname;
}

function updateCurrentName() {
  currentName.textContent = `\u5f53\u524d\u8eab\u4efd\uff1a${getDisplayName()}`;
  logoutAdmin.classList.toggle("visible", state.session.isAdmin);
  nicknameLine.textContent = state.session.isAdmin
    ? "\u4f60\u5df2\u8fdb\u5165\u7ba1\u7406\u5458\u6a21\u5f0f\u3002"
    : `\u4f60\u4eca\u5929\u7684\u540d\u5b57\u662f\uff1a${state.session.nickname}`;
}

async function showQuestions() {
  homeScreen.classList.remove("active");
  questionsScreen.classList.add("active");
  await refreshQuestions();
  markQuestionsSeen();
}

function showHome() {
  questionsScreen.classList.remove("active");
  homeScreen.classList.add("active");
  updateNewDot();
}

function markQuestionsSeen() {
  const newest = state.data.questions[0];
  state.lastSeenQuestionId = newest?.id ?? null;
  saveLastSeen();
  updateNewDot();
}

function updateNewDot() {
  const newest = state.data.questions[0];
  const hasNew = Boolean(newest && newest.id !== state.lastSeenQuestionId);
  newDot.classList.toggle("visible", hasNew);
}

function renderQuestions() {
  questionGrid.innerHTML = "";
  emptyState.classList.toggle("visible", state.data.questions.length === 0);

  state.data.questions.forEach((question) => {
    const card = document.createElement("article");
    card.className = "question-card";
    card.dataset.id = question.id;

    card.innerHTML = `
      <div class="question-meta">${escapeHtml(question.author)} · ${formatTime(question.createdAt)}</div>
      ${question.text ? `<p class="question-text">${escapeHtml(question.text)}</p>` : ""}
      ${question.image ? `<img class="question-image" src="${question.image}" alt="\u533f\u540d\u95ee\u9898\u56fe\u7247" />` : ""}
      <div class="card-actions">
        ${
          state.session.isAdmin
            ? `<button class="delete-button" type="button" data-delete="${question.id}">\u5220\u9664\u95ee\u9898</button>`
            : ""
        }
      </div>
      <div class="comments">
        ${question.comments.map(renderComment).join("")}
      </div>
      <form class="comment-form" data-question-id="${question.id}">
        <input name="comment" maxlength="160" autocomplete="off" placeholder="\u533f\u540d\u8bc4\u8bba\u4e00\u4e0b..." />
        <button class="send-comment" type="submit">\u53d1\u5e03</button>
      </form>
    `;

    questionGrid.appendChild(card);
  });
}

function renderComment(comment) {
  return `
    <div class="comment">
      <div class="comment-meta">${escapeHtml(comment.author)} · ${formatTime(comment.createdAt)}</div>
      <p>${escapeHtml(comment.text)}</p>
    </div>
  `;
}

function openCompose() {
  resetCompose();
  composeModal.showModal();
}

function resetCompose() {
  composeForm.reset();
  state.pendingImage = "";
  composeError.textContent = "";
  imagePreview.removeAttribute("src");
  imagePreview.classList.remove("visible");
}

function previewImage() {
  const file = questionImage.files?.[0];
  state.pendingImage = "";
  imagePreview.classList.remove("visible");
  imagePreview.removeAttribute("src");

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    composeError.textContent = "\u8bf7\u9009\u62e9\u56fe\u7247\u6587\u4ef6\u3002";
    questionImage.value = "";
    return;
  }

  if (file.size > 900 * 1024) {
    composeError.textContent = "\u56fe\u7247\u6700\u597d\u5c0f\u4e8e 900KB\uff0c\u65b9\u4fbf\u5927\u5bb6\u5728\u5fae\u4fe1\u91cc\u6253\u5f00\u3002";
    questionImage.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.pendingImage = String(reader.result);
    imagePreview.src = state.pendingImage;
    imagePreview.classList.add("visible");
    composeError.textContent = "";
  });
  reader.readAsDataURL(file);
}

async function submitQuestion(event) {
  event.preventDefault();

  const text = questionText.value.trim();
  if (!text && !state.pendingImage) {
    composeError.textContent = "\u6587\u5b57\u548c\u56fe\u7247\u81f3\u5c11\u586b\u4e00\u4e2a\u3002";
    return;
  }

  const question = {
    author: state.session.nickname,
    text,
    image: state.pendingImage,
  };

  if (USE_SHARED_API) {
    await fetchJson("/api/questions", {
      method: "POST",
      body: question,
    });
    await refreshQuestions();
  } else {
    state.data.questions.unshift({
      id: crypto.randomUUID(),
      ...question,
      comments: [],
      createdAt: Date.now(),
    });
    await saveData();
    renderQuestions();
  }

  state.lastSeenQuestionId = null;
  saveLastSeen();
  updateNewDot();
  composeModal.close();
}

async function submitComment(event) {
  if (!event.target.matches(".comment-form")) {
    return;
  }

  event.preventDefault();
  const questionId = event.target.dataset.questionId;
  const input = event.target.elements.comment;
  const text = input.value.trim();

  if (!text) {
    return;
  }

  if (USE_SHARED_API) {
    await fetchJson(`/api/questions/${questionId}/comments`, {
      method: "POST",
      body: {
        author: getDisplayName(),
        text,
      },
    });
    input.value = "";
    await refreshQuestions();
    return;
  }

  const question = state.data.questions.find((item) => item.id === questionId);
  if (!question) {
    return;
  }

  question.comments.push({
    id: crypto.randomUUID(),
    author: getDisplayName(),
    text,
    createdAt: Date.now(),
  });

  input.value = "";
  await saveData();
  renderQuestions();
}

async function handleQuestionClick(event) {
  const deleteId = event.target.dataset.delete;
  if (!deleteId || !state.session.isAdmin) {
    return;
  }

  if (USE_SHARED_API) {
    await fetchJson(`/api/questions/${deleteId}`, {
      method: "DELETE",
      admin: true,
    });
    await refreshQuestions();
  } else {
    state.data.questions = state.data.questions.filter((question) => question.id !== deleteId);
    await saveData();
    renderQuestions();
  }

  updateNewDot();
}

function openAdmin() {
  adminForm.reset();
  adminError.textContent = "";
  adminModal.showModal();
  adminKey.focus();
}

function submitAdmin(event) {
  event.preventDefault();
  if (adminKey.value !== ADMIN_KEY) {
    adminError.textContent = "\u5bc6\u94a5\u4e0d\u6b63\u786e\u3002";
    return;
  }

  state.session.isAdmin = true;
  saveSession();
  updateCurrentName();
  renderQuestions();
  adminModal.close();
}

function exitAdmin() {
  state.session.isAdmin = false;
  saveSession();
  updateCurrentName();
  renderQuestions();
}

async function fetchJson(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (options.admin) {
    headers["x-admin-key"] = ADMIN_KEY;
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error("Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return replacements[character];
  });
}
