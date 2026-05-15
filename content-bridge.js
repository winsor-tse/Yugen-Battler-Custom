const PAGE_SOURCE = "AI_BATTLER_PAGE";
const EXTENSION_SOURCE = "AI_BATTLER_EXTENSION";

let aiPort = null;

const pendingPageRequests = new Set();

console.log("[AI Bridge] content-bridge.js loaded");

function connectToBackground() {
    if (aiPort) return aiPort;

    console.log("[AI Bridge] Connecting to background");

    aiPort = chrome.runtime.connect({
        name: "ai-loop"
    });

    aiPort.onMessage.addListener(message => {
        if (!message || typeof message !== "object") return;

        const requestId = message.requestId;

        if (!requestId || !pendingPageRequests.has(requestId)) {
            console.warn("[AI Bridge] Unmatched background response:", message);
            return;
        }

        pendingPageRequests.delete(requestId);

        if (message.type === "AI_RESULT") {
            console.log("[AI Bridge] AI_RESULT from background:", message);

            window.postMessage(
                {
                    source: EXTENSION_SOURCE,
                    type: "AI_RESULT",
                    requestId,
                    result: message.result
                },
                "*"
            );
            return;
        }

        if (message.type === "AI_ERROR") {
            console.error("[AI Bridge] AI_ERROR from background:", message.error);

            window.postMessage(
                {
                    source: EXTENSION_SOURCE,
                    type: "AI_ERROR",
                    requestId,
                    error: message.error
                },
                "*"
            );
        }
    });

    aiPort.onDisconnect.addListener(() => {
        console.warn("[AI Bridge] Background disconnected");

        for (const requestId of pendingPageRequests) {
            window.postMessage(
                {
                    source: EXTENSION_SOURCE,
                    type: "AI_ERROR",
                    requestId,
                    error: "Background service worker disconnected"
                },
                "*"
            );
        }

        pendingPageRequests.clear();
        aiPort = null;
    });

    return aiPort;
}

window.addEventListener("message", event => {
    if (event.source !== window) return;

    const message = event.data;

    if (!message || typeof message !== "object") return;
    if (message.source !== PAGE_SOURCE) return;
    if (message.type !== "AI_TICK") return;

    console.log("[AI Bridge] AI_TICK from battler.js:", message.requestId);

    const port = connectToBackground();

    pendingPageRequests.add(message.requestId);

    port.postMessage({
        type: "AI_TICK",
        requestId: message.requestId,
        worldState: message.worldState,
        pageUrl: message.pageUrl || window.location.href
    });
});