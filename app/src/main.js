import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { transform } from "../../engine/transform.js";
import { buildHtml } from "../../engine/template.js";

const els = {};
let activeId = null; // currently-running applet

// --- helpers ---------------------------------------------------------------

const basename = (p) => p.split(/[\\/]/).pop();
const isApplet = (p) => /\.(jsx|tsx|js|ts)$/i.test(p);

// Stable id per file path (djb2 -> base36): same file -> same state namespace
// and same library entry.
function appletId(path) {
  let h = 5381;
  for (let i = 0; i < path.length; i++) h = ((h << 5) + h + path.charCodeAt(i)) | 0;
  return "a" + (h >>> 0).toString(36);
}

let toastTimer;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (els.toast.hidden = true), 3200);
}

// --- core flow: read -> transform -> stage -> run --------------------------

async function launch(path) {
  const name = basename(path);
  const id = appletId(path);
  let source;
  try {
    source = await invoke("read_source", { path });
  } catch (e) {
    return toast(`Couldn't read ${name}`);
  }

  const { code, imports, needsReactShim } = transform(source);
  const seed = await invoke("state_get", { id }); // persisted state JSON, "{}" if none
  const html = buildHtml({ code, imports, needsReactShim, title: name, appletId: id, seed });

  await invoke("stage_applet", { id, html });
  await invoke("remember_applet", { entry: { id, name, path, lastOpened: Date.now() } });

  activeId = id;
  els.stageTitle.textContent = name;
  // cache-bust so a reload re-fetches freshly staged HTML (picks up file edits)
  els.applet.src = `artie://localhost/applet/${id}?t=${Date.now()}`;
  els.dropzone.hidden = true;
  els.stage.hidden = false;
  refreshLibrary();
}

function showDropzone() {
  activeId = null;
  els.applet.src = "about:blank";
  els.stage.hidden = true;
  els.dropzone.hidden = false;
  refreshLibrary();
}

// --- sidebar ---------------------------------------------------------------

async function refreshLibrary() {
  const items = await invoke("list_applets");
  els.libraryList.innerHTML = "";
  for (const it of items) {
    const li = document.createElement("li");
    if (it.id === activeId) li.classList.add("active");

    const open = document.createElement("button");
    open.className = "lib-open";
    open.title = it.path;
    open.textContent = it.name;
    open.addEventListener("click", () => launch(it.path));

    const forget = document.createElement("button");
    forget.className = "lib-forget";
    forget.title = "Forget";
    forget.textContent = "×";
    forget.addEventListener("click", async (e) => {
      e.stopPropagation();
      await invoke("forget_applet", { id: it.id });
      if (it.id === activeId) showDropzone();
      else refreshLibrary();
    });

    li.append(open, forget);
    els.libraryList.append(li);
  }
}

// --- settings --------------------------------------------------------------

function wireSettings() {
  els.settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    els.settingsMenu.hidden = !els.settingsMenu.hidden;
    els.about.hidden = true;
  });
  document.addEventListener("click", () => (els.settingsMenu.hidden = true));
  els.settingsMenu.addEventListener("click", (e) => e.stopPropagation());

  els.settingsMenu.querySelectorAll("button[data-act]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const act = btn.dataset.act;
      if (act === "clear") {
        await invoke("clear_library");
        showDropzone();
        els.settingsMenu.hidden = true;
      } else if (act === "reveal") {
        try {
          await invoke("reveal_data_dir");
        } catch (e) {
          toast("Couldn't open data folder");
        }
        els.settingsMenu.hidden = true;
      } else if (act === "about") {
        els.about.hidden = !els.about.hidden;
      }
    });
  });
}

// --- wiring ----------------------------------------------------------------

window.addEventListener("DOMContentLoaded", async () => {
  Object.assign(els, {
    libraryList: document.querySelector("#library-list"),
    dropzone: document.querySelector("#dropzone"),
    stage: document.querySelector("#stage"),
    stageTitle: document.querySelector("#stage-title"),
    applet: document.querySelector("#applet"),
    reload: document.querySelector("#reload"),
    close: document.querySelector("#close"),
    overlay: document.querySelector("#drop-overlay"),
    toast: document.querySelector("#toast"),
    settingsBtn: document.querySelector("#settings-btn"),
    settingsMenu: document.querySelector("#settings-menu"),
    about: document.querySelector("#about"),
  });

  // Applets post their state up here; persist it to disk (debounced per applet).
  const saveTimers = {};
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || d.source !== "artie" || !d.id) return;
    clearTimeout(saveTimers[d.id]);
    saveTimers[d.id] = setTimeout(() => {
      invoke("state_set", { id: d.id, json: JSON.stringify(d.state || {}) }).catch(() => {});
    }, 250);
  });

  els.close.addEventListener("click", showDropzone);
  els.reload.addEventListener("click", async () => {
    const items = await invoke("list_applets");
    const cur = items.find((i) => i.id === activeId);
    if (cur) launch(cur.path);
  });

  wireSettings();

  await getCurrentWebview().onDragDropEvent((event) => {
    const { type } = event.payload;
    if (type === "over" || type === "enter") {
      els.overlay.hidden = false;
    } else if (type === "leave" || type === "cancel") {
      els.overlay.hidden = true;
    } else if (type === "drop") {
      els.overlay.hidden = true;
      const path = (event.payload.paths || []).find(isApplet);
      if (path) launch(path);
      else toast("Drop a .jsx / .tsx file");
    }
  });

  refreshLibrary();
});
