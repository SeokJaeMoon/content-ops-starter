import {
  apiRequest,
  escapeHtml,
  formatDate,
  formatDateTime,
  serializeForm,
  setButtonLoading,
  showMessage,
  statusLabel
} from "./api.js";

const state = {
  token: sessionStorage.getItem("classreg-admin-token") || "",
  lectures: [],
  instructors: [],
  applications: [],
  stats: null
};

const loginCard = document.querySelector("#login-card");
const adminApp = document.querySelector("#admin-app");
const loginForm = document.querySelector("#login-form");
const logoutButton = document.querySelector("#logout-button");
const globalMessage = document.querySelector("#admin-global-message");
const lectureForm = document.querySelector("#lecture-form");
const instructorForm = document.querySelector("#instructor-form");
const lectureInstructorSelect = document.querySelector("#lecture-instructor-select");
const lecturesTableBody = document.querySelector("#lectures-table-body");
const instructorsTableBody = document.querySelector("#instructors-table-body");
const applicationsTableBody = document.querySelector("#applications-table-body");
const applicationLectureFilter = document.querySelector("#application-filter-lecture");
const applicationLevelFilter = document.querySelector("#application-filter-level");
const statsSummary = document.querySelector("#stats-summary");
const lectureChart = document.querySelector("#chart-lecture-applications");
const schoolLevelChart = document.querySelector("#chart-school-level");
const instructorChart = document.querySelector("#chart-instructor-assignments");
const refreshStatsButton = document.querySelector("#refresh-stats-button");
const seedButton = document.querySelector("#seed-button");

function authOptions(method = "GET", body) {
  return {
    method,
    body,
    token: state.token
  };
}

function setAuthenticated(isAuthenticated) {
  loginCard.hidden = isAuthenticated;
  adminApp.hidden = !isAuthenticated;
  logoutButton.hidden = !isAuthenticated;
}

function renderInstructorOptions() {
  lectureInstructorSelect.innerHTML =
    '<option value="">강사 선택</option>' +
    state.instructors
      .map(
        (instructor) =>
          `<option value="${escapeHtml(instructor.id)}">${escapeHtml(instructor.name)} · ${escapeHtml(
            instructor.specialty
          )}</option>`
      )
      .join("");

  applicationLectureFilter.innerHTML =
    '<option value="">전체 특강</option>' +
    state.lectures
      .map((lecture) => `<option value="${escapeHtml(lecture.id)}">${escapeHtml(lecture.title)}</option>`)
      .join("");
}

function renderLectureTable() {
  lecturesTableBody.innerHTML = state.lectures
    .map(
      (lecture) => `
        <tr>
          <td>
            <strong>${escapeHtml(lecture.title)}</strong>
            <div class="subtle">${escapeHtml(formatDate(lecture.date))} ${escapeHtml(lecture.time)}</div>
          </td>
          <td>${escapeHtml(lecture.targetSchoolLevel)}</td>
          <td>${escapeHtml(lecture.instructorName || "-")}</td>
          <td>${lecture.applicationCount} / ${lecture.maxSeats}</td>
          <td><span class="badge ${lecture.status === "open" ? "success" : "muted"}">${statusLabel(
            lecture.status
          )}</span></td>
          <td>
            <div class="table-actions">
              <button class="button ghost small" data-action="edit-lecture" data-id="${escapeHtml(lecture.id)}">수정</button>
              <button class="button ghost small danger" data-action="delete-lecture" data-id="${escapeHtml(lecture.id)}">삭제</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderInstructorTable() {
  instructorsTableBody.innerHTML = state.instructors
    .map(
      (instructor) => `
        <tr>
          <td><strong>${escapeHtml(instructor.name)}</strong></td>
          <td>${escapeHtml(instructor.specialty)}</td>
          <td>${escapeHtml(instructor.phone)}</td>
          <td>${escapeHtml(instructor.email)}</td>
          <td>
            <div class="table-actions">
              <button class="button ghost small" data-action="edit-instructor" data-id="${escapeHtml(instructor.id)}">수정</button>
              <button class="button ghost small danger" data-action="delete-instructor" data-id="${escapeHtml(
                instructor.id
              )}">삭제</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderApplications() {
  const lectureId = applicationLectureFilter.value;
  const schoolLevel = applicationLevelFilter.value;

  const lectureMap = new Map(state.lectures.map((lecture) => [lecture.id, lecture.title]));
  const filtered = state.applications.filter((application) => {
    const lectureMatched = !lectureId || application.lectureId === lectureId;
    const levelMatched = !schoolLevel || application.schoolLevel === schoolLevel;
    return lectureMatched && levelMatched;
  });

  applicationsTableBody.innerHTML = filtered
    .map(
      (application) => `
        <tr>
          <td>${escapeHtml(formatDateTime(application.appliedAt))}</td>
          <td>${escapeHtml(application.studentName)}</td>
          <td>${escapeHtml(application.schoolName)}</td>
          <td>${escapeHtml(application.schoolLevel)} / ${escapeHtml(application.grade)}학년</td>
          <td>${escapeHtml(application.parentPhone)}</td>
          <td>${escapeHtml(lectureMap.get(application.lectureId) || "삭제된 특강")}</td>
          <td><span class="badge success">${statusLabel(application.status)}</span></td>
        </tr>
      `
    )
    .join("");
}

function renderBarList(container, items, labelFormatter, valueFormatter) {
  if (!items.length) {
    container.innerHTML = '<div class="empty-state"><p>표시할 데이터가 없습니다.</p></div>';
    return;
  }

  const max = Math.max(...items.map((item) => item.value), 1);
  container.innerHTML = items
    .map(
      (item) => `
        <div class="chart-row">
          <div class="chart-row-head">
            <strong>${escapeHtml(labelFormatter(item))}</strong>
            <span>${escapeHtml(valueFormatter(item))}</span>
          </div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width:${(item.value / max) * 100}%"></div>
          </div>
          ${item.note ? `<p class="chart-note">${escapeHtml(item.note)}</p>` : ""}
        </div>
      `
    )
    .join("");
}

function renderStats() {
  if (!state.stats) return;

  statsSummary.innerHTML = `
    <article class="summary-card">
      <strong>${state.stats.summary.totalLectures}</strong>
      <span>전체 특강 수</span>
    </article>
    <article class="summary-card">
      <strong>${state.stats.summary.totalApplications}</strong>
      <span>전체 신청 수</span>
    </article>
    <article class="summary-card">
      <strong>${state.stats.summary.totalInstructors}</strong>
      <span>강사 수</span>
    </article>
    <article class="summary-card">
      <strong>${state.stats.summary.openLectures}</strong>
      <span>신청 가능 특강</span>
    </article>
  `;

  renderBarList(
    lectureChart,
    state.stats.applicationsByLecture.map((item) => ({
      value: item.count,
      label: item.title,
      note: `${item.count}명 신청 / 정원 ${item.maxSeats}명`
    })),
    (item) => item.label,
    (item) => item.note
  );

  renderBarList(
    schoolLevelChart,
    state.stats.schoolLevelDistribution.map((item) => ({
      value: item.count,
      label: item.label
    })),
    (item) => item.label,
    (item) => `${item.value}명`
  );

  renderBarList(
    instructorChart,
    state.stats.instructorAssignments.map((item) => ({
      value: item.count,
      label: item.name,
      note: item.lectures.length ? item.lectures.join(", ") : "배정된 특강 없음"
    })),
    (item) => item.label,
    (item) => `${item.value}개 특강`
  );
}

async function fetchAllData() {
  const [lectures, instructors, applications, stats] = await Promise.all([
    apiRequest("lectures", authOptions()),
    apiRequest("instructors", authOptions()),
    apiRequest("applications", authOptions()),
    apiRequest("stats", authOptions())
  ]);

  state.lectures = lectures;
  state.instructors = instructors;
  state.applications = applications;
  state.stats = stats;

  renderInstructorOptions();
  renderLectureTable();
  renderInstructorTable();
  renderApplications();
  renderStats();
}

function resetLectureForm() {
  lectureForm.reset();
  lectureForm.elements.id.value = "";
  lectureForm.elements.status.value = "open";
}

function resetInstructorForm() {
  instructorForm.reset();
  instructorForm.elements.id.value = "";
}

async function refreshAdminData() {
  try {
    await fetchAllData();
  } catch (error) {
    if (error.status === 401) {
      state.token = "";
      sessionStorage.removeItem("classreg-admin-token");
      setAuthenticated(false);
    }
    showMessage(globalMessage, error.message, "error");
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = loginForm.querySelector("button[type='submit']");
  showMessage(globalMessage, "");

  try {
    setButtonLoading(submitButton, true, "로그인 중...");
    const credentials = serializeForm(loginForm);
    const result = await apiRequest("admin-login", {
      method: "POST",
      body: credentials
    });
    state.token = result.token;
    sessionStorage.setItem("classreg-admin-token", result.token);
    setAuthenticated(true);
    showMessage(globalMessage, "관리자 로그인에 성공했습니다.", "success");
    await fetchAllData();
  } catch (error) {
    showMessage(globalMessage, error.message, "error");
  } finally {
    setButtonLoading(submitButton, false);
  }
});

logoutButton.addEventListener("click", () => {
  state.token = "";
  sessionStorage.removeItem("classreg-admin-token");
  setAuthenticated(false);
  showMessage(globalMessage, "로그아웃되었습니다.", "info");
});

lectureForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = lectureForm.querySelector("button[type='submit']");
  const payload = serializeForm(lectureForm);

  try {
    setButtonLoading(submitButton, true, "저장 중...");
    await apiRequest("lectures", authOptions(payload.id ? "PUT" : "POST", payload));
    showMessage(globalMessage, payload.id ? "특강을 수정했습니다." : "특강을 등록했습니다.", "success");
    resetLectureForm();
    await fetchAllData();
  } catch (error) {
    showMessage(globalMessage, [error.message, ...(error.details || [])].join(" "), "error");
  } finally {
    setButtonLoading(submitButton, false);
  }
});

instructorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = instructorForm.querySelector("button[type='submit']");
  const payload = serializeForm(instructorForm);

  try {
    setButtonLoading(submitButton, true, "저장 중...");
    await apiRequest("instructors", authOptions(payload.id ? "PUT" : "POST", payload));
    showMessage(globalMessage, payload.id ? "강사 정보를 수정했습니다." : "강사를 등록했습니다.", "success");
    resetInstructorForm();
    await fetchAllData();
  } catch (error) {
    showMessage(globalMessage, [error.message, ...(error.details || [])].join(" "), "error");
  } finally {
    setButtonLoading(submitButton, false);
  }
});

document.querySelector("#reset-lecture-form").addEventListener("click", resetLectureForm);
document.querySelector("#reset-instructor-form").addEventListener("click", resetInstructorForm);

document.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  const { action, id } = actionButton.dataset;

  if (action === "edit-lecture") {
    const lecture = state.lectures.find((item) => item.id === id);
    if (!lecture) return;
    Object.entries({
      id: lecture.id,
      title: lecture.title,
      targetSchoolLevel: lecture.targetSchoolLevel,
      category: lecture.category,
      description: lecture.description,
      date: lecture.date,
      time: lecture.time,
      maxSeats: lecture.maxSeats,
      instructorId: lecture.instructorId,
      status: lecture.status
    }).forEach(([key, value]) => {
      lectureForm.elements[key].value = value;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (action === "delete-lecture") {
    if (!window.confirm("정말 이 특강을 삭제하시겠습니까? 신청 내역이 있는 특강은 삭제할 수 없습니다.")) {
      return;
    }

    try {
      await apiRequest(`lectures?id=${encodeURIComponent(id)}`, authOptions("DELETE"));
      showMessage(globalMessage, "특강을 삭제했습니다.", "success");
      await fetchAllData();
    } catch (error) {
      showMessage(globalMessage, error.message, "error");
    }
    return;
  }

  if (action === "edit-instructor") {
    const instructor = state.instructors.find((item) => item.id === id);
    if (!instructor) return;
    Object.entries(instructor).forEach(([key, value]) => {
      if (instructorForm.elements[key]) {
        instructorForm.elements[key].value = value;
      }
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (action === "delete-instructor") {
    if (!window.confirm("정말 이 강사를 삭제하시겠습니까? 배정된 특강이 있으면 삭제할 수 없습니다.")) {
      return;
    }

    try {
      await apiRequest(`instructors?id=${encodeURIComponent(id)}`, authOptions("DELETE"));
      showMessage(globalMessage, "강사를 삭제했습니다.", "success");
      await fetchAllData();
    } catch (error) {
      showMessage(globalMessage, error.message, "error");
    }
  }
});

applicationLectureFilter.addEventListener("change", renderApplications);
applicationLevelFilter.addEventListener("change", renderApplications);

refreshStatsButton.addEventListener("click", async () => {
  try {
    state.stats = await apiRequest("stats", authOptions());
    renderStats();
    showMessage(globalMessage, "통계를 새로고침했습니다.", "success");
  } catch (error) {
    showMessage(globalMessage, error.message, "error");
  }
});

seedButton.addEventListener("click", async () => {
  if (!window.confirm("현재 데이터를 샘플 데이터로 다시 덮어씁니다. 계속하시겠습니까?")) {
    return;
  }

  try {
    await apiRequest("seed", authOptions("POST", { force: true }));
    showMessage(globalMessage, "샘플 데이터로 초기화했습니다.", "success");
    resetLectureForm();
    resetInstructorForm();
    await fetchAllData();
  } catch (error) {
    showMessage(globalMessage, error.message, "error");
  }
});

document.querySelector("#admin-tab-bar").addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (!tab) return;

  const tabName = tab.dataset.tab;
  document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === tab));
  document
    .querySelectorAll(".tab-panel")
    .forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === tabName));
});

if (state.token) {
  setAuthenticated(true);
  refreshAdminData();
} else {
  setAuthenticated(false);
}
