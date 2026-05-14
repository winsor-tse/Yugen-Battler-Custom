import { getActiveTabURL } from "./utils.js";

const WS_URL = "ws://127.0.0.1:8765";

let ws = null;
let wsOpenPromise = null;
let reconnectTimer = null;
let keepAliveTimer = null;
let reconnectAttempts = 0;

const pendingWsRequests = new Map();

const COMMAND_TO_MESSAGE = {
  "play-all": { type: "PLAY-ALL" },
  "pause-all": { type: "PAUSE-ALL" },
  "toggle-1": { type: "TOGGLE", value: 0 },
  "toggle-2": { type: "TOGGLE", value: 1 },
  "toggle-3": { type: "TOGGLE", value: 2 },
  "toggle-4": { type: "TOGGLE", value: 3 },
  "toggle-5": { type: "TOGGLE", value: 4 },
  "toggle-6": { type: "TOGGLE", value: 5 },
  "toggle-7": { type: "TOGGLE", value: 6 },
  "toggle-8": { type: "TOGGLE", value: 7 },
  "toggle-9": { type: "TOGGLE", value: 8 }
};

async function safelySendTabMessage(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.warn("[Background] Could not send tab message:", message, error.message);
  }
}

async function messageHandler(command) {
  const activeTab = await getActiveTabURL();

  if (!activeTab || !activeTab.id || !activeTab.url) {
    console.warn("[Background] No active tab found");
    return;
  }

  if (!activeTab.url.includes("127.0.0.1")) {
    return;
  }

  await safelySendTabMessage(activeTab.id, {
    type: "LOAD"
  });

  const commandMessage = COMMAND_TO_MESSAGE[command];

  if (commandMessage) {
    await safelySendTabMessage(activeTab.id, commandMessage);
  }
}

chrome.commands.onCommand.addListener(command => {
  messageHandler(command);
  return true;
});

function getWsState() {
  if (!ws) return "CLOSED";

  switch (ws.readyState) {
    case WebSocket.CONNECTING:
      return "CONNECTING";
    case WebSocket.OPEN:
      return "OPEN";
    case WebSocket.CLOSING:
      return "CLOSING";
    case WebSocket.CLOSED:
      return "CLOSED";
    default:
      return "UNKNOWN";
  }
}

function startKeepAlive() {
  stopKeepAlive();

  keepAliveTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "ping",
          timestamp: Date.now()
        })
      );
    }
  }, 20000);
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

function rejectAllPendingWsRequests(reason) {
  for (const [requestId, pending] of pendingWsRequests.entries()) {
    clearTimeout(pending.timeoutId);
    pending.reject(new Error(reason));
    pendingWsRequests.delete(requestId);
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
  reconnectAttempts += 1;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    connectWebSocket().catch(error => {
      console.warn("[AI WS] Reconnect failed:", error.message);
    });
  }, delay);
}

function connectWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return Promise.resolve();
  }

  if (ws && ws.readyState === WebSocket.CONNECTING && wsOpenPromise) {
    return wsOpenPromise;
  }

  console.log("[AI WS] Connecting to:", WS_URL);

  ws = new WebSocket(WS_URL);

  wsOpenPromise = new Promise((resolve, reject) => {
    const openTimeout = setTimeout(() => {
      reject(new Error(`WebSocket open timeout. State: ${getWsState()}`));
    }, 5000);

    ws.addEventListener("open", () => {
      clearTimeout(openTimeout);
      reconnectAttempts = 0;
      console.log("[AI WS] Connected to:", WS_URL);
      startKeepAlive();
      resolve();
    });

    ws.addEventListener("message", event => {
      let message;

      try {
        message = JSON.parse(event.data);
      } catch {
        console.error("[AI WS] Invalid JSON from Python:", event.data);
        return;
      }

      if (message.type === "pong") {
        return;
      }

      const requestId = message.requestId;

      if (!requestId || !pendingWsRequests.has(requestId)) {
        console.warn("[AI WS] Unmatched message from Python:", message);
        return;
      }

      const pending = pendingWsRequests.get(requestId);
      clearTimeout(pending.timeoutId);
      pendingWsRequests.delete(requestId);

      pending.resolve(message);
    });

    ws.addEventListener("close", event => {
      console.warn("[AI WS] Closed:", event.code, event.reason);

      stopKeepAlive();
      rejectAllPendingWsRequests("WebSocket closed before Python replied");

      ws = null;
      wsOpenPromise = null;

      scheduleReconnect();
    });

    ws.addEventListener("error", () => {
      console.error("[AI WS] WebSocket error. Current state:", getWsState());
    });
  });

  return wsOpenPromise;
}

async function sendToPython(payload, timeoutMs = 5000) {
  await connectWebSocket();

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error(`WebSocket is not open. Current state: ${getWsState()}`);
  }

  const requestId = payload.requestId;

  if (!requestId) {
    throw new Error("Cannot send AI payload without requestId");
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingWsRequests.delete(requestId);
      reject(new Error(`Python bridge timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    pendingWsRequests.set(requestId, {
      resolve,
      reject,
      timeoutId
    });

    ws.send(JSON.stringify(payload));
  });
}

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== "ai-loop") {
    return;
  }

  console.log("[AI Background] Content bridge connected");

  port.onMessage.addListener(async message => {
    if (!message || typeof message !== "object") return;

    if (message.type !== "AI_TICK") {
      console.warn("[AI Background] Unknown message:", message);
      return;
    }

    try {
      const response = await sendToPython({
        type: "ai_tick",
        requestId: message.requestId,
        worldState: message.worldState,
        pageUrl: message.pageUrl,
        timestamp: Date.now()
      });

      port.postMessage({
        type: "AI_RESULT",
        requestId: message.requestId,
        result: response
      });
    } catch (error) {
      port.postMessage({
        type: "AI_ERROR",
        requestId: message.requestId,
        error: error.message
      });
    }
  });

  port.onDisconnect.addListener(() => {
    console.log("[AI Background] Content bridge disconnected");
  });
});

chrome.runtime.onInstalled.addListener(() => {
  connectWebSocket().catch(error => {
    console.warn("[AI WS] Initial connection failed:", error.message);
  });
});

chrome.runtime.onStartup.addListener(() => {
  connectWebSocket().catch(error => {
    console.warn("[AI WS] Startup connection failed:", error.message);
  });
});

connectWebSocket().catch(error => {
  console.warn("[AI WS] Boot connection failed:", error.message);
});