(function() {
    if (window.__tabmindInjected) return;
    window.__tabmindInjected = true;

    var startTime = Date.now();
    var timerInterval = null;
    var currentReason = null;

    function formatTime(ms) {
        var sec = Math.floor(ms / 1000);
        var min = Math.floor(sec / 60);
        sec = sec % 60;
        return min + "m " + sec + "s";
    }

    function getActiveTab(cb) {
        chrome.runtime.sendMessage({ type: "GET_TAB" }, function(tabs) {
            if (!tabs || !tabs.length) return;
            cb(tabs[0]);
        });
    }

    // ================= TIMER =================
    function ensureTimePill() {
        if (document.getElementById("tabmind-time-pill")) return;

        var pill = document.createElement("div");
        pill.id = "tabmind-time-pill";
        pill.innerHTML = `<span id="tabmind-time-text">⏱️ 0m 0s</span>`;

        var style = document.createElement("style");
        style.innerHTML = `
      #tabmind-time-pill {
        position: fixed;
        top: 16px;
        left: 16px;
        z-index: 2147483647;
        background: #000;
        color: #fff;
        padding: 10px 14px;
        border-radius: 999px;
        font-family: system-ui, sans-serif;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 10px 24px rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.2);
      }
    `;
        document.head.appendChild(style);
        document.body.appendChild(pill);

        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(function() {
            var elapsed = Date.now() - startTime;
            var el = document.getElementById("tabmind-time-text");
            if (el) el.textContent = "⏱️ " + formatTime(elapsed);
        }, 1000);
    }

    function removeTimePill() {
        var t = document.getElementById("tabmind-time-pill");
        if (t) t.remove();
        if (timerInterval) clearInterval(timerInterval);
    }

    // ================= REASON PILL (INLINE EDIT FIXED) =================
    function showFloatingPill(reason) {
        currentReason = reason;

        var existing = document.getElementById("tabmind-pill");
        if (existing) existing.remove();

        var pill = document.createElement("div");
        pill.id = "tabmind-pill";
        pill.style.top = "16px";
        pill.style.right = "16px";
        pill.style.position = "fixed";
        pill.style.zIndex = 2147483647;

        pill.innerHTML = `
      <div id="tabmind-pill-content">
        <span id="tabmind-pill-text" title="Click to edit"> ${reason}</span>
        <button id="tabmind-pill-close">✕</button>
      </div>
    `;

        var style = document.createElement("style");
        style.innerHTML = `
      #tabmind-pill-content {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #000;
        color: #fff;
        padding: 12px 14px;
        border-radius: 16px;
        font-size: 15px;
        font-weight: 700;
        box-shadow: 0 10px 24px rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.2);
        max-width: 320px;
        box-sizing: border-box;
      }
      #tabmind-pill-text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 240px;
        cursor: text;
      }
      #tabmind-pill-close {
        background: transparent;
        border: none;
        color: #fff;
        cursor: pointer;
        font-size: 14px;
        opacity: 0;
        transition: opacity .15s ease;
      }
      #tabmind-pill-content:hover #tabmind-pill-close {
        opacity: 0.9;
      }
      #tabmind-pill-input {
        background: transparent;
        border: 1px solid rgba(255,255,255,0.4);
        color: #fff;
        border-radius: 999px;
        padding: 4px 8px;
        font-size: 14px;
        width: 220px;
        outline: none;
      }
    `;
        document.head.appendChild(style);
        document.body.appendChild(pill);

        // Close
        document.getElementById("tabmind-pill-close").onclick = function(e) {
            e.stopPropagation();
            pill.remove();
        };

        // Inline edit (FIXED)
        var textEl = document.getElementById("tabmind-pill-text");
        textEl.onclick = function(e) {
            e.stopPropagation();

            var input = document.createElement("input");
            input.id = "tabmind-pill-input";
            input.value = currentReason;
            textEl.replaceWith(input);
            input.focus();
            input.select();

            input.onkeydown = function(ev) {
                if (ev.key === "Enter") {
                    var newReason = input.value.trim();
                    if (!newReason) return showFloatingPill(currentReason);

                    getActiveTab(function(tab) {
                        var payload = {};
                        payload[tab.id] = { reason: newReason, time: Date.now() };
                        chrome.storage.local.set(payload, function() {
                            showFloatingPill(newReason); // UI updates with new value
                        });
                    });
                }

                if (ev.key === "Escape") {
                    showFloatingPill(currentReason);
                }
            };

            input.onblur = function() {
                showFloatingPill(currentReason);
            };
        };
    }

    function removeReasonPill() {
        var p = document.getElementById("tabmind-pill");
        if (p) p.remove();
    }

    // ================= INPUT MODAL =================
    function showInputModal() {
        if (document.getElementById("tabmind-modal")) return;

        var modal = document.createElement("div");
        modal.id = "tabmind-modal";

        modal.innerHTML = `
      <div id="tabmind-box">
        <h3>Why did you open this tab?</h3>
        <input id="tabmind-input" placeholder="E.g. Research Ladakh trip" />
        <div id="tabmind-actions">
          <button id="tabmind-save">Save</button>
          <button id="tabmind-skip">Skip</button>
        </div>
      </div>
    `;

        var style = document.createElement("style");
        style.innerHTML = `
      #tabmind-box {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 360px;
        max-width: 360px;
        min-width: 360px;
        box-sizing: border-box;
        background: #ffffff;
        border-radius: 16px;
        padding: 16px;
        z-index: 2147483647;
        font-family: system-ui, sans-serif;
        box-shadow: 0 20px 40px rgba(0,0,0,0.25);
      }
      #tabmind-input {
        width: 100%;
        box-sizing: border-box;
        padding: 12px 16px;
        border-radius: 999px;
        border: 1px solid #e5e7eb;
        outline: none;
        font-size: 14px;
        margin-bottom: 12px;
        background: #0b0b0b;
        color: #fff;
      }
      #tabmind-actions { display: flex; gap: 10px; }
      #tabmind-actions button {
        flex: 1; padding: 10px; border-radius: 10px; border: none; font-weight: 600; cursor: pointer;
      }
      #tabmind-save { background: #111; color: #fff; }
      #tabmind-skip { background: #eee; color: #111; }
    `;
        document.head.appendChild(style);
        document.body.appendChild(modal);

        document.getElementById("tabmind-skip").onclick = function() {
            modal.remove();
        };

        document.getElementById("tabmind-save").onclick = function() {
            var reason = document.getElementById("tabmind-input").value;
            if (!reason) return modal.remove();

            getActiveTab(function(tab) {
                var payload = {};
                payload[tab.id] = { reason: reason, time: Date.now() };
                chrome.storage.local.set(payload, function() {
                    modal.remove();
                    showFloatingPill(reason);
                    ensureTimePill();
                });
            });
        };
    }

    // ================= SETTINGS APPLY =================
    function applySettings() {
        chrome.storage.local.get(["timerEnabled", "pillEnabled", "pillOpacity"], function(data) {
            if (data.timerEnabled === false) removeTimePill();
            else ensureTimePill();

            if (data.pillEnabled === false) {
                removeReasonPill();
            } else {
                getActiveTab(function(tab) {
                    chrome.storage.local.get(String(tab.id), function(res) {
                        if (res && res[tab.id]) showFloatingPill(res[tab.id].reason);
                    });
                });
            }

            var pill = document.getElementById("tabmind-pill");
            if (pill) pill.style.opacity = (data.pillOpacity || 100) / 100;
        });
    }

    chrome.runtime.onMessage.addListener(function(msg) {
        if (msg && msg.type === "SETTINGS_UPDATED") applySettings();
    });

    // ================= INIT =================
    getActiveTab(function(tab) {
        chrome.storage.local.get(String(tab.id), function(data) {
            if (data && data[tab.id]) showFloatingPill(data[tab.id].reason);
            else showInputModal();
        });
    });

    applySettings();
})();