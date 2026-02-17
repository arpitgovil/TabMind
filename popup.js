document.addEventListener("DOMContentLoaded", function() {
    var timerToggle = document.getElementById("timerToggle");
    var pillToggle = document.getElementById("pillToggle");
    var siteToggle = document.getElementById("siteToggle");
    var opacityRange = document.getElementById("opacityRange");

    chrome.storage.local.get(
        ["timerEnabled", "pillEnabled", "perSite", "pillOpacity"],
        function(data) {
            timerToggle.checked = data.timerEnabled !== false;
            pillToggle.checked = data.pillEnabled !== false;
            siteToggle.checked = !!data.perSite;
            opacityRange.value = data.pillOpacity || 100;
        }
    );

    function notify() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (!tabs || !tabs.length) return;
            chrome.tabs.sendMessage(tabs[0].id, { type: "SETTINGS_UPDATED" });
        });
    }

    timerToggle.onchange = function() {
        chrome.storage.local.set({ timerEnabled: timerToggle.checked }, notify);
    };

    pillToggle.onchange = function() {
        chrome.storage.local.set({ pillEnabled: pillToggle.checked }, notify);
    };

    siteToggle.onchange = function() {
        chrome.storage.local.set({ perSite: siteToggle.checked }, notify);
    };

    opacityRange.oninput = function() {
        chrome.storage.local.set({ pillOpacity: Number(opacityRange.value) }, notify);
    };
});