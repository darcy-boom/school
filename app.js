(() => {
  "use strict";

  const data = window.CAU_DATA;
  if (!data || !Array.isArray(data.items)) {
    document.body.insertAdjacentHTML("afterbegin", '<div class="noscript">数据文件未能加载，请确认 data/items.js 与 index.html 位于同一项目目录。</div>');
    return;
  }

  const snapshot = new Date(data.snapshot);
  const DAY = 24 * 60 * 60 * 1000;
  const state = { query: "", category: "all", verification: "all", sort: "next" };
  let lastTrigger = null;

  const $ = (selector) => document.querySelector(selector);
  const cardsRoot = $("#cards");
  const emptyState = $("#empty-state");
  const detailDialog = $("#detail-dialog");
  const dialogContent = $("#dialog-content");

  function calendarDaysFromSnapshot(target) {
    const targetDate = new Date(target);
    const from = Date.UTC(snapshot.getFullYear(), snapshot.getMonth(), snapshot.getDate());
    const to = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    return Math.round((to - from) / DAY);
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function dateValue(item) {
    const raw = item.deadline || item.startAt || item.sortAt || item.publishedAt;
    return raw ? new Date(raw).getTime() : Number.POSITIVE_INFINITY;
  }

  function timeline(item) {
    if (item.deadline) {
      const deadline = new Date(item.deadline);
      const days = calendarDaysFromSnapshot(deadline);
      if (days >= 0) return { key: "upcoming", label: days === 0 ? "今日截止" : `${days} 天后截止`, days };
      return { key: "archived", label: "节点已过", days };
    }
    if (item.startAt && item.endAt) {
      const start = new Date(item.startAt);
      const end = new Date(item.endAt);
      if (snapshot < start) return { key: "upcoming", label: "即将开始", days: Math.ceil((start - snapshot) / DAY) };
      if (snapshot <= end) return { key: "ongoing", label: "正在进行", days: 0 };
      return { key: "archived", label: "已结束", days: -1 };
    }
    if (item.sortAt && new Date(item.sortAt) > snapshot) {
      return { key: "upcoming", label: "后续关注", days: Math.ceil((new Date(item.sortAt) - snapshot) / DAY) };
    }
    return { key: "info", label: "信息参考", days: null };
  }

  function compactDate(item) {
    const raw = item.deadline || item.startAt || item.publishedAt;
    if (!raw) return "时间见原文";
    const value = new Date(raw);
    return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(value).replace("/", ".");
  }

  function normalizedText(item) {
    return [item.title, item.category, item.audience, item.background, item.summary, item.action, ...(item.tags || [])]
      .join(" ")
      .toLocaleLowerCase("zh-CN");
  }

  function filteredItems() {
    const query = state.query.trim().toLocaleLowerCase("zh-CN");
    return data.items
      .filter((item) => state.category === "all" || item.category === state.category)
      .filter((item) => state.verification === "all" || item.verification.level === state.verification)
      .filter((item) => !query || normalizedText(item).includes(query))
      .sort((a, b) => {
        if (state.sort === "recent") {
          return (new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)) || a.title.localeCompare(b.title, "zh-CN");
        }
        if (state.sort === "category") {
          return a.category.localeCompare(b.category, "zh-CN") || dateValue(a) - dateValue(b);
        }
        const aDate = dateValue(a);
        const bDate = dateValue(b);
        const aFuture = aDate >= snapshot.getTime();
        const bFuture = bDate >= snapshot.getTime();
        if (aFuture !== bFuture) return aFuture ? -1 : 1;
        if (aFuture) return aDate - bDate;
        return (new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
      });
  }

  function verificationMark() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "m5 12 4 4L19 6");
    svg.append(path);
    return svg;
  }

  function cardFor(item) {
    const card = make("article", "info-card");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `查看详情：${item.title}`);
    card.dataset.id = item.id;

    const meta = make("div", "card-meta");
    meta.append(make("span", "category-label", `${item.category.toUpperCase()} / ${item.id.toUpperCase()}`));
    const timing = timeline(item);
    meta.append(make("span", `status-label status-${timing.key}`, timing.label));

    const body = make("div", "card-body");
    body.append(make("h3", "", item.title));
    body.append(make("p", "", item.summary));
    const tags = make("div", "tag-list");
    (item.tags || []).slice(0, 3).forEach((tag) => tags.append(make("span", "tag", tag)));
    body.append(tags);

    const side = make("div", "card-side");
    side.append(make("span", "date-label", compactDate(item)));
    const verified = make("span", "verify-label");
    verified.append(verificationMark(), document.createTextNode(item.verification.label));
    side.append(verified);

    card.append(meta, body, side);
    card.addEventListener("click", () => openDialog(item, card));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDialog(item, card);
      }
    });
    return card;
  }

  function addDialogSection(root, title, content, options = {}) {
    const section = make("section", `dialog-section${options.wide ? " wide" : ""}${options.caveat ? " caveat" : ""}`);
    section.append(make("h3", "", title), make("p", "", content));
    root.append(section);
  }

  function openDialog(item, trigger) {
    lastTrigger = trigger;
    dialogContent.replaceChildren();

    const kicker = make("div", "dialog-kicker");
    kicker.append(make("span", "", item.category), make("span", "", item.verification.label), make("span", "", item.id.toUpperCase()));
    const title = make("h2", "", item.title);
    title.id = "dialog-title";
    const time = make("p", "dialog-time", item.dateLabel);
    const sections = make("div", "dialog-sections");
    addDialogSection(sections, "适用对象", item.audience);
    addDialogSection(sections, "核验状态", `${item.verification.note}`);
    addDialogSection(sections, "背景", item.background, { wide: true });
    addDialogSection(sections, "内容提炼", item.summary, { wide: true });
    addDialogSection(sections, "建议行动", item.action, { wide: true });
    if (item.caveat) addDialogSection(sections, "注意", item.caveat, { wide: true, caveat: true });

    const sourceSection = make("section", "dialog-section wide");
    sourceSection.append(make("h3", "", `来源渠道 · ${item.sources.length}`));
    const sourceList = make("ul", "source-list");
    item.sources.forEach((source) => {
      const li = make("li");
      const link = make("a", "", source.name);
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      li.append(link, make("span", "", source.channel));
      sourceList.append(li);
    });
    sourceSection.append(sourceList);
    sections.append(sourceSection);
    dialogContent.append(kicker, title, time, sections);

    if (typeof detailDialog.showModal === "function") detailDialog.showModal();
    else detailDialog.setAttribute("open", "");
  }

  function closeDialog() {
    if (typeof detailDialog.close === "function") detailDialog.close();
    else detailDialog.removeAttribute("open");
    if (lastTrigger) lastTrigger.focus();
  }

  function render() {
    const items = filteredItems();
    cardsRoot.replaceChildren(...items.map(cardFor));
    $("#result-count").textContent = items.length;
    emptyState.hidden = items.length !== 0;

    const summary = [];
    if (state.category !== "all") summary.push(`类型：${state.category}`);
    if (state.verification !== "all") {
      const label = document.querySelector(`[data-filter="verification"][data-value="${state.verification}"] span`).textContent;
      summary.push(`核验：${label}`);
    }
    if (state.query.trim()) summary.push(`关键词：“${state.query.trim()}”`);
    $("#active-summary").textContent = summary.length ? summary.join(" · ") : "显示全部信息";
  }

  function setFilter(type, value) {
    state[type] = value;
    document.querySelectorAll(`[data-filter="${type}"]`).forEach((button) => {
      const active = button.dataset.value === value;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    render();
  }

  function resetFilters() {
    state.query = "";
    $("#search-input").value = "";
    setFilter("category", "all");
    setFilter("verification", "all");
  }

  function renderMetrics() {
    const futureActions = data.items.filter((item) => {
      const status = timeline(item);
      return status.key === "upcoming" || status.key === "ongoing";
    }).length;
    const uniqueSources = new Set(data.items.flatMap((item) => item.sources.map((source) => source.url)));
    $("#metric-total").textContent = data.items.length;
    $("#metric-action").textContent = futureActions;
    $("#metric-sources").textContent = uniqueSources.size;

    const categories = ["通知", "活动", "竞赛", "热点", "校园"];
    $("#count-all").textContent = data.items.length;
    categories.forEach((category) => {
      $(`#count-${category}`).textContent = data.items.filter((item) => item.category === category).length;
    });
  }

  function renderDeadlines() {
    const deadlines = data.items
      .filter((item) => item.deadline && new Date(item.deadline) >= snapshot)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 4);
    const root = $("#deadline-list");
    root.replaceChildren();
    deadlines.forEach((item) => {
      const days = calendarDaysFromSnapshot(item.deadline);
      const row = make("div", "deadline-item");
      const block = make("div", "deadline-days");
      block.append(make("strong", "", String(days).padStart(2, "0")), make("span", "", days === 0 ? "TODAY" : "DAYS"));
      const button = make("button");
      button.type = "button";
      button.append(make("strong", "", item.title), make("small", "", item.dateLabel.split("；")[0]));
      button.addEventListener("click", () => openDialog(item, button));
      row.append(block, button);
      root.append(row);
    });
  }

  function renderChannels() {
    const root = $("#channel-grid");
    root.replaceChildren();
    data.channels.forEach((channel) => {
      const card = make("article", "channel-card");
      const top = make("div", "channel-top");
      top.append(make("h3", "", channel.name), make("span", `channel-state state-${channel.state}`, channel.label));
      card.append(top, make("p", "", channel.detail));
      if (channel.url) {
        const link = make("a", "", "查看证据 ↗");
        link.href = channel.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        card.append(link);
      } else {
        card.append(make("span", "no-link", "限制已记录"));
      }
      root.append(card);
    });
  }

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter, button.dataset.value));
  });
  $("#search-input").addEventListener("input", (event) => { state.query = event.target.value; render(); });
  $("#sort-select").addEventListener("change", (event) => { state.sort = event.target.value; render(); });
  $("#reset-filters").addEventListener("click", resetFilters);
  $("#empty-reset").addEventListener("click", resetFilters);
  $(".dialog-close").addEventListener("click", closeDialog);
  detailDialog.addEventListener("click", (event) => { if (event.target === detailDialog) closeDialog(); });
  detailDialog.addEventListener("cancel", (event) => { event.preventDefault(); closeDialog(); });

  renderMetrics();
  renderDeadlines();
  renderChannels();
  render();
})();
