chrome.runtime.onInstalled.addListener(function() {
    console.log("TabMind installed");
});

// When popup opens, check current tab purpose and trigger modal if missing
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg && msg.type === "CHECK_AND_PROMPT") {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (!tabs || !tabs.length) return;

            var tab = tabs[0];
            if (!tab.id || !tab.url) return;

            chrome.storage.local.get(String(tab.id), function(data) {
                if (!data || !data[tab.id]) {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ["content.js"]
                    });
                }
            });
        });
    }

    if (msg && msg.type === "GET_TAB") {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            sendResponse(tabs);
        });
        return true;
    }
});

// Reminder scheduling (respects 10m / 30m setting)
chrome.tabs.onCreated.addListener(function(tab) {
    if (!tab || !tab.id) return;

    chrome.storage.local.get(["reminderMinutes"], function(data) {
        var mins = data.reminderMinutes || 30;
        chrome.alarms.create("remind-" + tab.id, { delayInMinutes: mins });
    });
});

chrome.alarms.onAlarm.addListener(function(alarm) {
    var tabId = alarm.name.replace("remind-", "");
    chrome.storage.local.get(tabId, function(data) {
        if (data && data[tabId]) {
            chrome.notifications.create({
                type: "basic",
                title: "TabMind Reminder",
                message: "Reason: " + data[tabId].reason
            });
        }
    });
});