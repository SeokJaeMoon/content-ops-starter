const API_BASE = "/.netlify/functions";

export async function apiRequest(endpoint, { method = "GET", body, token } = {}) {
  const headers = {
    Accept: "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const init = {
    method,
    headers
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}/${endpoint}`, init);
  const text = await response.text();
  let payload;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {
      success: response.ok,
      message: text || "응답을 해석할 수 없습니다."
    };
  }

  if (!response.ok || payload.success === false) {
    const error = new Error(payload.message || "요청 처리에 실패했습니다.");
    error.status = response.status;
    error.details = payload.errors || [];
    throw error;
  }

  return payload.data;
}

export function serializeForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function formatDate(dateString) {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(dateString));
}

export function formatDateTime(dateString) {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateString));
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function showMessage(element, message, type = "info") {
  if (!element) return;
  element.hidden = !message;
  element.textContent = message || "";
  element.className = `message ${type}`;
}

export function setButtonLoading(button, isLoading, loadingText) {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}

export function statusLabel(status) {
  if (status === "open") return "신청 가능";
  if (status === "closed") return "마감";
  if (status === "completed") return "종료";
  if (status === "submitted") return "신청 완료";
  if (status === "cancelled") return "취소";
  return status;
}
