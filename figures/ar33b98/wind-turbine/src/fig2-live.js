// ------------------------------------------------------------------ Fig 2: the nacelle's moving parts
(() => {
  const stage2 = root.querySelector('[data-stage="2"]');
  if (!stage2) return;
  const NL = N2.makeNacelleLive(k, G, RIG);
  const P2 = D.fig2.P;
  const rotorG = Object.fromEntries(["behind", "hub", "ahead"].map((name) => [name, stage2.querySelector(`[data-rotor="${name}"]`)]));
  const slots = Object.fromEntries([...stage2.querySelectorAll("[data-slot]")].map((el) => [el.dataset.slot, el]));
  const ratio = N2.N.ring.r / N2.N.pinion.r;
  let hss = 0;
  let lastYaw = null;
  let lastBrake = -1;
  window.__fig2Readout = (s) => {
    const torque = s.rpm > 0.1 && s.kW > 0 ? `${(s.kW / M.SPEC.eta / ((s.rpm * 2 * Math.PI) / 60) / 1000).toFixed(2)} MN·m` : "no torque";
    return `${s.rpm.toFixed(1)} → ${Math.round(s.rpm * M.SPEC.gear).toLocaleString("en-US")} rpm · ${torque} · brake ${s.brake > 0.5 ? "on" : "off"}`;
  };
  window.__fig2Draw = (s, dt) => {
    const rotor = NL.rotorParts(P2, rig, s.rotor * DEG, s.pitch);
    for (const name of ["behind", "hub", "ahead"]) rotorG[name].innerHTML = rotor[name];
    hss = (hss + ((s.rpm * M.SPEC.gear) / 60) * 2 * Math.PI * dt) % (2 * Math.PI);
    if (slots.lock) slots.lock.innerHTML = NL.lockDotsSvg(P2, s.rotor * DEG);
    if (slots.coupling0) slots.coupling0.innerHTML = NL.couplingSvg(P2, hss, s.rpm * M.SPEC.gear, 0);
    if (slots.coupling1) slots.coupling1.innerHTML = NL.couplingSvg(P2, hss, s.rpm * M.SPEC.gear, 1);
    if (slots.brakedisc) slots.brakedisc.innerHTML = NL.brakeSvg(P2, hss, s.rpm * M.SPEC.gear, s.brake);
    if (Math.abs(s.brake - lastBrake) > 1e-4) {
      const off = NL.padOffset(s.brake);
      if (slots.pad0) slots.pad0.setAttribute("transform", k.translateAlong(P2, [-off, 0, 0]));
      if (slots.pad1) slots.pad1.setAttribute("transform", k.translateAlong(P2, [off, 0, 0]));
      if (slots.needle) slots.needle.innerHTML = NL.needleSvg(P2, 160 * s.brake);
      lastBrake = s.brake;
    }
    if (lastYaw === null || Math.abs(s.yaw - lastYaw) > 1e-3) {
      if (slots.ring) slots.ring.innerHTML = NL.ringTeethSvg(P2, s.yaw);
      for (const deg of N2.N.drives) if (slots[`pinion${deg}`]) slots[`pinion${deg}`].innerHTML = NL.pinionSvg(P2, deg, -s.yaw * ratio);
      lastYaw = s.yaw;
    }
    if (slots.instruments) slots.instruments.innerHTML = rig.roofInstrumentsSvg(P2, cupAngle, -s.yawErr);
    updateLive(s);
  };

  // ---------------------------------------------------------------- selecting a component
  // Hover previews a part, a click or tap pins it; the part lights up, the rest
  // steps down a tone, and the panel under the drawing says what it does, with a
  // live line from the model. The numbered row does the same by keyboard.
  const CAT = PARTS.PARTS;
  const panel = stage2.parentElement.querySelector(".wt-panel");
  const panelN = panel.querySelector(".wt-panel-n");
  const panelName = panel.querySelector(".wt-panel-name");
  const panelDoes = panel.querySelector(".wt-panel-does");
  const panelLive = panel.querySelector(".wt-panel-live");
  const picks = [...stage2.parentElement.querySelectorAll("[data-pick]")];
  let pinned = null;
  let shown = null;
  let liveText = "";
  const elsOf = (key) => [...stage2.querySelectorAll(`[data-comp="${key}"]`)];
  function updateLive(s) {
    if (!shown) return;
    const text = CAT[shown].live(s, M, { manual: typeof input.pitch === "number" });
    if (text !== liveText) panelLive.textContent = liveText = text;
  }
  function show(key) {
    for (const button of picks) button.setAttribute("aria-pressed", String(button.dataset.pick === pinned));
    const chip = picks.find((button) => button.dataset.pick === pinned);
    const row = chip && chip.parentElement;
    if (row && row.scrollWidth > row.clientWidth) {
      const left = chip.offsetLeft - row.offsetLeft;
      if (left < row.scrollLeft || left + chip.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollLeft = Math.max(0, left - 12);
    }
    if (key === shown) return;
    stage2.querySelectorAll("[data-on]").forEach((el) => el.removeAttribute("data-on"));
    shown = key;
    liveText = "";
    if (!key) {
      stage2.removeAttribute("data-focus");
      panel.setAttribute("data-empty", "");
      panelN.textContent = panelName.textContent = panelDoes.textContent = panelLive.textContent = "";
      return;
    }
    stage2.setAttribute("data-focus", key);
    for (const el of elsOf(key)) el.setAttribute("data-on", "");
    panel.removeAttribute("data-empty");
    panelN.textContent = String(PARTS.ORDER.indexOf(key) + 1).padStart(2, "0");
    panelName.textContent = CAT[key].name;
    panelDoes.textContent = CAT[key].does;
    updateLive(state);
  }
  const keyAt = (target) => target.closest?.("[data-comp]")?.dataset.comp ?? null;
  stage2.addEventListener("pointermove", (e) => {
    if (pinned || e.pointerType !== "mouse") return;
    show(keyAt(e.target));
  });
  stage2.addEventListener("pointerleave", () => {
    if (!pinned) show(null);
  });
  stage2.addEventListener("click", (e) => {
    const key = keyAt(e.target);
    pinned = key && key !== pinned ? key : null;
    show(pinned);
  });
  picks.forEach((button, i) => {
    button.addEventListener("click", () => {
      pinned = pinned === button.dataset.pick ? null : button.dataset.pick;
      show(pinned);
    });
    button.addEventListener("keydown", (e) => {
      const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (step) {
        e.preventDefault();
        const next = picks[(i + step + picks.length) % picks.length];
        next.focus();
        pinned = next.dataset.pick;
        show(pinned);
      }
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && shown) {
      pinned = null;
      show(null);
    }
  });
})();
