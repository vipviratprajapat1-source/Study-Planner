const storageKeys = {
  subjects: "studyPlannerSubjects",
  tasks: "studyPlannerTasks",
  timetable: "studyPlannerTimetable",
  notes: "studyPlannerNotes",
  theme: "studyPlannerTheme",
  exam: "studyPlannerExam"
};

const subjectForm = document.getElementById("subjectForm");
const subjectInput = document.getElementById("subjectInput");
const subjectList = document.getElementById("subjectList");
const subjectCount = document.getElementById("subjectCount");

const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDeadline = document.getElementById("taskDeadline");
const taskPriority = document.getElementById("taskPriority");
const taskList = document.getElementById("taskList");
const taskCount = document.getElementById("taskCount");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const completionRate = document.getElementById("completionRate");

const timetableForm = document.getElementById("timetableForm");
const scheduleHour = document.getElementById("scheduleHour");
const scheduleTask = document.getElementById("scheduleTask");
const timetableList = document.getElementById("timetableList");

const examForm = document.getElementById("examForm");
const examName = document.getElementById("examName");
const examDate = document.getElementById("examDate");
const examDisplayName = document.getElementById("examDisplayName");
const countdownText = document.getElementById("countdownText");

const notesArea = document.getElementById("notesArea");
const saveNotes = document.getElementById("saveNotes");

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");

const pomodoroTime = document.getElementById("pomodoroTime");
const pomodoroMode = document.getElementById("pomodoroMode");
const startPomodoro = document.getElementById("startPomodoro");
const pausePomodoro = document.getElementById("pausePomodoro");
const resetPomodoro = document.getElementById("resetPomodoro");

const todayDate = document.getElementById("todayDate");
const welcomeMessage = document.getElementById("welcomeMessage");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");

let subjects = getSavedData(storageKeys.subjects, []);
let tasks = getSavedData(storageKeys.tasks, []);
let timetable = getSavedData(storageKeys.timetable, []);
let exam = getSavedData(storageKeys.exam, null);

let pomodoroInterval = null;
let pomodoroState = {
  isRunning: false,
  isBreak: false,
  timeLeft: 25 * 60
};

// Read JSON data safely from localStorage and fall back when empty.
function getSavedData(key, fallback) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}

// Keep all writes to localStorage consistent in one helper.
function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function updateDateAndGreeting() {
  const now = new Date();
  todayDate.textContent = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const hour = now.getHours();
  if (hour < 12) {
    welcomeMessage.textContent = "Good morning. Let's build momentum.";
  } else if (hour < 18) {
    welcomeMessage.textContent = "Good afternoon. Keep your focus sharp.";
  } else {
    welcomeMessage.textContent = "Good evening. Finish the day strong.";
  }
}

// Rebuild the subject list whenever data changes.
function renderSubjects() {
  subjectList.innerHTML = "";
  subjectCount.textContent = subjects.length;

  if (!subjects.length) {
    subjectList.innerHTML = '<li class="empty-state">No subjects added yet.</li>';
    return;
  }

  subjects.forEach((subject) => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML = `
      <div class="item-main">
        <strong>${subject.name}</strong>
        <span class="item-meta">Added to your study list</span>
      </div>
      <button class="icon-button" aria-label="Delete subject" data-id="${subject.id}">🗑️</button>
    `;
    subjectList.appendChild(li);
  });
}

// Render tasks sorted by nearest deadline and refresh progress.
function renderTasks() {
  taskList.innerHTML = "";
  taskCount.textContent = tasks.length;

  if (!tasks.length) {
    taskList.innerHTML = '<li class="empty-state">No study tasks yet. Add your first one.</li>';
    updateProgress();
    return;
  }

  tasks
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .forEach((task) => {
      const li = document.createElement("li");
      li.className = "list-item";
      li.innerHTML = `
        <div class="item-main ${task.completed ? "task-complete" : ""}">
          <strong>${task.title}</strong>
          <div class="item-meta">
            <span>Deadline: ${formatDate(task.deadline)}</span>
            <span class="badge ${task.priority.toLowerCase()}">${task.priority}</span>
          </div>
        </div>
        <div class="task-status">
          <label>
            <input type="checkbox" data-id="${task.id}" ${task.completed ? "checked" : ""}>
            Done
          </label>
          <button class="icon-button" aria-label="Delete task" data-delete-id="${task.id}">🗑️</button>
        </div>
      `;
      taskList.appendChild(li);
    });

  updateProgress();
}

// Show the timetable in time order so the daily plan is easy to scan.
function renderTimetable() {
  timetableList.innerHTML = "";

  if (!timetable.length) {
    timetableList.innerHTML = '<li class="empty-state">No timetable slots saved yet.</li>';
    return;
  }

  timetable
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((slot) => {
      const li = document.createElement("li");
      li.className = "list-item";
      li.innerHTML = `
        <div class="item-main">
          <strong>${slot.time}</strong>
          <span class="item-meta">${slot.task}</span>
        </div>
        <button class="icon-button" aria-label="Delete schedule item" data-id="${slot.id}">🗑️</button>
      `;
      timetableList.appendChild(li);
    });
}

function renderExam() {
  if (!exam || !exam.name || !exam.date) {
    examDisplayName.textContent = "No exam selected";
    countdownText.textContent = "Add an exam date to see the countdown.";
    return;
  }

  examDisplayName.textContent = exam.name;
  updateExamCountdown();
}

// Calculate time remaining until the saved exam date.
function updateExamCountdown() {
  if (!exam || !exam.date) {
    return;
  }

  const now = new Date();
  const examDateValue = new Date(`${exam.date}T00:00:00`);
  const difference = examDateValue - now;

  if (difference <= 0) {
    countdownText.textContent = "Your exam day is here or has already passed.";
    return;
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((difference / (1000 * 60)) % 60);

  countdownText.textContent = `${days} days, ${hours} hours, and ${minutes} minutes remaining.`;
}

function updateProgress() {
  const completedTasks = tasks.filter((task) => task.completed).length;
  const percentage = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  progressBar.style.width = `${percentage}%`;
  progressText.textContent = `${percentage}% complete`;
  completionRate.textContent = `${percentage}%`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function renderNotes() {
  notesArea.value = localStorage.getItem(storageKeys.notes) || "";
}

function applyTheme(theme) {
  document.body.classList.toggle("dark-theme", theme === "dark");
  themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
  themeLabel.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(storageKeys.theme) || "light";
  applyTheme(savedTheme);
}

function toggleTheme() {
  const isDark = document.body.classList.contains("dark-theme");
  const newTheme = isDark ? "light" : "dark";
  localStorage.setItem(storageKeys.theme, newTheme);
  applyTheme(newTheme);
}

function updatePomodoroDisplay() {
  const minutes = String(Math.floor(pomodoroState.timeLeft / 60)).padStart(2, "0");
  const seconds = String(pomodoroState.timeLeft % 60).padStart(2, "0");
  pomodoroTime.textContent = `${minutes}:${seconds}`;
  pomodoroMode.textContent = pomodoroState.isBreak ? "Break Time" : "Study Session";
}

// Switch automatically between study and break intervals.
function startPomodoroTimer() {
  if (pomodoroState.isRunning) {
    return;
  }

  pomodoroState.isRunning = true;
  pomodoroInterval = setInterval(() => {
    pomodoroState.timeLeft -= 1;

    if (pomodoroState.timeLeft <= 0) {
      pomodoroState.isBreak = !pomodoroState.isBreak;
      pomodoroState.timeLeft = pomodoroState.isBreak ? 5 * 60 : 25 * 60;
      alert(pomodoroState.isBreak ? "Study session complete. Take a 5 minute break." : "Break finished. Back to study.");
    }

    updatePomodoroDisplay();
  }, 1000);
}

function pausePomodoroTimer() {
  pomodoroState.isRunning = false;
  clearInterval(pomodoroInterval);
}

function resetPomodoroTimer() {
  pausePomodoroTimer();
  pomodoroState = {
    isRunning: false,
    isBreak: false,
    timeLeft: 25 * 60
  };
  updatePomodoroDisplay();
}

subjectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const subjectName = subjectInput.value.trim();

  if (!subjectName) {
    return;
  }

  subjects.push({
    id: generateId(),
    name: subjectName
  });

  saveData(storageKeys.subjects, subjects);
  subjectForm.reset();
  renderSubjects();
});

subjectList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-id]");
  if (!deleteButton) {
    return;
  }

  subjects = subjects.filter((subject) => subject.id !== Number(deleteButton.dataset.id));
  saveData(storageKeys.subjects, subjects);
  renderSubjects();
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskTitle.value.trim();

  if (!title) {
    return;
  }

  tasks.push({
    id: generateId(),
    title,
    deadline: taskDeadline.value,
    priority: taskPriority.value,
    completed: false
  });

  saveData(storageKeys.tasks, tasks);
  taskForm.reset();
  renderTasks();
});

taskList.addEventListener("change", (event) => {
  if (event.target.type !== "checkbox") {
    return;
  }

  const taskId = Number(event.target.dataset.id);
  tasks = tasks.map((task) =>
    task.id === taskId ? { ...task, completed: event.target.checked } : task
  );
  saveData(storageKeys.tasks, tasks);
  renderTasks();
});

taskList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-id]");
  if (!deleteButton) {
    return;
  }

  tasks = tasks.filter((task) => task.id !== Number(deleteButton.dataset.deleteId));
  saveData(storageKeys.tasks, tasks);
  renderTasks();
});

timetableForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const studyItem = scheduleTask.value.trim();

  if (!studyItem) {
    return;
  }

  timetable.push({
    id: generateId(),
    time: scheduleHour.value,
    task: studyItem
  });

  saveData(storageKeys.timetable, timetable);
  timetableForm.reset();
  renderTimetable();
});

timetableList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-id]");
  if (!deleteButton) {
    return;
  }

  timetable = timetable.filter((slot) => slot.id !== Number(deleteButton.dataset.id));
  saveData(storageKeys.timetable, timetable);
  renderTimetable();
});

examForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const examTitle = examName.value.trim();

  if (!examTitle) {
    return;
  }

  exam = {
    name: examTitle,
    date: examDate.value
  };

  saveData(storageKeys.exam, exam);
  examForm.reset();
  renderExam();
});

saveNotes.addEventListener("click", () => {
  localStorage.setItem(storageKeys.notes, notesArea.value);
});

notesArea.addEventListener("input", () => {
  localStorage.setItem(storageKeys.notes, notesArea.value);
});

themeToggle.addEventListener("click", toggleTheme);
startPomodoro.addEventListener("click", startPomodoroTimer);
pausePomodoro.addEventListener("click", pausePomodoroTimer);
resetPomodoro.addEventListener("click", resetPomodoroTimer);

menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((navLink) => navLink.classList.remove("active"));
    link.classList.add("active");
    sidebar.classList.remove("open");
  });
});

initializeTheme();
updateDateAndGreeting();
renderSubjects();
renderTasks();
renderTimetable();
renderExam();
renderNotes();
updatePomodoroDisplay();
setInterval(updateExamCountdown, 60000);
