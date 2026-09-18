function pinsToast(msg, type = "success", durasi = 3500) {
  const icons = { success: "\u2713", error: "\u2715", info: "\u2139", warn: "\u26A0" };
  let wrap = document.getElementById("toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type] || ""}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("show")));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, durasi);
}

function pinsConfirm(msg, icon = "\u26A0\uFE0F", labelOk = "Ya, Lanjutkan", tipeBtnOk = "btn-danger") {
  return new Promise((resolve) => {
    let overlay = document.getElementById("modal-konfirmasi");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "modal-konfirmasi";
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
        <div class="modal modal-narrow">
          <div class="konfirm-icon" id="konfirm-icon"></div>
          <div class="konfirm-msg" id="konfirm-msg"></div>
          <div class="modal-actions center">
            <button class="btn btn-secondary" id="konfirm-batal">Batal</button>
            <button class="btn btn-danger" id="konfirm-ok">Ya, Lanjutkan</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }
    document.getElementById("konfirm-icon").textContent = icon;
    document.getElementById("konfirm-msg").textContent = msg;
    const btnOk = document.getElementById("konfirm-ok");
    const btnBatal = document.getElementById("konfirm-batal");
    btnOk.className = `btn ${tipeBtnOk}`;
    btnOk.textContent = labelOk;
    overlay.classList.add("show");

    const tutup = (val) => {
      overlay.classList.remove("show");
      btnOk.onclick = null;
      btnBatal.onclick = null;
      resolve(val);
    };
    btnOk.onclick = () => tutup(true);
    btnBatal.onclick = () => tutup(false);
  });
}

function isMobileView() {
  return window.innerWidth <= 700;
}
