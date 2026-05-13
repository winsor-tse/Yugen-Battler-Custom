import { getActiveTabURL } from "./utils.js";

const messageHandler = async (command) => {
  const activeTab = await getActiveTabURL();
  if (activeTab.url.includes("127.0.0.1")) {
    chrome.tabs.sendMessage(activeTab.id, {
      type: "LOAD",
    });
    if (command === "play-all") {
      chrome.tabs.sendMessage(activeTab.id, {
        type: "PLAY-ALL",
      });
    } else if (command === "pause-all") {
      chrome.tabs.sendMessage(activeTab.id, {
        type: "PAUSE-ALL",
      });
    } else if (command === "toggle-1") {
      chrome.tabs.sendMessage(activeTab.id, {
        type: "TOGGLE",
        value: 0,
      });
    } else if (command === "toggle-2") {
      chrome.tabs.sendMessage(activeTab.id, {
        type: "TOGGLE",
        value: 1,
      });
    } else if (command === "toggle-3") {
      chrome.tabs.sendMessage(activeTab.id, {
        type: "TOGGLE",
        value: 2,
      });
    } else if (command === "toggle-4") {
      chrome.tabs.sendMessage(activeTab.id, {
        type: "TOGGLE",
        value: 3,
      });
    } else if (command === "toggle-5") {
      chrome.tabs.sendMessage(activeTab.id, {
        type: "TOGGLE",
        value: 4,
      });
    } else if (command === "toggle-6") {
      chrome.tabs.sendMessage(activeTab.id, {
        type: "TOGGLE",
        value: 5,
      });
    } else if (command === "toggle-7") {
      chrome.tabs.sendMessage(activeTab.id, {
        type: "TOGGLE",
        value: 6,
      });
    } else if (command === "toggle-8") {
      chrome.tabs.sendMessage(activeTab.id, {
        type: "TOGGLE",
        value: 7,
      });
    } else if (command === "toggle-9") {
      chrome.tabs.sendMessage(activeTab.id, {
        type: "TOGGLE",
        value: 8,
      });
    }
  }
};

chrome.commands.onCommand.addListener((command) => {
  messageHandler(command);
  return true;
});
