(() => {
    const defaultAttributes = { allow_move_actions: false, moveSpeed: 400, turn_delay: 1000, target_filters: [] };
    let playerName = "";
    let playerMaxBattlerId;
    let currentBattlers = [];
    let currentAttributes = {};

    const injectBattlerScript = () => {
        var s = document.createElement('script');
        s.src = chrome.runtime.getURL('battler.js');
        (document.head||document.documentElement).appendChild(s);
        s.onload = function() {
            s.remove();
        };
    };

    const getBattlersKey = () => {
        return playerName + "-battlers";
    };

    const getAttributesKey = () => {
        return playerName + "-attributes";
    };

    const getMaxBattlerIdKey = () => {
        return playerName + "-max-battler-id";
    };

    const fetchBattlers = async () => {
        return new Promise((resolve) => {
            if (playerName) {
                const key = getBattlersKey();
                chrome.storage.sync.get([key], (obj) => {
                    resolve(obj[key] ? JSON.parse(obj[key]) : []);
                });
            } else {
                resolve([]);
            }
        });
    };

    const fetchAttributes = async () => {
        return new Promise((resolve) => {
            if (playerName) {
                const key = getAttributesKey();
                chrome.storage.sync.get([key], (obj) => {
                    resolve(obj[key] ? JSON.parse(obj[key]) : []);
                });
            } else {
                resolve({});
            }
        });
    };

    const fetchMaxBattlerId = async () => {
        let key = getMaxBattlerIdKey();
        return new Promise((resolve) => {
            chrome.storage.sync.get([key], (obj) => {
                resolve(obj[key] ? JSON.parse(obj[key]) : []);
            });
        });
    };
    const setMaxBattlerId = (battlerId) => {
        let key = getMaxBattlerIdKey();
        chrome.storage.sync.set({
            [key]: JSON.stringify(battlerId)
        });
    };

    const getNewBattlerId = async () => {
        let battlerId = parseInt(await fetchMaxBattlerId());
        if (!isNaN(battlerId)) {
            battlerId = battlerId + 1;
        } else {
            battlerId = 0;
        }
        setMaxBattlerId(battlerId);
        playerMaxBattlerId = battlerId;
    };

    const addNewBattler = async (battlerObj) => {
        await getNewBattlerId();
        battlerObj.id = playerMaxBattlerId;
        currentBattlers = [...currentBattlers, battlerObj].sort((a, b) => a.title < b.title? -1 : 1);

        const key = getBattlersKey();
        chrome.storage.sync.set({[key]: JSON.stringify(currentBattlers)});
    };

    const editBattler = async (battlerObj) => {
        let modified = false;
        if (battlerObj.hasOwnProperty("id")) {
            for (let i = 0; i < currentBattlers.length; ++i) {
                if (currentBattlers[i].id == battlerObj.id) {
                    const isActive = currentBattlers[i].active;
                    currentBattlers[i] = battlerObj;
                    currentBattlers[i].active = isActive;
                    modified = true;
                }
            }
        }
        if (modified) {
            const key = getBattlersKey();
            chrome.storage.sync.set({[key]: JSON.stringify(currentBattlers)});
        } else {
            console.log("Failed to edit battler: " + battlerObj.id);
        }
    };

    const updateBattlerActive = async (battlerId, active) => {
        for (let i = 0; i < currentBattlers.length; ++i) {
            if (currentBattlers[i].id == battlerId) {
                currentBattlers[i].active = active;
            }
        }
        const key = getBattlersKey();
        chrome.storage.sync.set({[key]: JSON.stringify(currentBattlers)});
    };

    const toggleBattlerByIndex = async (index) => {
        if (index >= 0 && index < currentBattlers.length) {
            currentBattlers[index].active = !currentBattlers[index].active;
            const key = getBattlersKey();
            chrome.storage.sync.set({[key]: JSON.stringify(currentBattlers)});
        }
    };

    const playAllBattlers = async () => {
        for (let i = 0; i < currentBattlers.length; ++i) {
            currentBattlers[i].active = true;
        }
        const key = getBattlersKey();
        chrome.storage.sync.set({[key]: JSON.stringify(currentBattlers)});
    };

    const pauseAllBattlers = async () => {
        for (let i = 0; i < currentBattlers.length; ++i) {
            currentBattlers[i].active = false;
        }
        const key = getBattlersKey();
        chrome.storage.sync.set({[key]: JSON.stringify(currentBattlers)});
    };

    const removeBattler = async (battlerId) => {
        currentBattlers = currentBattlers.filter((b) => b.id != battlerId);
        const key = getBattlersKey();
        chrome.storage.sync.set({[key]: JSON.stringify(currentBattlers)});
    };

    const sleep = async (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    };

    const refreshBattlers = async () => {
        currentBattlers = await fetchBattlers();
        window.postMessage({ type: 'refreshBattlers', value: currentBattlers }, '*');
    };

    const refreshAttributes = async () => {
        currentAttributes = await fetchAttributes();
        let attributes = {...currentAttributes};
        if (!attributes.hasOwnProperty("allow_move_actions") || attributes.allow_move_actions == null) {
            attributes.allow_move_actions = defaultAttributes.allow_move_actions;
        }
        if (!attributes.hasOwnProperty("moveSpeed") || attributes.moveSpeed == null) {
            attributes.moveSpeed = defaultAttributes.moveSpeed;
        }
        if (!attributes.hasOwnProperty("turn_delay") || attributes.turn_delay == null) {
            attributes.turn_delay = defaultAttributes.turn_delay;
        }
        if (!attributes.hasOwnProperty("target_filters") || attributes.target_filters == null) {
            attributes.target_allowlist = defaultAttributes.target_filters;
        }
        window.postMessage({ type: 'refreshAttributes', value: attributes }, '*');
    };

    const updateAttributes = async (attributes) => {
        currentAttributes = attributes;
        const key = getAttributesKey();
        chrome.storage.sync.set({[key]: JSON.stringify(attributes)});
    };

    const messageHandler = async (obj) => {
        const { type, value } = obj;
        if (type === "LOAD") {
            window.postMessage({ type: 'playerName' }, '*');
            window.postMessage({ type: 'playerMoveSpeed' }, '*');
        } else if (type === "ADD") {
            await addNewBattler(value);
        } else if (type === "EDIT") {
            await editBattler(value);
        } else if (type === "EDIT-ATTRIBUTES") {
            await updateAttributes(value);
        } else if (type === "PLAY-ALL") {
            await playAllBattlers();
        } else if (type === "PAUSE-ALL") {
            await pauseAllBattlers();
        } else if (type === "PAUSE") {
            await updateBattlerActive(value, false);
        } else if (type === "PLAY") {
            await updateBattlerActive(value, true);
        } else if (type === "DELETE") {
            await removeBattler(value);
        } else if (type === "TOGGLE") {
            await toggleBattlerByIndex(value);
        }
        await sleep(50);
        await refreshAttributes();
        await refreshBattlers();
        if (type === "LOAD-ATTRIBUTES") {
            return { name: playerName, attributes: currentAttributes, defaultAttributes: defaultAttributes };
        } else {
            return { name: playerName, battlers: currentBattlers };
        }
    };

    chrome.runtime.onMessage.addListener((obj, sender, response) => {
        if (response) {
            messageHandler(obj).then(response);
        } else {
            messageHandler(obj);
        }
        return true;
    });

    window.addEventListener('message', function(event) {
        if (event.data.type == "playerName") {
            playerName = event.data.text;
        } else if (event.data.type == "playerMoveSpeed") {
            defaultAttributes.moveSpeed = event.data.text;
        }
    });

    injectBattlerScript();
})();
