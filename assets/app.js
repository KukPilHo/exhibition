// 전시 사이트 공통 스크립트
// data/works.json: 구간과 인물, data/days.json: 원문 카드 짝짓기용 장면
const STATUS = {
  draft: "초안 공개",
  included: "앞 장에 포함",
  inprogress: "제작 중",
  planned: "예정",
};
const ERAS = ["1930년대", "1950~60년대", "1970년대", "1980~90년대", "2000년대", "2010년대", "2020년대"];

async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(url);
  return res.json();
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// 영상 주소: works.json의 exhibition.mediaBase가 있으면 그 주소를 앞에 붙인다(영상만 다른 호스팅에 둘 때)
let MEDIA_BASE = "";
const mediaURL = (p) => {
  if (!p || /^https?:\/\//.test(p) || !MEDIA_BASE) return p;
  return MEDIA_BASE.replace(/\/?$/, "/") + p.replace(/^\.?\//, "");
};
const loadData = async () => {
  const data = await loadJSON("data/works.json");
  MEDIA_BASE = (data.exhibition && data.exhibition.mediaBase) || "";
  return data;
};
const AI_NOTE = "영상 속 인물과 장면은 원문을 바탕으로 한 AI 재현이며, 영상 속 대사는 기획자의 각색입니다.";

/* ---------------- 메인 ---------------- */
async function renderHome() {
  let data, days;
  try {
    [data, days] = await Promise.all([loadData(), loadJSON("data/days.json")]);
  } catch (e) {
    document.getElementById("people-lead").textContent = "전시 데이터를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.";
    return;
  }
  const people = initPeople(data);
  initToday(data, days.lines, people);
  try {
    const txt = await (await fetch(data.curatorDay.textFile, { cache: "no-cache" })).text();
    const paras = txt.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    document.getElementById("curator-text").innerHTML = paras.map((p) => `<p>${esc(p)}</p>`).join("");
  } catch (e) { /* 글이 없으면 비워 둔다 */ }
}

/* ---------------- 인물 선택: 누르면 바로 재생 ---------------- */
function initPeople(data) {
  const list = data.works.filter((w) => w.person);
  const picker = document.getElementById("picker");
  const video = document.getElementById("pv");
  const empty = document.getElementById("screen-empty");
  const screen = document.getElementById("screen");
  const now = document.getElementById("now");
  const nowHead = document.getElementById("now-head");

  const withVideo = list.filter((w) => w.video).map((w) => w.person);
  if (withVideo.length) {
    document.getElementById("people-lead").textContent =
      `17편의 20대 가운데 한 사람을 누르면 이 자리에서 바로 그 하루가 재생됩니다. 지금 영상이 공개된 인물: ${withVideo.join(", ")}`;
  }

  picker.innerHTML = ERAS.map((era) => {
    const items = list.filter((w) => w.era === era);
    if (!items.length) return "";
    return `<div class="era-row"><p class="era-name">${esc(era)}</p><div class="chips">${items.map((w) => `
      <button type="button" class="chip${w.video ? " has-video" : ""}" data-id="${esc(w.id)}" aria-pressed="false">
        ${w.video ? '<span class="pl" aria-hidden="true"></span>' : ""}<span class="nm">${esc(w.person)}</span><span class="ag">${esc(w.personAge)}</span>
      </button>`).join("")}</div></div>`;
  }).join("") + `<p class="note picker-note"><span class="pl" aria-hidden="true"></span> 표시가 있는 인물은 영상이 공개되어 있습니다. 나머지 인물은 장면 정보를 먼저 보여 주고, 영상은 차례로 공개합니다.</p>`;

  const chips = [...picker.querySelectorAll(".chip")];

  function emptyHTML(w) {
    const st = w.status === "inprogress" ? `제작 중${w.statusNote ? `, ${w.statusNote}` : ""}` : "영상 제작 예정";
    return `<div class="se-inner">
      <p class="se-year">${esc(w.year)}</p>
      <p class="se-work">${esc([w.author, w.work].filter(Boolean).join(" "))}</p>
      <p class="se-person">${esc(w.person)}, ${esc(w.personAge)}</p>
      <p class="se-scene">${esc(w.scene)}</p>
      <p class="se-status">${esc(st)}</p></div>`;
  }
  function headHTML(w) {
    const meta = [w.order, w.year, w.length].filter(Boolean).join(" | ");
    return `<p class="now-meta">${esc(meta)}</p>
      <h3 class="now-title">${esc(w.person)}<span class="ag">${esc(w.personAge)}</span></h3>
      <p class="now-work">${esc([w.author, w.work].filter(Boolean).join(" "))}</p>`;
  }
  function nowHTML(w) {
    return `<p class="now-scene">${esc(w.scene)}</p>
      ${w.summary ? `<p class="now-summary">${esc(w.summary)}</p>` : ""}
      ${w.source ? `<p class="note">출처: ${esc(w.source)}</p>` : ""}
      ${w.video ? `<p class="note">${AI_NOTE}</p>` : ""}`;
  }

  function select(w, { play = false, scroll = false, remember = false } = {}) {
    chips.forEach((c) => c.setAttribute("aria-pressed", c.dataset.id === w.id ? "true" : "false"));
    if (w.video) {
      empty.hidden = true;
      video.hidden = false;
      if (video.dataset.src !== w.video) {
        video.dataset.src = w.video;
        video.poster = w.poster || "";
        video.src = mediaURL(w.video);
      }
      if (play) {
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      }
    } else {
      video.pause();
      video.hidden = true;
      empty.hidden = false;
      empty.innerHTML = emptyHTML(w);
    }
    nowHead.innerHTML = headHTML(w);
    now.innerHTML = nowHTML(w);
    if (remember) {
      try { history.replaceState(null, "", `#${w.id}`); } catch (e) { /* 주소 갱신 실패는 무시 */ }
    }
    if (scroll) {
      const r = screen.getBoundingClientRect();
      if (r.top < 64 || r.bottom > window.innerHeight) screen.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  picker.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const w = list.find((x) => x.id === b.dataset.id);
    if (w) select(w, { play: true, scroll: true, remember: true });
  });

  const fromHash = list.find((w) => w.id === decodeURIComponent(location.hash.slice(1)));
  select(fromHash || list.find((w) => w.video) || list[0]);
  if (fromHash) setTimeout(() => document.getElementById("people").scrollIntoView(), 50);
  window.addEventListener("hashchange", () => {
    const w = list.find((x) => x.id === decodeURIComponent(location.hash.slice(1)));
    if (w) { select(w); document.getElementById("people").scrollIntoView(); }
  });

  return {
    watch(id) {
      const w = list.find((x) => x.id === id);
      if (w) select(w, { play: true, scroll: true, remember: true });
    },
  };
}

/* ---------------- 2026년 나의 하루 기록하기 ---------------- */
// 입력에서 장소, 마음에 걸린 일, 손에 든 것을 묶음으로 나누는 낱말 목록
const PLACE = {
  이동: { sim: "어딘가로 가는 중", kw: ["버스", "지하철", "전철", "기차", "열차", "택시", "정류장", "전차", "KTX", "ktx", "통학", "출근", "퇴근", "차 안", "차안", "환승"] },
  길: { sim: "길 위에서", kw: ["거리", "산책", "천변", "한강", "공원", "골목", "횡단보도", "걷"], end: ["길"] },
  역: { sim: "사람 많은 역에서", kw: ["터미널", "공항", "대합실", "플랫폼", "승강장"], end: ["역"], not: ["지역", "구역", "영역", "무역", "역할", "번역", "전역"] },
  카페: { sim: "카페에 앉아", kw: ["카페", "커피숍", "스타벅스", "다방", "술집", "호프", "펍", "식당", "포차"] },
  일터: { sim: "일하는 자리에서", kw: ["약국", "가게", "매장", "편의점", "회사", "사무실", "알바", "아르바이트", "카운터", "공장", "병원", "상점", "근무", "일터", "직장", "출근"] },
  학교: { sim: "배우고 가르치는 자리에서", kw: ["학교", "강의실", "교실", "도서관", "학원", "캠퍼스", "과외", "스터디", "열람실", "대학", "수업"] },
  집: { sim: "집에서", kw: ["자취", "기숙사", "고시원", "원룸", "부엌", "거실", "본가", "침대", "하숙"], end: ["집", "방"], not: ["가방", "지방", "책방", "노래방", "PC방", "피시방", "찜질방", "다방", "맛집", "술집", "찻집", "빵집", "국밥집", "고깃집", "횟집", "분식집"] },
  교회: { sim: "기도하는 자리에서", kw: ["교회", "성당", "예배", "법당", "기도"] },
};
const WORRY = {
  가족: { sim: "가족 생각", kw: ["엄마", "어머니", "아빠", "아버지", "부모", "가족", "집안", "동생", "누나", "언니", "오빠", "할머니", "할아버지", "본가", "형이", "형한테", "형과", "우리 형"] },
  돈: { sim: "돈 걱정", kw: ["돈", "월세", "등록금", "생활비", "알바비", "용돈", "빚", "대출", "카드값", "통장", "월급", "장학금", "적금", "비싸", "가난", "이자", "관리비"] },
  일: { sim: "일과 앞날 걱정", kw: ["취업", "진로", "직장", "일자리", "면접", "자소서", "졸업", "인턴", "회사", "시험", "공채", "합격", "백수", "무직", "미래", "앞날", "퇴사", "이직", "구직"] },
  외로움: { sim: "혼자라는 마음", kw: ["외로", "혼자", "쓸쓸", "고독", "친구", "연락", "보고 싶", "그리워", "그립"] },
  가르침: { sim: "누군가를 가르치는 일", kw: ["가르치", "아이들", "학생들", "과외", "수업 준비", "발표", "조교", "멘토", "후배"] },
  글: { sim: "써야 할 글", kw: ["글", "원고", "과제", "리포트", "레포트", "논문", "소설", "기록", "일기", "마감", "창작"] },
  피곤: { sim: "지친 몸", kw: ["피곤", "지쳐", "지친", "졸려", "졸리", "잠을", "잠이", "못 잤", "못잤", "힘들", "녹초", "아파", "야근", "밤새"] },
  배고픔: { sim: "끼니 걱정", kw: ["배고", "끼니", "굶", "식비", "밥값", "밥을 못"] },
  결정: { sim: "정해야 할 일", kw: ["결정", "선택", "고민", "포기", "정해야", "갈림길", "어떻게 해야"] },
};
const ITEM = {
  책: { sim: "손에 든 읽을거리", kw: ["잡지", "소설", "교재", "신문", "전공책", "책"] },
  노트: { sim: "손에 든 공책과 펜", kw: ["노트", "공책", "만년필", "연필", "수첩", "다이어리", "아이패드", "태블릿", "펜"] },
  돈: { sim: "손에 쥔 돈", kw: ["동전", "지갑", "카드", "현금", "영수증", "돈"] },
  밥: { sim: "밥 한 그릇", kw: ["밥", "도시락", "김밥", "컵라면", "숟가락", "그릇", "빵", "주먹밥"] },
};
const BUCKETS = ["심야", "새벽", "아침", "낮", "오후", "저녁", "밤"];
const NUM = ["열두", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열", "열한", "열두"];

function bucketOf(h) {
  if (h < 4) return "심야";
  if (h < 7) return "새벽";
  if (h < 11) return "아침";
  if (h < 15) return "낮";
  if (h < 18) return "오후";
  if (h < 21) return "저녁";
  return "밤";
}
function near(a, b) {
  const d = Math.abs(BUCKETS.indexOf(a) - BUCKETS.indexOf(b));
  return d === 1 || d === BUCKETS.length - 1;
}
function hourKo(h) {
  const pre = h < 7 ? "새벽" : h < 11 ? "아침" : h < 12 ? "오전" : h < 15 ? "낮" : h < 18 ? "오후" : h < 21 ? "저녁" : "밤";
  return `${pre} ${NUM[h % 12]} 시`;
}
const stripJosa = (t) => t.replace(/(에서는|에서도|에서|으로|에는|에도|에|로|은|는|이|가|을|를|의|안|앞|근처|쪽)$/, "");
function hits(text, cat) {
  if (!text) return false;
  if (cat.kw.some((k) => text.includes(k) && !(cat.not || []).some((n) => n.includes(k) && text.includes(n)))) return true;
  if (!cat.end) return false;
  return text.split(/[\s,.!?~()]+/).filter(Boolean).some((tok) => {
    if ((cat.not || []).some((n) => tok.includes(n))) return false;
    const base = stripJosa(tok);
    return cat.end.some((e) => base === e || (base.endsWith(e) && base.length <= 6));
  });
}
const pick = (dict, text) => Object.keys(dict).filter((k) => hits(text, dict[k]));
const scrub = (s) => String(s || "")
  .replace(/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g, "(지움)")
  .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "(지움)")
  .trim();
function hashStr(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h;
}

function matchDay(rec, lines) {
  const bucket = bucketOf(rec.hour);
  const places = pick(PLACE, rec.place);
  const worries = pick(WORRY, `${rec.worry} ${rec.place}`);
  const items = pick(ITEM, rec.hold);
  const scored = lines.map((l) => {
    let s = 0;
    const why = [];
    if (l.time === bucket) {
      s += 4;
      if (l.hour === rec.hour) { s += 1; why.push(`같은 ${hourKo(rec.hour)}`); }
      else why.push(`같은 ${bucket === "낮" ? "한낮" : bucket}`);
    } else if (near(l.time, bucket)) {
      s += 1.5;
      why.push("비슷한 시간대");
    }
    const p = l.place.find((c) => places.includes(c));
    if (p) { s += 2; why.push(PLACE[p].sim); }
    const w = l.worry.find((c) => worries.includes(c));
    if (w) { s += 2; why.push(WORRY[w].sim); }
    const it = l.item.find((c) => items.includes(c));
    if (it) { s += 1.5; why.push(ITEM[it].sim); }
    if (rec.age && l.age && rec.age === l.age) { s += 1.5; why.push(`같은 ${l.ageText}`); }
    else if (rec.age >= 20 && rec.age <= 29 && !l.age) { s += 0.5; why.push("같은 20대"); }
    return { l, s, why };
  });
  const best = Math.max(...scored.map((x) => x.s));
  const top = scored.filter((x) => x.s === best);
  const seed = hashStr(`${rec.date}|${rec.time}|${rec.place}|${rec.hold}|${rec.worry}`);
  const chosen = top[seed % top.length];
  return { line: chosen.l, why: chosen.why.length ? chosen.why : ["오늘과 가장 가까운 시간대"] };
}

function initToday(data, lines, people) {
  const form = document.getElementById("day-form");
  const out = document.getElementById("day-result");
  const err = document.getElementById("form-error");
  const $ = (id) => document.getElementById(id);
  const KEY = "exhibit20s.days.v1";
  const loadMine = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } };
  const saveMine = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30))); return true; } catch (e) { return false; } };
  let current = null;

  // 기본값: 오늘 날짜(2026년 안에서)와 지금 시각
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  $("d-date").value = today >= "2026-01-01" && today <= "2026-12-31" ? today : "2026-12-31";
  $("d-time").value = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const dateText = (v) => { const [y, m, dd] = v.split("-").map(Number); return `${y}. ${m}. ${dd}.`; };
  const timeText = (v) => { const [h, m] = v.split(":").map(Number); return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${pad(m)}`; };

  function cardHTML(rec, l) {
    const w = data.works.find((x) => x.id === l.work);
    const me = [`${rec.dateText} ${rec.timeText}`, rec.place, rec.hold].filter(Boolean).join(" | ");
    return `<div class="card-ex result" id="the-card">
        <p class="eyebrow">2026년 나의 하루</p>
        <p class="me">${esc(me)}</p>
        ${rec.worry ? `<p class="me-worry">마음에 걸린 일: ${esc(rec.worry)}</p>` : ""}
        <p class="eyebrow gap">가장 가까운 하루</p>
        <p class="who">${esc(l.year)} ${esc(l.book)} ${esc(l.person)}, ${esc(l.ageText)}</p>
        <p class="where">${esc(l.where)}</p>
        <blockquote>${esc(l.quote)}</blockquote>
        <p class="src">${esc(l.src)}</p>
        <dl>
          <div><dt>닮은 점</dt><dd>${esc(rec.why.join(", "))}</dd></div>
          <div><dt>다른 조건</dt><dd>${esc(l.diff)}<span class="dsrc">근거: ${esc(l.diffSrc)}</span></dd></div>
        </dl>
      </div>
      <div class="result-actions">
        <button class="btn primary" type="button" data-act="save">이미지로 저장</button>
        ${w && w.video ? `<button class="btn" type="button" data-act="watch" data-id="${esc(w.id)}">${esc(l.person)}의 하루 영상 보기</button>` : ""}
        <button class="btn ghost" type="button" data-act="again">다시 적기</button>
      </div>
      <p class="note" id="saved-note">${rec.stored ? "이 카드는 이 휴대폰에 저장되었습니다. 아래 목록에서 다시 볼 수 있습니다." : ""}</p>`;
  }

  function show(rec) {
    const l = lines.find((x) => x.id === rec.lineId);
    if (!l) return;
    current = { rec, l };
    out.innerHTML = cardHTML(rec, l);
  }

  function renderMine() {
    const list = loadMine();
    const box = $("mine");
    if (!list.length) { box.hidden = true; return; }
    box.hidden = false;
    $("mine-list").innerHTML = list.map((r) => {
      const l = lines.find((x) => x.id === r.lineId);
      return `<div class="mine-item">
        <button type="button" class="mine-open" data-rid="${r.id}"><strong>${esc(r.dateText)} ${esc(r.timeText)}</strong>${esc(r.place)}${l ? ` -> ${esc(l.person)}, ${esc(l.year)}` : ""}</button>
        <button type="button" class="mine-del" data-rid="${r.id}">지우기</button></div>`;
    }).join("");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const rec = {
      id: Date.now(),
      date: $("d-date").value,
      time: $("d-time").value,
      place: scrub($("d-place").value),
      hold: scrub($("d-hold").value),
      worry: scrub($("d-worry").value),
      age: parseInt($("d-age").value, 10) || null,
    };
    if (!rec.date || !rec.time || !rec.place) {
      err.textContent = "날짜, 시각, 있던 곳은 꼭 적어 주세요.";
      err.hidden = false;
      return;
    }
    err.hidden = true;
    rec.hour = parseInt(rec.time.split(":")[0], 10);
    rec.dateText = dateText(rec.date);
    rec.timeText = timeText(rec.time);
    const m = matchDay(rec, lines);
    rec.lineId = m.line.id;
    rec.why = m.why;
    const list = loadMine();
    list.unshift(rec);
    rec.stored = saveMine(list);
    show(rec);
    renderMine();
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  out.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b || !current) return;
    if (b.dataset.act === "save") {
      b.disabled = true;
      try { await saveCardImage(current.rec, current.l); }
      catch (x) { $("saved-note").textContent = "이미지를 만들지 못했습니다. 화면을 캡처해 저장해 주세요."; }
      b.disabled = false;
    } else if (b.dataset.act === "watch") {
      people.watch(b.dataset.id);
    } else if (b.dataset.act === "again") {
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => $("d-place").focus({ preventScroll: true }), 400);
    }
  });

  $("mine-list").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-rid]");
    if (!b) return;
    const id = Number(b.dataset.rid);
    const list = loadMine();
    if (b.classList.contains("mine-del")) {
      saveMine(list.filter((r) => r.id !== id));
      renderMine();
      if (current && current.rec.id === id) $("saved-note").textContent = "이 휴대폰의 목록에서 지웠습니다.";
    } else {
      const r = list.find((x) => x.id === id);
      if (r) { r.stored = true; show(r); out.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }
  });

  renderMine();
}

/* 원문 카드를 1080x1350 이미지로 그려 저장(공유) */
async function saveCardImage(rec, l) {
  const W = 1080, H = 1350, X = 84, MAXW = W - X * 2;
  const SERIF = '"Noto Serif KR", serif';
  const SANS = '"Noto Sans KR", sans-serif';
  const me = [`${rec.dateText} ${rec.timeText}`, rec.place, rec.hold].filter(Boolean).join(" | ");
  const who = `${l.year} ${l.book} ${l.person}, ${l.ageText}`;
  const texts = [me, rec.worry ? `마음에 걸린 일: ${rec.worry}` : "", who, l.where, l.quote, l.src, rec.why.join(", "), l.diff, `근거: ${l.diffSrc}`,
    "그들도 우리와 같은 나이였다", "2026년 나의 하루", "가장 가까운 하루", "닮은 점", "다른 조건", location.host].join(" ");
  if (document.fonts && document.fonts.load) {
    try {
      await Promise.all([
        document.fonts.load(`700 44px ${SERIF}`, texts), document.fonts.load(`600 40px ${SERIF}`, texts),
        document.fonts.load(`400 30px ${SANS}`, texts), document.fonts.load(`700 30px ${SANS}`, texts),
      ]);
    } catch (e) { /* 글꼴을 못 불러오면 기본 글꼴로 그린다 */ }
  }
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.textBaseline = "top";

  function wrap(text, font, maxW) {
    g.font = font;
    const out = [];
    let cur = "";
    for (const word of String(text).split(" ")) {
      const t = cur ? `${cur} ${word}` : word;
      if (g.measureText(t).width <= maxW) { cur = t; continue; }
      if (cur) out.push(cur);
      if (g.measureText(word).width <= maxW) { cur = word; continue; }
      let part = "";
      for (const ch of word) {
        if (g.measureText(part + ch).width > maxW) { out.push(part); part = ch; } else part += ch;
      }
      cur = part;
    }
    if (cur) out.push(cur);
    return out;
  }
  function layout(qSize) {
    const ops = [];
    let y = 84;
    const add = (text, font, color, lh, maxW = MAXW, x = X) => {
      for (const ln of wrap(text, font, maxW)) { ops.push({ t: ln, font, color, x, y }); y += lh; }
    };
    add("그들도 우리와 같은 나이였다 | 2026년 나의 하루", `500 26px ${SANS}`, "#4a6b82", 40);
    y += 26;
    add("나의 하루", `700 24px ${SANS}`, "#6888a1", 38);
    add(me, `700 34px ${SANS}`, "#1a2333", 50);
    if (rec.worry) add(`마음에 걸린 일: ${rec.worry}`, `400 28px ${SANS}`, "#3d4a5c", 42);
    y += 22;
    ops.push({ rule: true, y });
    y += 34;
    add("가장 가까운 하루", `700 24px ${SANS}`, "#6888a1", 38);
    add(who, `700 42px ${SERIF}`, "#2c4a63", 58);
    add(l.where, `400 26px ${SANS}`, "#5d6880", 40);
    y += 20;
    const qTop = y;
    add(l.quote, `600 ${qSize}px ${SERIF}`, "#1a2333", Math.round(qSize * 1.62), MAXW - 34, X + 34);
    ops.push({ bar: true, y1: qTop + 6, y2: y - Math.round(qSize * 0.5) });
    y += 8;
    add(l.src, `400 25px ${SANS}`, "#5d6880", 40);
    y += 22;
    add("닮은 점", `700 24px ${SANS}`, "#4a6b82", 38);
    add(rec.why.join(", "), `400 29px ${SANS}`, "#1a2333", 44);
    y += 14;
    add("다른 조건", `700 24px ${SANS}`, "#4a6b82", 38);
    add(l.diff, `400 29px ${SANS}`, "#1a2333", 44);
    add(`근거: ${l.diffSrc}`, `400 22px ${SANS}`, "#5d6880", 34);
    return { ops, y };
  }
  let plan = null;
  for (const q of [46, 42, 38, 34, 30]) {
    plan = layout(q);
    if (plan.y <= H - 110) break;
  }
  const shift = Math.max(0, Math.floor((H - 110 - plan.y) / 2));
  for (const op of plan.ops) {
    if (op.bar) { op.y1 += shift; op.y2 += shift; } else op.y += shift;
  }
  g.fillStyle = "#f3ede1";
  g.fillRect(0, 0, W, H);
  for (const op of plan.ops) {
    if (op.rule) { g.fillStyle = "#cdbfa6"; g.fillRect(X, op.y, MAXW, 2); continue; }
    if (op.bar) { g.fillStyle = "#6888a1"; g.fillRect(X, op.y1, 6, Math.max(20, op.y2 - op.y1)); continue; }
    g.font = op.font; g.fillStyle = op.color; g.fillText(op.t, op.x, op.y);
  }
  g.font = `400 22px ${SANS}`;
  g.fillStyle = "#8a8170";
  const foot = location.host ? `${location.host}  기획 국필호` : "기획 국필호";
  g.fillText(foot, X, H - 70);

  const blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/png"));
  const name = `my-day-card-${rec.date}.png`;
  const file = typeof File === "function" ? new File([blob], name, { type: "image/png" }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "나의 원문 카드" }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 5000);
}

/* ---------------- 구간별 페이지 ---------------- */
async function renderWork() {
  if (!window.__workHashBound) { window.__workHashBound = true; addEventListener("hashchange", () => { renderWork(); scrollTo(0, 0); }); }
  const data = await loadData();
  const id = decodeURIComponent(location.hash.slice(1)) || new URLSearchParams(location.search).get("id");
  const list = data.works;
  const i = Math.max(0, list.findIndex((w) => w.id === id));
  const w = list[i];
  document.title = `${w.order} ${w.title} | 그들도 우리와 같은 나이였다`;
  const who = [w.author, w.work, w.year && `(${w.year})`].filter(Boolean).join(" ");
  const player = w.video
    ? `<div class="player"><video src="${esc(mediaURL(w.video))}" ${w.poster ? `poster="${esc(w.poster)}"` : ""} controls playsinline preload="metadata"></video></div>`
    : `<div class="slot">${w.status === "planned" ? "이 구간의 영상은 아직 만들지 않았습니다." : esc(w.statusNote || STATUS[w.status])}</div>`;
  const facts = [
    ["순서", `${w.order}${w.length ? `, ${w.length}` : ""}`],
    ["인물(작중 나이)", w.character],
    ["시각과 장소", w.scene],
    ["상태", `${STATUS[w.status] || ""}${w.statusNote ? ` (${w.statusNote})` : ""}`],
  ].filter(([, v]) => v);
  const prev = list[i - 1], next = list[i + 1];
  const link = (x, cls, label) => x ? `<a class="${cls}" href="${x.link ? `index.html${x.link}` : `work.html#${encodeURIComponent(x.id)}`}">${label}<strong>${esc(x.order)} ${esc(x.title)}</strong></a>` : "";
  document.getElementById("work").innerHTML = `
    <p class="crumb"><a href="index.html">전시 메인</a> / <a href="index.html#people">인물 선택</a></p>
    <div class="work-head">
      <p class="eyebrow">${esc(w.order)}</p>
      <h1>${esc(w.title)}</h1>
      <p class="lead">${esc(who)}</p>
    </div>
    ${player}
    <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    ${w.summary ? `<div class="prose"><p>${esc(w.summary)}</p></div>` : ""}
    ${w.source ? `<p class="note">출처: ${esc(w.source)}</p>` : ""}
    ${w.video ? `<p class="note">${AI_NOTE}</p>` : ""}
    <nav class="pager">${link(prev, "prev", "이전")}${link(next, "next", "다음")}</nav>`;
}

/* ---------------- 상영관 ---------------- */
async function renderPlay() {
  const data = await loadData();
  const items = data.works.filter((w) => w.video);
  const v = document.getElementById("v");
  const hud = document.getElementById("hud");
  const overlay = document.getElementById("overlay");
  let k = 0;
  const play = () => {
    const w = items[k % items.length];
    v.src = mediaURL(w.video);
    hud.textContent = `${w.order}  ${w.title}  |  ${[w.author, w.work].filter(Boolean).join(" ")}`;
    v.play().catch(() => {});
  };
  v.addEventListener("ended", () => { k++; play(); });
  document.getElementById("start").addEventListener("click", () => {
    overlay.style.display = "none";
    document.documentElement.requestFullscreen?.().catch(() => {});
    play();
  });
  document.getElementById("fs").addEventListener("click", () => document.documentElement.requestFullscreen?.());
  document.getElementById("skip").addEventListener("click", () => { k++; play(); });
  document.getElementById("list").textContent = items.map((w) => `${w.order} ${w.title}`).join(" -> ");
}
