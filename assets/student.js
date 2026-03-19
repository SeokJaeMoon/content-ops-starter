import {
  apiRequest,
  escapeHtml,
  formatDate,
  serializeForm,
  setButtonLoading,
  showMessage,
  statusLabel
} from "./api.js";

const state = {
  lectures: [],
  filteredLectures: [],
  selectedLectureId: ""
};

const lectureList = document.querySelector("#lecture-list");
const lectureDetail = document.querySelector("#lecture-detail");
const filterForm = document.querySelector("#lecture-filter-form");
const categoryFilter = document.querySelector("#category-filter");
const schoolLevelFilter = document.querySelector("#school-level-filter");
const applicationForm = document.querySelector("#application-form");
const selectedLectureInput = document.querySelector("#selected-lecture-id");
const summaryContainer = document.querySelector("#student-summary");
const messageBox = document.querySelector("#student-message");
const applyButton = document.querySelector("#apply-button");

function renderSummary() {
  const openLectures = state.lectures.filter((lecture) => lecture.status === "open").length;
  const totalSeats = state.lectures.reduce((sum, lecture) => sum + lecture.maxSeats, 0);

  summaryContainer.innerHTML = `
    <article class="stat-chip">
      <strong>${state.lectures.length}</strong>
      <span>전체 특강</span>
    </article>
    <article class="stat-chip">
      <strong>${openLectures}</strong>
      <span>신청 가능</span>
    </article>
    <article class="stat-chip">
      <strong>${totalSeats}</strong>
      <span>총 정원</span>
    </article>
  `;
}

function populateFilters() {
  const levels = [...new Set(state.lectures.map((lecture) => lecture.targetSchoolLevel))];
  const categories = [...new Set(state.lectures.map((lecture) => lecture.category))];

  schoolLevelFilter.innerHTML =
    '<option value="">전체</option>' +
    levels
      .map((level) => `<option value="${escapeHtml(level)}">${escapeHtml(level)}</option>`)
      .join("");
  categoryFilter.innerHTML =
    '<option value="">전체</option>' +
    categories
      .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join("");
}

function applyFilters() {
  const keyword = filterForm.keyword.value.trim().toLowerCase();
  const schoolLevel = filterForm.schoolLevel.value;
  const category = filterForm.category.value;

  state.filteredLectures = state.lectures.filter((lecture) => {
    const levelMatched =
      !schoolLevel || lecture.targetSchoolLevel === schoolLevel || lecture.targetSchoolLevel === "전체";
    const categoryMatched = !category || lecture.category === category;
    const keywordMatched =
      !keyword ||
      [lecture.title, lecture.description, lecture.instructorName, lecture.category]
        .join(" ")
        .toLowerCase()
        .includes(keyword);

    return levelMatched && categoryMatched && keywordMatched;
  });

  if (!state.filteredLectures.find((lecture) => lecture.id === state.selectedLectureId)) {
    state.selectedLectureId = state.filteredLectures[0]?.id || "";
  }

  renderLectureList();
  renderLectureDetail();
}

function renderLectureList() {
  if (state.filteredLectures.length === 0) {
    lectureList.innerHTML = `
      <div class="empty-state">
        <p>조건에 맞는 특강이 없습니다.</p>
      </div>
    `;
    return;
  }

  lectureList.innerHTML = state.filteredLectures
    .map((lecture) => {
      const isSelected = lecture.id === state.selectedLectureId;
      return `
        <article class="lecture-card ${isSelected ? "selected" : ""}" data-lecture-id="${escapeHtml(lecture.id)}">
          <div class="lecture-card-top">
            <span class="badge ${lecture.status === "open" ? "success" : "muted"}">${statusLabel(lecture.status)}</span>
            <span class="subtle">${escapeHtml(lecture.targetSchoolLevel)}</span>
          </div>
          <h3>${escapeHtml(lecture.title)}</h3>
          <p>${escapeHtml(lecture.description)}</p>
          <dl class="meta-list">
            <div><dt>분야</dt><dd>${escapeHtml(lecture.category)}</dd></div>
            <div><dt>일정</dt><dd>${escapeHtml(formatDate(lecture.date))} ${escapeHtml(lecture.time)}</dd></div>
            <div><dt>강사</dt><dd>${escapeHtml(lecture.instructorName)}</dd></div>
            <div><dt>신청 현황</dt><dd>${lecture.applicationCount} / ${lecture.maxSeats}</dd></div>
          </dl>
        </article>
      `;
    })
    .join("");
}

function renderLectureDetail() {
  const lecture = state.lectures.find((item) => item.id === state.selectedLectureId);

  if (!lecture) {
    lectureDetail.innerHTML = `
      <div class="empty-state">
        <p>왼쪽에서 특강을 선택해주세요.</p>
      </div>
    `;
    selectedLectureInput.value = "";
    applyButton.disabled = true;
    return;
  }

  const applicationDisabled = lecture.status !== "open" || lecture.remainingSeats <= 0;
  selectedLectureInput.value = lecture.id;
  applyButton.disabled = applicationDisabled;

  lectureDetail.innerHTML = `
    <div class="panel-header">
      <h2>${escapeHtml(lecture.title)}</h2>
    </div>
    <p class="detail-copy">${escapeHtml(lecture.description)}</p>
    <dl class="detail-list">
      <div><dt>대상</dt><dd>${escapeHtml(lecture.targetSchoolLevel)}</dd></div>
      <div><dt>분야</dt><dd>${escapeHtml(lecture.category)}</dd></div>
      <div><dt>일정</dt><dd>${escapeHtml(formatDate(lecture.date))} ${escapeHtml(lecture.time)}</dd></div>
      <div><dt>정원</dt><dd>${lecture.maxSeats}명</dd></div>
      <div><dt>남은 자리</dt><dd>${lecture.remainingSeats}석</dd></div>
      <div><dt>강사</dt><dd>${escapeHtml(lecture.instructorName)}</dd></div>
    </dl>
    ${
      applicationDisabled
        ? '<div class="inline-note danger">이 특강은 현재 신청할 수 없습니다.</div>'
        : '<div class="inline-note">신청 폼을 작성하면 바로 수강신청이 저장됩니다.</div>'
    }
  `;
}

async function loadLectures() {
  const lectures = await apiRequest("lectures");
  state.lectures = lectures;
  state.filteredLectures = lectures;
  state.selectedLectureId = lectures[0]?.id || "";
  renderSummary();
  populateFilters();
  applyFilters();
}

lectureList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-lecture-id]");
  if (!card) return;

  state.selectedLectureId = card.dataset.lectureId;
  renderLectureList();
  renderLectureDetail();
});

filterForm.addEventListener("input", applyFilters);
filterForm.addEventListener("change", applyFilters);

applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage(messageBox, "");

  if (!selectedLectureInput.value) {
    showMessage(messageBox, "먼저 신청할 특강을 선택해주세요.", "error");
    return;
  }

  const payload = serializeForm(applicationForm);

  try {
    setButtonLoading(applyButton, true, "신청 중...");
    await apiRequest("applications", {
      method: "POST",
      body: payload
    });
    applicationForm.reset();
    selectedLectureInput.value = state.selectedLectureId;
    showMessage(messageBox, "수강 신청이 완료되었습니다.", "success");
    await loadLectures();
  } catch (error) {
    const detail = error.details?.length ? ` (${error.details.join(", ")})` : "";
    showMessage(messageBox, `${error.message}${detail}`, "error");
  } finally {
    setButtonLoading(applyButton, false);
  }
});

loadLectures().catch((error) => {
  showMessage(messageBox, error.message || "특강 정보를 불러오지 못했습니다.", "error");
});
