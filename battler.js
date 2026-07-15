console.log("[Yuugen Battler] battler.js injected into page", window.location.href);
// AI WebSocket bridge client.
// This file runs in the PAGE context, so DO NOT use chrome.runtime here.
const PAGE_SOURCE = "AI_BATTLER_PAGE";
const EXTENSION_SOURCE = "AI_BATTLER_EXTENSION";

const AI_LOOP_DELAY_MS = 150;
const AI_REQUEST_TIMEOUT_MS = 5000;

let aiLoopRunning = false;
let aiLoopStarted = false;

const pendingAiRequests = new Map();

if (!Date.now) {
    Date.now = function () { return new Date().getTime(); }
}

function createRequestId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function buildWorldState() {
    const player = getPlayer();
    const rawEntities = getRegistry().entities || {};
    const entities = Object.values(rawEntities);

    return {
        timestamp: Date.now(),

        player: {
            id: player.id,
            name: player.name,
            mapX: player.mapX,
            mapY: player.mapY,
            direction: player.direction,
            hp: player.hp,
            maxHp: player.maxHp,
            mp: player.mp,
            maxMp: player.maxMp
        },

        entities: entities.map(entity => ({
            id: entity.id,
            name: entity.name,
            type: entity.type,
            isCurrentPlayer: entity.isCurrentPlayer,
            mapX: entity.mapX,
            mapY: entity.mapY,
            hp: entity.hp,
            maxHp: entity.maxHp,
            mp: entity.mp,
            maxMp: entity.maxMp,
            distance: getDistance(entity.mapX, entity.mapY)
        }))
    };
}

window.addEventListener("message", event => {
    if (event.source !== window) return;

    const message = event.data;

    if (!message || typeof message !== "object") return;
    if (message.source !== EXTENSION_SOURCE) return;

    const requestId = message.requestId;

    if (!requestId || !pendingAiRequests.has(requestId)) {
        console.warn("[AI Battler] Unmatched extension response:", message);
        return;
    }

    const pending = pendingAiRequests.get(requestId);
    clearTimeout(pending.timeoutId);
    pendingAiRequests.delete(requestId);

    if (message.type === "AI_ERROR") {
        pending.reject(new Error(message.error || "Unknown AI error"));
        return;
    }

    if (message.type === "AI_RESULT") {
        pending.resolve(message.result);
    }
});

function sendAiTick(worldState) {
    return new Promise((resolve, reject) => {
        const requestId = createRequestId();

        const timeoutId = setTimeout(() => {
            pendingAiRequests.delete(requestId);
            reject(new Error(`AI request timed out after ${AI_REQUEST_TIMEOUT_MS}ms`));
        }, AI_REQUEST_TIMEOUT_MS);

        pendingAiRequests.set(requestId, {
            resolve,
            reject,
            timeoutId
        });

        window.postMessage(
            {
                source: PAGE_SOURCE,
                type: "AI_TICK",
                requestId,
                worldState,
                pageUrl: window.location.href
            },
            "*"
        );
    });
}

function getValidSpellTargets() {
    const rawEntities = getRegistry().entities || {};
    const entities = Object.values(rawEntities);

    return entities.filter(entity => {
        if (!entity) return false;
        if (entity.isCurrentPlayer) return false;
        if (entity.mapX === undefined || entity.mapY === undefined) return false;
        if (typeof entity.hp === "number" && entity.hp <= 0) return false;

        return true;
    });
}

function getEntityById(entityId) {
    if (entityId === undefined || entityId === null || entityId === "") {
        return null;
    }

    return getValidSpellTargets().find(entity => {
        return String(entity.id) === String(entityId);
    }) || null;
}

function getClosestSpellTarget() {
    const targets = getValidSpellTargets();

    if (targets.length === 0) {
        return null;
    }

    const monsters = targets.filter(entity => entity.type === "monster");
    const candidates = monsters.length > 0 ? monsters : targets;

    candidates.sort((a, b) => {
        const distanceA = getDistance(a.mapX, a.mapY);
        const distanceB = getDistance(b.mapX, b.mapY);

        return distanceA - distanceB;
    });

    return candidates[0];
}

function parseAiMoveCommand(moveCommand) {
    if (!moveCommand || typeof moveCommand !== "string") {
        return {
            type: "none"
        };
    }

    const parts = moveCommand.split(":");
    const command = parts[0];

    if (command === "up" || command === "down" || command === "left" || command === "right") {
        return {
            type: "move",
            direction: command
        };
    }

    if (command === "direction") {
        const direction = parts[1];

        if (direction === "up" || direction === "down" || direction === "left" || direction === "right") {
            return {
                type: "face",
                direction
            };
        }

        return {
            type: "invalid",
            reason: `Invalid direction command: ${moveCommand}`
        };
    }

    if (command === "attack") {
        return {
            type: "attack"
        };
    }

    if (command === "castSpell") {
        const spellIndex = Number(parts[1]);
        const targetId = parts.length >= 3 && parts[2] !== "" ? parts[2] : null;

        if (!Number.isInteger(spellIndex)) {
            return {
                type: "invalid",
                reason: `Invalid spell index in command: ${moveCommand}`
            };
        }

        return {
            type: "castSpell",
            spellIndex,
            targetId
        };
    }

    return {
        type: "invalid",
        reason: `Unknown AI move command: ${moveCommand}`
    };
}

function applyAiAction(actionData) {
    if (!actionData || typeof actionData !== "object") {
        console.warn("[AI Battler] Invalid action data:", actionData);
        return;
    }

    console.log("[AI Battler] Received action:", actionData);

    const parsedCommand = parseAiMoveCommand(actionData.move);

    if (parsedCommand.type === "move") {
        movePlayerDirection(parsedCommand.direction);

    } else if (parsedCommand.type === "face") {
        playerFaceDirection(parsedCommand.direction);

    } else if (parsedCommand.type === "attack") {
        getNetwork().playerAttack();

    } else if (parsedCommand.type === "castSpell") {
        const target = parsedCommand.targetId
            ? getEntityById(parsedCommand.targetId)
            : getClosestSpellTarget();

        if (!target) {
            console.warn("[AI Battler] Cannot cast spell. No valid target found.", {
                command: actionData.move,
                parsedCommand
            });
            return;
        }

        const direction = getDirection(target.mapX, target.mapY);

        if (direction) {
            playerFaceDirection(direction);
        }

        console.log("[AI Battler] Casting spell:", {
            spellIndex: parsedCommand.spellIndex,
            targetId: target.id,
            targetName: target.name,
            targetType: target.type,
            distance: getDistance(target.mapX, target.mapY)
        });

        getNetwork().playerSpellCast(parsedCommand.spellIndex, target.id);

    } else if (parsedCommand.type === "invalid") {
        console.warn("[AI Battler]", parsedCommand.reason);
    }

    if (actionData.reset) {
        //getNetwork().playerHp(-1);
        console.log("[AI Battler] Reset");
        //self cast 9
        getNetwork().playerSpellCast(4, getPlayer().id);
    }
}

async function runAiLoop() {
    if (aiLoopRunning) {
        console.warn("[AI Battler] AI loop already running");
        return;
    }

    aiLoopRunning = true;

    console.log("[AI Battler] AI loop started");

    while (aiLoopRunning) {
        try {
            const worldState = buildWorldState();
            const actionData = await sendAiTick(worldState);

            applyAiAction(actionData);
        } catch (error) {
            console.error("[AI Battler] Error:", error);
        } finally {
            await delay(AI_LOOP_DELAY_MS);
        }
    }
}

function startAiLoopOnce() {
    if (aiLoopStarted) return;

    aiLoopStarted = true;
    runAiLoop();
}

function stopAiLoop() {
    aiLoopRunning = false;
    aiLoopStarted = false;
    console.log("[AI Battler] AI loop stopped");
}

window.__aiBattler = {
    start: startAiLoopOnce,
    stop: stopAiLoop,
    buildWorldState
};
//DO not change anything below

const getWorld = () => {
    return window.gameRef?.scene?.keys?.WORLD;
};

const getMap = () => {
    return getWorld()?.map;
};

const getNetwork = () => {
    return window.gameRef?.scene?.keys?.NETWORK;
};

const getRegistry = () => {
    return window.gameRef?.registry;
};

const getPlayer = () => {
    return getRegistry()?.player;
};

const movePlayerDelta = (deltaX, deltaY) => {
    getPlayer().mapX += deltaX;
    getPlayer().mapY += deltaY;
    getWorld().mapObjAlphaCheck();
    getNetwork().playerMoveDelta(deltaX, deltaY);
    getPlayer().scrollX = getMap().tileWidth * -deltaX;
    getPlayer().scrollY = getMap().tileHeight * -deltaY;
    getPlayer().sprite.animate("walk");
};

const movePlayerDirection = (direction) => {
    if (direction) {
        if (getPlayer().direction != direction) {
            playerFaceDirection(direction);
        }
        if (direction == "up") {
            movePlayerDelta(0, -1);
        } else if (direction == "down") {
            movePlayerDelta(0, 1);
        } else if (direction == "left") {
            movePlayerDelta(-1, 0);
        } else if (direction == "right") {
            movePlayerDelta(1, 0);
        }
    }
};

const playerFaceDirection = (direction) => {
    getPlayer().direction = direction;
    getNetwork().playerSetFacing();
    getPlayer().sprite.animate("stand");
};

const isEntityLocation = (x, y) => {
    const entities = getRegistry().entities;
    for (const index in entities) {
        if (!entities[index].isCurrentPlayer) {
            if (entities[index].mapX === x && entities[index].mapY === y) {
                return true;
            }
        }
    }
    return false;
};

const isTileBlocked = (x, y) => {
    for (let i = 0; i < getMap().layers.length; ++i) {
        if (getMap().layers[i].name === "blocked") {
            let tile = getMap().getTileAt(x, y, false, i);
            return !(!tile || tile.index !== 1);
        }
    }
    return x < 0 || y < 0 || x >= getMap().width || y >= getMap().height;
};

const isBlocked = (x, y) => {
    return isTileBlocked(x, y) || isEntityLocation(x, y);
};

const getDirection = (mapX, mapY) => {
    const xOffset = mapX - getPlayer().mapX;
    const yOffset = mapY - getPlayer().mapY;
    if (xOffset == 0 && yOffset == 0) {
        return getPlayer().direction;
    } else if (Math.abs(xOffset) > Math.abs(yOffset)) {
        if (xOffset < 0) {
            return "left";
        } else {
            return "right";
        }
    } else {
        if (yOffset < 0) {
            return "up";
        } else {
            return "down";
        }
    }
};

const getTileDistance = (tile, tile2) => {
    return Math.abs(tile.mapX - tile2.mapX) + Math.abs(tile.mapY - tile2.mapY);
};

const getDistance = (x, y) => {
    const mapX = getPlayer().mapX;
    const mapY = getPlayer().mapY;
    return getTileDistance({ mapX: x, mapY: y }, { mapX: mapX, mapY: mapY });
};

const getTileMagnitude = (tile, tile2) => {
    return Math.round(Math.sqrt(Math.pow(tile.mapX - tile2.mapX, 2) + Math.pow(tile.mapY - tile2.mapY, 2)));
};

const getMagnitude = (x, y) => {
    const mapX = getPlayer().mapX;
    const mapY = getPlayer().mapY;
    return getTileMagnitude({ mapX: x, mapY: y }, { mapX: mapX, mapY: mapY });
};

const getTilesAroundTarget = (mapX, mapY, distance) => {
    let x = distance, y = 0;
    let P = 1 - distance;
    let tiles = [];
    while (x >= y) {
        for (let i = 0; i < 4; ++i) {
            if (x == 0 && i % 2 == 0 || y == 0 && Math.floor(i / 2) == 0) continue;
            let xOffset = x * (i % 2 == 0 ? 1 : -1);
            let yOffset = y * (Math.floor(i / 2) == 0 ? 1 : -1);

            tiles.push({ mapX: (mapX + xOffset), mapY: (mapY + yOffset) });
            if (Math.abs(xOffset) != Math.abs(yOffset)) {
                tiles.push({ mapX: (mapX + yOffset), mapY: (mapY + xOffset) });
            }
        }

        if (P > 0) {
            P -= 2 * (--x);
        }
        P += 2 * (++y) + 1;
    }
    return tiles;
};

const getPercent = (value, max) => {
    return Math.round(100 * (value / max));
};

(() => {
    let battlers = [];
    let attributes = {};
    let actionsUsed = new Map();
    let groupActionsUsed = new Map();
    let actionTargetTimers = new Map();
    let lockedAction;
    let actionTargetTile = null;
    let actionMoveTile = null;
    let loadingTiles = [];
    let avoidTiles = [];
    let currentPath = [];
    let targetTiles = [];
    let avoidZoneMap = new Map();
    let lastTurn = 0;
    let lastMove = 0;
    let lastAction = 0;

    const getGroup = (groups, group_id) => {
        if (group_id) {
            for (const group of groups) {
                if (group.id == group_id) {
                    return group;
                }
            }
        }
        return null;
    }

    const satisfiesTargetType = (target, action) => {
        const getTargetPartyMember = (target) => {
            const partyMembers = getRegistry().partyMembers;
            for (const member of partyMembers) {
                if (member.name == target.name) return member;
            }
            return null;
        };
        if (action.target_type == "self") {
            if (!target.isCurrentPlayer) return false;
        } else if (action.target_type == "monster") {
            if (target.type != "monster") return false;
        } else if (action.target_type == "player") {
            if (target.type != "player") return false;
            if (getTargetPartyMember(target)) return false;
        } else if (action.target_type == "party") {
            if (!getTargetPartyMember(target)) return false;
        } else if (action.target_type == "adventurer") {
            const member = getTargetPartyMember(target);
            if (!member || member.classId != 1) return false;
        } else if (action.target_type == "bard") {
            const member = getTargetPartyMember(target);
            if (!member || member.classId != 5) return false;
        } else if (action.target_type == "knave") {
            const member = getTargetPartyMember(target);
            if (!member || member.classId != 3) return false;
        } else if (action.target_type == "mystic") {
            const member = getTargetPartyMember(target);
            if (!member || member.classId != 4) return false;
        } else if (action.target_type == "priest") {
            const member = getTargetPartyMember(target);
            if (!member || member.classId != 6) return false;
        } else if (action.target_type == "warrior") {
            const member = getTargetPartyMember(target);
            if (!member || member.classId != 2) return false;
        }
        return true;
    };

    const satisfiesTargetTriggers = (target, action) => {
        if (action.hasOwnProperty("target_triggers")) {
            for (const trigger of action.target_triggers) {
                const { type, amount } = trigger;

                if (type == "hp") {
                    if (getPercent(target.hp, target.maxHp) > amount) {
                        return false;
                    }
                } else if (type == "mp") {
                    if (getPercent(target.mp, target.maxMp) > amount) {
                        return false;
                    }
                }
            }
        }
        return true;
    };

    const satisfiesTargetTimer = (target, battler, action) => {
        if (action.hasOwnProperty("target_timer")) {
            const targetTimerKey = battler.id + "-" + action.id + "-" + target.id;
            if (actionTargetTimers.has(targetTimerKey) && (actionTargetTimers.get(targetTimerKey) + action.target_timer > Date.now())) {
                return false;
            }
        }
        return true;
    };

    const satisfiesName = (target, action) => {
        let allowlist = [];
        let denylist = [];
        const target_name = target.name.toLowerCase();
        if (attributes.target_filters) {
            for (const filter of attributes.target_filters) {
                const filter_name = filter.target_name.toLowerCase();
                if (filter.target_type == action.target_type) {
                    if (filter.type == "allowlist") {
                        allowlist.push(filter_name);
                    } else if (filter.type == "denylist") {
                        denylist.push(filter_name);
                    }
                }
            }
        }
        if (allowlist.length > 0) {
            let found = false;
            for (const filter_name of allowlist) {
                if (target_name.includes(filter_name)) {
                    found = true;
                }
            }
            if (!found) {
                return false;
            }
        }
        if (denylist.length > 0) {
            let found = false;
            for (const filter_name of denylist) {
                if (target_name.includes(filter_name)) {
                    found = true;
                }
            }
            if (found) {
                return false;
            }
        }
        return true;
    };

    const filterTarget = (target, battler, action) => {
        if (!satisfiesTargetType(target, action)) return false;
        if (!satisfiesTargetTriggers(target, action)) return false;
        if (!satisfiesTargetTimer(target, battler, action)) return false;
        if (!satisfiesName(target, action)) return false;
        if (action.type == "avoid" || action.type == "follow") {
            if (target.isCurrentPlayer) {
                return false;
            }
        }
        return true;
    };

    const getFilteredTargets = (battler, action) => {
        let targets = [];
        if (action.type == "attack" || action.type == "cast" || action.type == "avoid" || action.type == "follow") {
            const entities = getRegistry().entities;
            for (const index in entities) {
                if (filterTarget(entities[index], battler, action)) {
                    targets.push(entities[index]);
                }
            }
        } else if (action.type == "pickup") {
            const items = getRegistry().mapItems;
            for (const index in items) {
                if (filterTarget(items[index], battler, action)) {
                    targets.push(items[index]);
                }
            }
        } else if (action.type == "idle") {
            targets.push(getPlayer());
        } else {
            console.log("Invalid action.");
            console.log(action);
        }
        return targets;
    };

    const getAllTargetActionTiles = (target, action) => {
        let tiles = [];
        if (action.type == "attack") {
            tiles.push({ mapX: target.mapX + 1, mapY: target.mapY });
            tiles.push({ mapX: target.mapX - 1, mapY: target.mapY });
            tiles.push({ mapX: target.mapX, mapY: target.mapY + 1 });
            tiles.push({ mapX: target.mapX, mapY: target.mapY - 1 });
        } else if (action.type == "cast") {
            if (action.subtype == "line") {
                for (let offset = 1; offset <= action.distance; ++offset) {
                    tiles.push({ mapX: target.mapX + offset, mapY: target.mapY });
                    tiles.push({ mapX: target.mapX - offset, mapY: target.mapY });
                    tiles.push({ mapX: target.mapX, mapY: target.mapY + offset });
                    tiles.push({ mapX: target.mapX, mapY: target.mapY - offset });
                }
            }
        } else if (action.type == "pickup") {
            tiles.push({ mapX: target.mapX, mapY: target.mapY });
        } else if (action.type == "avoid") {
            tiles = getTilesAroundTarget(target.mapX, target.mapY, action.distance + 1);
        } else if (action.type == "follow") {
            tiles = getTilesAroundTarget(target.mapX, target.mapY, action.distance);
        }
        for (const tile of tiles) {
            targetTiles.push(tile);
        }
        return tiles;
    };

    const isAvoidTile = (tile, action) => {
        for (const avoidTile of avoidZoneMap.values()) {
            if (avoidTile.priority > action.priority) {
                if (avoidTile.type == "avoid") {
                    if (getTileMagnitude(tile, avoidTile) <= avoidTile.distance) {
                        avoidTiles.push(tile);
                        return true;
                    }
                } else if (avoidTile.type == "follow") {
                    if (getTileMagnitude(tile, avoidTile) > avoidTile.distance) {
                        avoidTiles.push(tile);
                        return true;
                    }
                }
            }
        }
        return false;
    };

    const getFilteredActionTiles = (tiles, action) => {
        let filteredTiles = [];
        for (const tile of tiles) {
            // TODO Check if pathing can reach tile
            if (!isBlocked(tile.mapX, tile.mapY) && !isAvoidTile(tile, action)) {
                filteredTiles.push(tile);
            }
        }
        return filteredTiles;
    };

    const getFilteredTargetTiles = (battler, action) => {
        const targets = getFilteredTargets(battler, action);
        const playerTile = { mapX: getPlayer().mapX, mapY: getPlayer().mapY };
        let targetTiles = [];
        for (const target of targets) {
            const tiles = getAllTargetActionTiles(target, action);
            const filteredTiles = getFilteredActionTiles(tiles, action);
            if (tiles.length == 0 || filteredTiles.length > 0) {
                let bestTile = null;
                for (const tile of filteredTiles) {
                    // TODO Update getDistance to a method of checking pathing to location
                    if (!bestTile || getDistance(tile.mapX, tile.mapY) < getDistance(bestTile.mapX, bestTile.mapY)) {
                        bestTile = tile;
                    }
                }
                if (bestTile) {
                    targetTiles.push({ target: target, tile: bestTile });
                } else {
                    targetTiles.push({ target: target, tile: playerTile });
                }
            }
        }
        return targetTiles;
    };

    const getSelectedTargetTile = (targetTiles, action) => {
        if (targetTiles.length == 0) {
            return null;
        }
        const targetTileDistance = (targetTile) => {
            const tile = targetTile.tile;
            return getDistance(tile.mapX, tile.mapY);
        };
        const targetHpPercent = (targetTile) => {
            const target = targetTile.target;
            return getPercent(target.hp, target.maxHp);
        };
        const targetMpPercent = (targetTile) => {
            const target = targetTile.target;
            return getPercent(target.mp, target.maxMp);
        };
        const isFacingTargetTileSelection = (targetSelection, targetTile, bestTargetTile) => {
            const tile = targetTile.target;
            if (getDirection(tile.mapX, tile.mapY) != getPlayer().direction) {
                return false;
            }
            if (targetSelection == "closest" || targetSelection == "farthest") {
                return targetTileDistance(targetTile) == targetTileDistance(bestTargetTile);
            } else if (targetSelection == "low_hp" || targetSelection == "high_hp") {
                return targetHpPercent(targetTile) == targetHpPercent(bestTargetTile);
            } else if (targetSelection == "low_mp" || targetSelection == "high_mp") {
                return targetMpPercent(targetTile) == targetMpPercent(bestTargetTile);
            }
            console.log("Invalid target_selection: " + targetSelection);
            return false;
        };
        const isBetterTargetTileSelection = (targetSelection, targetTile, bestTargetTile) => {
            if (targetSelection == "closest") {
                return targetTileDistance(targetTile) < targetTileDistance(bestTargetTile);
            } else if (targetSelection == "farthest") {
                return targetTileDistance(targetTile) > targetTileDistance(bestTargetTile);
            } else if (targetSelection == "low_hp") {
                return targetHpPercent(targetTile) < targetHpPercent(bestTargetTile);
            } else if (targetSelection == "high_hp") {
                return targetHpPercent(targetTile) > targetHpPercent(bestTargetTile);
            } else if (targetSelection == "low_mp") {
                return targetMpPercent(targetTile) < targetMpPercent(bestTargetTile);
            } else if (targetSelection == "high_mp") {
                return targetMpPercent(targetTile) > targetMpPercent(bestTargetTile);
            }
            console.log("Invalid target_selection: " + targetSelection);
            return false;
        };
        let targetSelection = action.target_selection;
        if (!targetSelection) {
            targetSelection = "closest";
        }

        let bestTargetTile = null;
        for (const targetTile of targetTiles) {
            if (!bestTargetTile || isBetterTargetTileSelection(targetSelection, targetTile, bestTargetTile) || isFacingTargetTileSelection(targetSelection, targetTile, bestTargetTile)) {
                bestTargetTile = targetTile;
            }
        }
        return bestTargetTile;
    };

    const canCastSpell = (action, target) => {
        if (target.hasOwnProperty("inRange")) {
            if (!target.inRange) return false;
        }
        if (action.hasOwnProperty("cast_requirements")) {
            for (const requirements of action.cast_requirements) {
                const { type, amount } = requirements;

                if (type == "hp") {
                    if (getPercent(getPlayer().hp, getPlayer().maxHp) < amount) {
                        return false;
                    }
                } else if (type == "mp") {
                    if (getPercent(getPlayer().mp, getPlayer().maxMp) < amount) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    const canUseAction = (action, battler, group) => {
        if (!battler.active) {
            return false;
        }
        const actionKey = battler.id + "-" + action.id;
        if (actionsUsed.has(actionKey) && (actionsUsed.get(actionKey) + action.delay > Date.now())) {
            return false;
        }
        if (action.group_id && group.delay > 0) {
            const groupKey = battler.id + "-" + action.group_id;
            if (groupActionsUsed.has(groupKey) && (groupActionsUsed.get(groupKey) + group.delay > Date.now())) {
                return false;
            }
        }
        const target = getTarget(battler, action);
        if (!target) {
            return false;
        }
        if (action.type == "avoid") {
            return getMagnitude(target.targetTile.mapX, target.targetTile.mapY) <= action.distance;
        }
        if (action.type == "follow") {
            return getMagnitude(target.targetTile.mapX, target.targetTile.mapY) > action.distance;
        }
        if (action.type == "cast" && !canCastSpell(action, target)) {
            return false;
        }
        if (action.type == "idle") {
            if (Math.max(lastAction, lastMove) + action.delay > Date.now()) {
                return false;
            }
        }
        return true;
    };

    const attemptFaceDirection = (direction) => {
        if (direction) {
            if (direction != getPlayer().direction) {
                if (lastTurn + attributes.turn_delay < Date.now()) {
                    playerFaceDirection(direction);
                    lastTurn = Date.now();
                    return true;
                }
            } else {
                return true;
            }
        } else {
            return true;
        }
        return false;
    }

    const moveToTile = (targetTile, action) => {
        const adjTiles = (tile) => {
            let tiles = [];
            tiles.push({ mapX: tile.mapX + 1, mapY: tile.mapY });
            tiles.push({ mapX: tile.mapX - 1, mapY: tile.mapY });
            tiles.push({ mapX: tile.mapX, mapY: tile.mapY + 1 });
            tiles.push({ mapX: tile.mapX, mapY: tile.mapY - 1 });
            return tiles;
        }
        let tileData = new Map();
        let visited = new Set();
        let queue = [];
        let start = { mapX: getPlayer().mapX, mapY: getPlayer().mapY };
        let startKey = JSON.stringify(start);
        queue.push(start);
        visited.add(startKey);
        tileData.set(startKey, { mapX: start.mapX, mapY: start.mapY, distance: 0, parentKey: null });
        let totalTiles = 0;
        while (queue.length > 0) {
            if (++totalTiles > 2500) {
                console.log("moveToTile Error!");
                return;
            }
            let bestIndex = 0;
            let avoidBestTile = isAvoidTile(queue[bestIndex], action);
            let bestTileDistance = getTileDistance(queue[bestIndex], targetTile);
            for (let i = 0; i < queue.length; ++i) {
                const avoidTile = isAvoidTile(queue[i], action);
                const tileDistance = getTileDistance(queue[i], targetTile);
                if (tileDistance + (avoidTile ? 3 : 0) < bestTileDistance + (avoidBestTile ? 3 : 0)) {
                    bestIndex = i;
                    bestTileDistance = tileDistance;
                    avoidBestTile = avoidTile;
                }
            }
            const current = queue[bestIndex];
            const curKey = JSON.stringify(current);
            queue.splice(bestIndex, 1);
            if (current.mapX == targetTile.mapX && current.mapY == targetTile.mapY) {
                let nextKey = curKey;
                while (nextKey) {
                    const data = tileData.get(nextKey);
                    nextKey = data.parentKey;
                    if (nextKey) {
                        currentPath.push({ mapX: data.mapX, mapY: data.mapY });
                    }
                }
                currentPath.reverse();
                return;
            }
            for (const adjTile of adjTiles(current)) {
                if (!isBlocked(adjTile.mapX, adjTile.mapY)) {
                    const key = JSON.stringify(adjTile);
                    if (!visited.has(key)) {
                        queue.push(adjTile);
                        visited.add(key);
                    }
                    const curData = tileData.get(curKey);
                    const newDist = curData.distance + 1;
                    if (tileData.has(key)) {
                        const data = tileData.get(key);
                        if (data.distance > newDist) {
                            tileData.set(key, { mapX: adjTile.mapX, mapY: adjTile.mapY, distance: newDist, parentKey: curKey });
                            loadingTiles.push({ mapX: adjTile.mapX, mapY: adjTile.mapY });
                        }
                    } else {
                        tileData.set(key, { mapX: adjTile.mapX, mapY: adjTile.mapY, distance: newDist, parentKey: curKey });
                        loadingTiles.push({ mapX: adjTile.mapX, mapY: adjTile.mapY });
                    }
                }
            }
        }
        console.log("Error finding target tile.");
    }

    const useAction = (action, battler, group) => {
        let actionCompleted = false;
        const { id, targetTile, moveTile } = getTarget(battler, action);
        const direction = getDirection(targetTile.mapX, targetTile.mapY);
        actionTargetTile = targetTile;
        actionMoveTile = moveTile;
        if (getDistance(moveTile.mapX, moveTile.mapY) > 0) {
            if (action.allow_move) {
                moveToTile(moveTile, action);
            }
        } else {
            if (!attributes.allow_move_actions && ((lastMove + attributes.moveSpeed) > Date.now())) {
                return false;
            }
            if (action.type == "attack") {
                if (attemptFaceDirection(direction)) {
                    getNetwork().playerAttack();
                    actionCompleted = true;
                }
            } else if (action.type == "cast") {
                if (action.subtype == "target" || attemptFaceDirection(direction)) {
                    getNetwork().playerSpellCast(action.index, id);
                    actionCompleted = true;
                }
            } else if (action.type == "pickup") {
                getNetwork().playerItemPickUp();
                actionCompleted = true;
            } else if (action.type == "idle") {
                if (attemptFaceDirection("down")) {
                    actionCompleted = true;
                }
            } else {
                actionCompleted = true;
            }
        }
        if (actionCompleted) {
            lastAction = Date.now();
            const actionKey = battler.id + "-" + action.id;
            actionsUsed.set(actionKey, Date.now());
            if (action.group_id && group.delay > 0) {
                const groupKey = battler.id + "-" + action.group_id;
                groupActionsUsed.set(groupKey, Date.now());
            }
            const targetTimerKey = battler.id + "-" + action.id + "-" + id;
            actionTargetTimers.set(targetTimerKey, Date.now());
        }
        return actionCompleted;
    };

    const usePriorityAction = (action, battler, group) => {
        lockedAction = { action, battler, group };

        if (useAction(action, battler, group)) {
            lockedAction = null;
        }
    };

    const getAvoidTile = (x, y) => {
        const key = x + "-" + y;
        if (avoidZoneMap.has(key)) {
            const existing = avoidZoneMap.get(key);
            return existing;
        }
        return null;
    };

    const setAvoidTile = (x, y, action) => {
        const key = x + "-" + y;
        avoidZoneMap.set(key, { mapX: x, mapY: y, type: action.type, priority: action.priority, distance: action.distance });
    };

    const updateAvoidZoneMap = (battlers) => {
        avoidZoneMap.clear();
        for (const battler of battlers) {
            if (battler.active) {
                for (const action of battler.actions) {
                    if (action.allow_move && action.hasOwnProperty("priority")) {
                        if (action.type == "avoid") {
                            const targets = getFilteredTargets(battler, action);
                            for (const target of targets) {
                                const existing = getAvoidTile(target.mapX, target.mapY);
                                if (!existing || (existing.priority < action.priority)) {
                                    setAvoidTile(target.mapX, target.mapY, action);
                                }
                            }
                        } else if (action.type == "follow") {
                            const tileTargets = getFilteredTargetTiles(battler, action);
                            const tileTarget = getSelectedTargetTile(tileTargets, action);
                            if (tileTarget) {
                                const target = tileTarget.target;
                                const existing = getAvoidTile(target.mapX, target.mapY);
                                if (!existing || (existing.priority < action.priority)) {
                                    setAvoidTile(target.mapX, target.mapY, action);
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    const getLockedAction = () => {
        for (const battler of battlers) {
            if (lockedAction.battler.id == battler.id) {
                lockedAction.battler = battler;
            }
        }
        return lockedAction;
    };

    const battlerTick = () => {
        currentPath = [];
        loadingTiles = [];
        avoidTiles = [];
        targetTiles = [];
        actionTargetTile = null;
        actionMoveTile = null;
        if (!getPlayer()) {
            return;
        }
        if (lockedAction) {
            const { action, battler, group } = getLockedAction();
            if (canUseAction(action, battler, group)) {
                usePriorityAction(action, battler, group);
            } else {
                lockedAction = null;
            }
        }
        let hasActiveBattler = false;
        let priorityAction = null;
        updateAvoidZoneMap(battlers);
        for (const battler of battlers) {
            if (battler.active) {
                hasActiveBattler = true;
                const { actions, groups } = battler;
                for (const action of actions) {
                    const group = getGroup(groups, action.group_id);
                    if (canUseAction(action, battler, group)) {
                        if (action.allow_move && action.hasOwnProperty("priority")) {
                            if (!lockedAction && (!priorityAction || action.priority > priorityAction.action.priority)) {
                                priorityAction = { action, battler, group };
                            }
                        } else {
                            if (!useAction(action, battler, group)) {
                                console.log("Action failed. (" + battler.id + "-" + action.id + ")");
                                console.log(action);
                            }
                        }
                    }
                }
            }
        }
        if (priorityAction) {
            const { action, battler, group } = priorityAction;
            usePriorityAction(action, battler, group);
        }
        //New
        startAiLoopOnce();
    };

    const battlerLoop = () => {
        try {
            battlerTick();
            //logWorldStateForAI(); 
        } catch (err) {
            console.log(err);
        }
        setTimeout(() => {
            battlerLoop();
        }, 100);
    };
    battlerLoop();

    const pathingLoop = () => {
        try {
            const tile = currentPath[0];
            if (tile && (getDistance(tile.mapX, tile.mapY) == 1) && !isBlocked(tile.mapX, tile.mapY)) {
                lastMove = Date.now();
                currentPath.shift();
                const direction = getDirection(tile.mapX, tile.mapY);
                movePlayerDirection(direction);
            }
        } catch (err) {
            console.log(err);
        }
        setTimeout(() => {
            pathingLoop();
        }, attributes.moveSpeed);
    };
    pathingLoop();

    const messageHandler = async (event) => {
        if (!event.data.fromWebPage) {
            const { type, value } = event.data;

            // Get the player safely first
            const player = getPlayer();
            if (type == "playerName") {
                // Check if player exists AND has a name
                if (player && player.name) {
                    window.postMessage({ type: type, text: player.name, fromWebPage: true }, '*');
                }
            } else if (type == "playerMoveSpeed") {
                // Check if player exists AND has a move speed
                if (player && player.moveSpeed) {
                    window.postMessage({ type: type, text: player.moveSpeed, fromWebPage: true }, '*');
                }
            } else if (type == "refreshBattlers") {
                battlers = value;
            } else if (type == "refreshAttributes") {
                attributes = value;
            }
        }
    };

    window.addEventListener('message', function (event) {
        messageHandler(event);
        return true;
    });

    //-------------DRAW-------------

    let tileDrawObjs = [];
    let mapDrawObjs = [];
    let curMapId;

    const drawRectangle = (x, y, xOffset, yOffset, drawWidth, drawHeight, color) => {
        const tileWidth = getMap().tileWidth;
        const tileHeight = getMap().tileHeight;
        const xPos = x * tileWidth + tileWidth / 2;
        const yPos = y * tileHeight + tileHeight / 2;
        return getWorld().add.rectangle(xPos + xOffset, yPos + yOffset, drawWidth, drawHeight, color);
    };

    const drawBlockBorders = () => {
        const tileWidth = getMap().tileWidth;
        const tileHeight = getMap().tileHeight;
        for (let x = 0; x < getMap().width; ++x) {
            for (let y = 0; y < getMap().height; ++y) {
                if (!isTileBlocked(x, y)) {
                    if (isTileBlocked(x + 1, y)) {
                        let obj = drawRectangle(x, y, tileWidth / 2, 0, 1, tileHeight, 0xAEC3EF);
                        tileDrawObjs.push(obj);
                    }
                    if (isTileBlocked(x - 1, y)) {
                        let obj = drawRectangle(x, y, -tileWidth / 2, 0, 1, tileHeight, 0xAEC3EF);
                        tileDrawObjs.push(obj);
                    }
                    if (isTileBlocked(x, y + 1)) {
                        let obj = drawRectangle(x, y, 0, tileHeight / 2, tileWidth, 1, 0xAEC3EF);
                        tileDrawObjs.push(obj);
                    }
                    if (isTileBlocked(x, y - 1)) {
                        let obj = drawRectangle(x, y, 0, -tileHeight / 2, tileWidth, 1, 0xAEC3EF);
                        tileDrawObjs.push(obj);
                    }
                }
            }
        }
    };

    const drawMapRectangle = (mapX, mapY, color) => {
        const tileWidth = getMap().tileWidth;
        const tileHeight = getMap().tileHeight;
        let obj = drawRectangle(mapX, mapY, tileWidth / 2, 0, 1, tileHeight, color);
        mapDrawObjs.push(obj);
        obj = drawRectangle(mapX, mapY, -tileWidth / 2, 0, 1, tileHeight, color);
        mapDrawObjs.push(obj);
        obj = drawRectangle(mapX, mapY, 0, tileHeight / 2, tileWidth, 1, color);
        mapDrawObjs.push(obj);
        obj = drawRectangle(mapX, mapY, 0, -tileHeight / 2, tileWidth, 1, color);
        mapDrawObjs.push(obj);
    };

    const drawSmallRectangle = (mapX, mapY, color) => {
        const tileWidth = getMap().tileWidth;
        const tileHeight = getMap().tileHeight;
        let obj = drawRectangle(mapX, mapY, 0, 0, tileWidth / 4, tileHeight / 4, color);
        mapDrawObjs.push(obj);
    }

    const drawEntityBorders = () => {
        const entities = getRegistry().entities;
        for (const index in entities) {
            drawMapRectangle(entities[index].mapX, entities[index].mapY, 0xF7F0CC);
        }
    };

    const drawItemBorders = () => {
        const items = getRegistry().mapItems;
        for (const index in items) {
            drawMapRectangle(items[index].mapX, items[index].mapY, 0xBBDBAB);
        }
    };

    const drawPathBorders = () => {
        for (const tile of loadingTiles) {
            drawSmallRectangle(tile.mapX, tile.mapY, 0xFFFFFF);
        }
        if (actionTargetTile) {
            drawSmallRectangle(actionTargetTile.mapX, actionTargetTile.mapY, 0xE6A2CB);
        }
        if (actionMoveTile) {
            drawSmallRectangle(actionMoveTile.mapX, actionMoveTile.mapY, 0xE6A2CB);
        }
        for (const tile of currentPath) {
            drawSmallRectangle(tile.mapX, tile.mapY, 0xE6A2CB);
        }
        for (const tile of avoidTiles) {
            drawSmallRectangle(tile.mapX, tile.mapY, 0x000000);
        }
    };

    const drawTargetTiles = () => {
        for (const tile of targetTiles) {
            drawMapRectangle(tile.mapX, tile.mapY, 0xBA8FDB);
        }
    };

    const drawTick = () => {
        if (getRegistry() && getMap()) {
            if (getRegistry().mapLoaded && curMapId !== getRegistry().curMapId) {
                for (const obj of tileDrawObjs) {
                    obj.destroy();
                }
                tileDrawObjs = [];
                drawBlockBorders();
                curMapId = getRegistry().curMapId;
            }
            for (const obj of mapDrawObjs) {
                obj.destroy();
            }
            mapDrawObjs = [];
            drawTargetTiles();
            drawEntityBorders();
            drawItemBorders();
            drawPathBorders();
        }
    };

    const drawLoop = () => {
        try {
            drawTick();
        } catch (err) {
            console.log(err);
        }
        setTimeout(() => {
            drawLoop();
        }, 50);
    };
    drawLoop();
})();