import { getActiveTabURL } from "./utils.js";

const kAllowMove = true;
const kActionPriority = 100;
const kActionDelay = 1000;
const kPercentAmount = 100;

const kTypeOptions = [
  { value: "attack", text: "Auto-Attack" },
  { value: "cast", text: "Cast Spell" },
  { value: "pickup", text: "Pick Up Item" },
  { value: "avoid", text: "Avoid Target" },
  { value: "follow", text: "Follow Target" },
  { value: "idle", text: "Idle" },
];

const kCastSubtypeOptions = [
  { value: "target", text: "Cast On Target" },
  { value: "line", text: "Cast Line Pattern" },
];

const kTargetTypeOptions = [
  { value: "self", text: "Target Self" },
  { value: "monster", text: "Target Monsters" },
  { value: "player", text: "Target Non-Party Players" },
  { value: "party", text: "Target Party" },
  { value: "adventurer", text: "Target Party Adventurer" },
  { value: "bard", text: "Target Party Bard" },
  { value: "knave", text: "Target Party Knave" },
  { value: "mystic", text: "Target Party Mystic" },
  { value: "priest", text: "Target Party Priest" },
  { value: "warrior", text: "Target Party Warrior" },
];

const kTargetSelectionOptions = [
  { value: "closest", text: "Target Closest" },
  { value: "farthest", text: "Target Farthest" },
  { value: "low_hp", text: "Target Low Health" },
  { value: "high_hp", text: "Target High Health" },
  { value: "low_mp", text: "Target Low Mana" },
  { value: "high_mp", text: "Target High Mana" },
];

const kTargetTriggerTypeOptions = [
  { value: "hp", text: "Health" },
  { value: "mp", text: "Mana" },
];

const kCastRequirementTypeOptions = [
  { value: "hp", text: "Health" },
  { value: "mp", text: "Mana" },
];

const kFilterTypeOptions = [
  { value: "allowlist", text: "Allow" },
  { value: "denylist", text: "Deny" },
];

const setControlAttributes = (src, eventListener, controlParentElement) => {
  const controlElement = document.createElement("img");

  controlElement.src = "assets/" + src + ".png";
  controlElement.title = src;
  controlElement.addEventListener("click", eventListener);
  controlParentElement.appendChild(controlElement);
};

const addNewBattler = (parentElement, battler, name) => {
  const battlerTitleElement = document.createElement("div");
  const frontControlsElement = document.createElement("div");
  const backControlsElement = document.createElement("div");
  const newBattlerElement = document.createElement("div");

  battlerTitleElement.textContent = battler.title ? battler.title : "Unknown";
  battlerTitleElement.className = "description";
  frontControlsElement.className = "front-row-controls";
  backControlsElement.className = "back-row-controls";

  if (battler.active) {
    setControlAttributes("pause", onPause, frontControlsElement);
    battlerTitleElement.addEventListener("click", onPause);
  } else {
    setControlAttributes("play", onPlay, frontControlsElement);
    battlerTitleElement.addEventListener("click", onPlay);
  }
  setControlAttributes("edit", onEdit, backControlsElement);
  setControlAttributes("delete", onDelete, backControlsElement);
  newBattlerElement.id = "battler-" + battler.id;
  newBattlerElement.className = "controls-row";
  newBattlerElement.setAttribute("type", "battler");
  newBattlerElement.setAttribute("battler", JSON.stringify(battler));
  newBattlerElement.setAttribute("battler-id", battler.id);
  newBattlerElement.setAttribute("player-name", name);

  newBattlerElement.appendChild(frontControlsElement);
  newBattlerElement.appendChild(battlerTitleElement);
  newBattlerElement.appendChild(backControlsElement);
  parentElement.appendChild(newBattlerElement);
};

const addPlayButton = (parentElement) => {
  const playTitleElement = document.createElement("div");
  const controlsElement = document.createElement("div");

  playTitleElement.textContent = "Play All Battlers";
  playTitleElement.className = "description";
  controlsElement.className = "front-row-controls";

  parentElement.appendChild(controlsElement);
  parentElement.appendChild(playTitleElement);
  setControlAttributes("play", onPlayAll, controlsElement);
  playTitleElement.addEventListener("click", onPlayAll);
};

const addPauseButton = (parentElement) => {
  const pauseTitleElement = document.createElement("div");
  const controlsElement = document.createElement("div");

  pauseTitleElement.textContent = "Pause All Battlers";
  pauseTitleElement.className = "description";
  controlsElement.className = "front-row-controls";

  parentElement.appendChild(controlsElement);
  parentElement.appendChild(pauseTitleElement);
  setControlAttributes("pause", onPauseAll, controlsElement);
  pauseTitleElement.addEventListener("click", onPauseAll);
};

const addAttributeButton = (titleElement) => {
  const attributeControlElement = document.createElement("div");

  attributeControlElement.className = "attribute-controls";

  titleElement.appendChild(attributeControlElement);
  setControlAttributes("attribute", onAttribute, attributeControlElement);
};

const createTextElement = (text) => {
  const textElement = document.createElement("div");
  textElement.textContent = text;
  return textElement;
};

const createItalicTextElement = (text) => {
  const textElement = document.createElement("div");
  const italicElement = document.createElement("i");
  italicElement.textContent = text;
  textElement.appendChild(italicElement);
  return textElement;
};

const createTitleElement = (title) => {
  const titleElement = createTextElement(title);
  titleElement.id = "title";
  titleElement.className = "title";
  return titleElement;
};

const createPlayBattlersElement = () => {
  const playBattlersElement = document.createElement("div");
  playBattlersElement.id = "play-all-battlers";
  playBattlersElement.className = "button-description";
  addPlayButton(playBattlersElement);
  return playBattlersElement;
};

const createPauseBattlersElement = () => {
  const pauseBattlersElement = document.createElement("div");
  pauseBattlersElement.id = "pause-all-battlers";
  pauseBattlersElement.className = "button-description";
  addPauseButton(pauseBattlersElement);
  return pauseBattlersElement;
};

const createBattlersElement = (name, battlers) => {
  const battlersElement = document.createElement("div");
  battlersElement.id = "battlers";
  battlersElement.className = "controls-table";
  const battlersLabel = createControlLabel("Battlers:", "add", onAdd);
  battlersLabel.setAttribute("type", "battler");
  battlersLabel.setAttribute("player-name", name);
  battlersElement.appendChild(battlersLabel);
  if (battlers.length > 0) {
    for (let i = 0; i < battlers.length; i++) {
      const battler = battlers[i];
      addNewBattler(battlersElement, battler, name);
    }
  } else {
    const noBattlersElement = createItalicTextElement("No battlers to show");
    battlersElement.appendChild(noBattlersElement);
  }
  return battlersElement;
};

const clearAttributes = (element) => {
  for (let i = element.attributes.length - 1; i >= 0; --i) {
    const attrName = element.attributes[i].name;
    if (attrName != "id" && attrName != "class") {
      element.removeAttribute(attrName);
    }
  }
};

const viewBattlers = (responseObj) => {
  let name, battlers;
  if (responseObj) {
    name = responseObj.name;
    battlers = responseObj.battlers;
  }
  const containerElement = document.getElementById("container");
  clearAttributes(containerElement);
  containerElement.innerHTML = "";
  if (!name) {
    const titleElement = createTitleElement("Yugen Battler");
    const descElement = createTextElement("Login and select a character");
    containerElement.appendChild(titleElement);
    containerElement.appendChild(descElement);
  } else {
    const titleElement = createTitleElement("Yugen Battler - " + name);
    const battlersElement = createBattlersElement(name, battlers);
    addAttributeButton(titleElement);
    containerElement.appendChild(titleElement);
    if (battlers.length > 0) {
      const activeBattlers = battlers.filter((b) => b.active);
      if (activeBattlers.length > 0) {
        const pauseBattlersElement = createPauseBattlersElement();
        containerElement.appendChild(pauseBattlersElement);
      } else {
        const playBattlersElement = createPlayBattlersElement();
        containerElement.appendChild(playBattlersElement);
      }
    }
    containerElement.appendChild(battlersElement);
  }
};

const addReturnButton = (parentElement) => {
  const titleElement = document.createElement("div");
  const controlsElement = document.createElement("div");

  titleElement.textContent = "Return";
  titleElement.className = "description";
  controlsElement.className = "front-row-controls";

  parentElement.appendChild(controlsElement);
  parentElement.appendChild(titleElement);
  setControlAttributes("return", onEditCancel, controlsElement);
  titleElement.addEventListener("click", onEditCancel);
};

const createReturnElement = () => {
  const returnElement = document.createElement("div");
  returnElement.id = "return-object";
  returnElement.className = "button-description";
  addReturnButton(returnElement);
  return returnElement;
};

const addSaveButton = (parentElement, isEdit) => {
  const titleElement = document.createElement("div");
  const controlsElement = document.createElement("div");

  titleElement.textContent = "Save";
  titleElement.className = "description";
  controlsElement.className = "front-row-controls";

  parentElement.appendChild(controlsElement);
  parentElement.appendChild(titleElement);
  if (isEdit) {
    setControlAttributes("save", onEditSave, controlsElement);
    titleElement.addEventListener("click", onEditSave);
  } else {
    setControlAttributes("save", onEditAdd, controlsElement);
    titleElement.addEventListener("click", onEditAdd);
  }
};

const createSaveBattlerElement = (isEdit) => {
  const saveBattlerElement = document.createElement("div");
  saveBattlerElement.id = "save-object";
  saveBattlerElement.className = "button-description";
  addSaveButton(saveBattlerElement, isEdit);
  return saveBattlerElement;
};

const createLabelInternal = (text, eventListener) => {
  const labelElement = document.createElement("div");
  const textElement = createTextElement(text);
  if (eventListener) {
    textElement.addEventListener("click", eventListener);
  }
  labelElement.className = "label";
  labelElement.appendChild(textElement);
  return labelElement;
};

const createLabel = (text) => {
  return createLabelInternal(text);
};

const createControlLabel = (text, src, eventListener) => {
  const labelElement = createLabelInternal(text, eventListener);
  labelElement.className = "label-controls";
  setControlAttributes(src, eventListener, labelElement);
  return labelElement;
};

const createInputField = (
  name,
  type,
  defaultValue,
  isRequired = true,
  placeholder = ""
) => {
  const inputElement = document.createElement("input");
  inputElement.setAttribute("type", type);
  inputElement.setAttribute("name", name);
  inputElement.required = isRequired;
  if (type == "checkbox") {
    inputElement.checked = defaultValue;
  } else {
    if (type == "number") {
      inputElement.min = 0;
    }
    if (isRequired) {
      inputElement.placeholder = "Required";
    } else {
      inputElement.placeholder = placeholder;
    }
    if (defaultValue != null) {
      inputElement.setAttribute("value", defaultValue);
    }
  }
  return inputElement;
};

const createLabeledInput = (
  type,
  name,
  label,
  defaultValue,
  isRequired = true,
  placeholder = ""
) => {
  const containerElement = document.createElement("div");
  containerElement.id = name;
  containerElement.className = "data-table";
  const labelElement = createLabel(label);
  const inputFieldElement = createInputField(
    name,
    type,
    defaultValue,
    isRequired,
    placeholder
  );
  containerElement.appendChild(labelElement);
  if (type == "checkbox") {
    labelElement.appendChild(inputFieldElement);
  } else {
    containerElement.appendChild(inputFieldElement);
  }
  return containerElement;
};

const createOptionField = (option, defaultValue) => {
  const optionElement = document.createElement("option");
  optionElement.value = option.value;
  optionElement.text = option.text;
  if (option.value == defaultValue) {
    optionElement.selected = true;
  }
  return optionElement;
};

const createSelectField = (name, options, defaultValue, isRequired = true) => {
  const selectElement = document.createElement("select");
  selectElement.setAttribute("name", name);
  if (!isRequired) {
    const optionElement = createOptionField(
      { value: "", text: "None" },
      defaultValue
    );
    selectElement.appendChild(optionElement);
  }
  for (const option of options) {
    const optionElement = createOptionField(option, defaultValue);
    selectElement.appendChild(optionElement);
  }
  return selectElement;
};

const createLabeledSelect = (
  name,
  label,
  options,
  defaultValue,
  isRequired = true
) => {
  const containerElement = document.createElement("div");
  containerElement.id = name;
  containerElement.className = "data-table";
  const labelElement = createLabel(label);
  const selectElement = createSelectField(
    name,
    options,
    defaultValue,
    isRequired
  );
  containerElement.appendChild(labelElement);
  containerElement.appendChild(selectElement);
  return containerElement;
};

const addNewGroup = (parentElement, group, name) => {
  const groupTitleElement = document.createElement("div");
  const backControlsElement = document.createElement("div");
  const newGroupElement = document.createElement("div");

  groupTitleElement.textContent = group.title
    ? group.title
    : createGroupTitle(group);
  groupTitleElement.className = "description";
  backControlsElement.className = "back-row-controls";

  setControlAttributes("edit", onEdit, backControlsElement);
  setControlAttributes("delete", onDelete, backControlsElement);
  newGroupElement.id = "group-" + group.id;
  newGroupElement.className = "controls-row";
  newGroupElement.setAttribute("type", "group");
  newGroupElement.setAttribute("group", JSON.stringify(group));
  newGroupElement.setAttribute("group-id", group.id);
  newGroupElement.setAttribute("player-name", name);

  newGroupElement.appendChild(groupTitleElement);
  newGroupElement.appendChild(backControlsElement);
  parentElement.appendChild(newGroupElement);
};

const createGroupsElement = (name, battlerObj) => {
  const groupsElement = document.createElement("div");
  groupsElement.id = "groups";
  groupsElement.className = "controls-table";
  const groupsLabel = createControlLabel("Action Groups:", "add", onAdd);
  groupsLabel.setAttribute("type", "group");
  groupsLabel.setAttribute("player-name", name);
  groupsElement.appendChild(groupsLabel);
  if (battlerObj && battlerObj.groups.length > 0) {
    for (let i = 0; i < battlerObj.groups.length; i++) {
      const group = battlerObj.groups[i];
      addNewGroup(groupsElement, group, name);
    }
  } else {
    const noGroupsElement = createItalicTextElement("No groups to show");
    groupsElement.appendChild(noGroupsElement);
  }
  return groupsElement;
};

const addNewAction = (parentElement, action, name) => {
  const actionTitleElement = document.createElement("div");
  const backControlsElement = document.createElement("div");
  const newActionElement = document.createElement("div");

  actionTitleElement.textContent = action.title
    ? action.title
    : createActionTitle(action);
  actionTitleElement.className = "description";
  backControlsElement.className = "back-row-controls";

  setControlAttributes("edit", onEdit, backControlsElement);
  setControlAttributes("delete", onDelete, backControlsElement);
  newActionElement.id = "action-" + action.id;
  newActionElement.className = "controls-row";
  newActionElement.setAttribute("type", "action");
  newActionElement.setAttribute("action", JSON.stringify(action));
  newActionElement.setAttribute("action-id", action.id);
  newActionElement.setAttribute("player-name", name);

  newActionElement.appendChild(actionTitleElement);
  newActionElement.appendChild(backControlsElement);
  parentElement.appendChild(newActionElement);
};

const createActionsElement = (name, battlerObj) => {
  const actionsElement = document.createElement("div");
  actionsElement.id = "actions";
  actionsElement.className = "controls-table";
  const actionsLabel = createControlLabel("Actions:", "add", onAdd);
  actionsLabel.setAttribute("type", "action");
  actionsLabel.setAttribute("player-name", name);
  actionsElement.appendChild(actionsLabel);
  if (battlerObj && battlerObj.actions.length > 0) {
    for (let i = 0; i < battlerObj.actions.length; i++) {
      const action = battlerObj.actions[i];
      addNewAction(actionsElement, action, name);
    }
  } else {
    const noActionsElement = createItalicTextElement("No actions to show");
    actionsElement.appendChild(noActionsElement);
  }
  return actionsElement;
};

const createTargetTriggerTitle = (trigger) => {
  let triggerType = kTargetTriggerTypeOptions[0].text;
  let triggerAmount = kPercentAmount;
  if (trigger) {
    for (const option of kTargetTriggerTypeOptions) {
      if (option.value == trigger.type) {
        triggerType = option.text;
      }
    }
    triggerAmount = trigger.amount;
  }
  return "Type: " + triggerType + ", Amount: " + triggerAmount;
};

const addNewTargetTrigger = (parentElement, trigger, name) => {
  const titleElement = document.createElement("div");
  const backControlsElement = document.createElement("div");
  const newRowElement = document.createElement("div");

  titleElement.textContent = createTargetTriggerTitle(trigger);
  titleElement.className = "description";
  backControlsElement.className = "back-row-controls";

  setControlAttributes("edit", onEdit, backControlsElement);
  setControlAttributes("delete", onDelete, backControlsElement);
  newRowElement.id = "target_trigger-" + trigger.id;
  newRowElement.className = "controls-row";
  newRowElement.setAttribute("type", "target_trigger");
  newRowElement.setAttribute("target_trigger", JSON.stringify(trigger));
  newRowElement.setAttribute("target_trigger-id", trigger.id);
  newRowElement.setAttribute("player-name", name);

  newRowElement.appendChild(titleElement);
  newRowElement.appendChild(backControlsElement);
  parentElement.appendChild(newRowElement);
};

const createTargetTriggersElement = (name, actionObj) => {
  const targetTriggersElement = document.createElement("div");
  targetTriggersElement.id = "target-triggers";
  targetTriggersElement.className = "controls-table";
  const targetTriggersLabel = createControlLabel(
    "Target Triggers:",
    "add",
    onAdd
  );
  targetTriggersLabel.setAttribute("type", "target_trigger");
  targetTriggersLabel.setAttribute("player-name", name);
  targetTriggersElement.appendChild(targetTriggersLabel);
  if (
    actionObj &&
    actionObj.hasOwnProperty("target_triggers") &&
    actionObj.target_triggers.length > 0
  ) {
    for (let i = 0; i < actionObj.target_triggers.length; i++) {
      const trigger = actionObj.target_triggers[i];
      trigger.id = i;
      addNewTargetTrigger(targetTriggersElement, trigger, name);
    }
  } else {
    const noTargetTriggersElement = createItalicTextElement(
      "No target triggers to show"
    );
    targetTriggersElement.appendChild(noTargetTriggersElement);
  }
  return targetTriggersElement;
};

const createCastRequirementTitle = (requirement) => {
  let requirementType = kCastRequirementTypeOptions[0].text;
  let requirementAmount = kPercentAmount;
  if (requirement) {
    for (const option of kCastRequirementTypeOptions) {
      if (option.value == requirement.type) {
        requirementType = option.text;
      }
    }
    requirementAmount = requirement.amount;
  }
  return "Type: " + requirementType + ", Amount: " + requirementAmount;
};

const addNewCastRequirement = (parentElement, requirement, name) => {
  const titleElement = document.createElement("div");
  const backControlsElement = document.createElement("div");
  const newRowElement = document.createElement("div");

  titleElement.textContent = createCastRequirementTitle(requirement);
  titleElement.className = "description";
  backControlsElement.className = "back-row-controls";

  setControlAttributes("edit", onEdit, backControlsElement);
  setControlAttributes("delete", onDelete, backControlsElement);
  newRowElement.id = "cast_requirement-" + requirement.id;
  newRowElement.className = "controls-row";
  newRowElement.setAttribute("type", "cast_requirement");
  newRowElement.setAttribute("cast_requirement", JSON.stringify(requirement));
  newRowElement.setAttribute("cast_requirement-id", requirement.id);
  newRowElement.setAttribute("player-name", name);

  newRowElement.appendChild(titleElement);
  newRowElement.appendChild(backControlsElement);
  parentElement.appendChild(newRowElement);
};

const createCastRequirementsElement = (name, actionObj) => {
  const castRequirementsElement = document.createElement("div");
  castRequirementsElement.id = "cast-requirements";
  castRequirementsElement.className = "controls-table";
  const castRequirementsLabel = createControlLabel(
    "Cast Requirements:",
    "add",
    onAdd
  );
  castRequirementsLabel.setAttribute("type", "cast_requirement");
  castRequirementsLabel.setAttribute("player-name", name);
  castRequirementsElement.appendChild(castRequirementsLabel);
  if (
    actionObj &&
    actionObj.hasOwnProperty("cast_requirements") &&
    actionObj.cast_requirements.length > 0
  ) {
    for (let i = 0; i < actionObj.cast_requirements.length; i++) {
      const requirement = actionObj.cast_requirements[i];
      requirement.id = i;
      addNewCastRequirement(castRequirementsElement, requirement, name);
    }
  } else {
    const noCastRequirementsElement = createItalicTextElement(
      "No cast requirements to show"
    );
    castRequirementsElement.appendChild(noCastRequirementsElement);
  }
  return castRequirementsElement;
};

const createTargetFiltersTitle = (filter) => {
  let filterType = kFilterTypeOptions[0].text;
  let targetType = kTargetTypeOptions[0].text;
  let targetName = "Unknown";
  if (filter) {
    for (const option of kFilterTypeOptions) {
      if (option.value == filter.type) {
        filterType = option.text;
      }
    }
    for (const option of kTargetTypeOptions) {
      if (option.value == filter.target_type) {
        targetType = option.text;
      }
    }
    if (filter.target_name) {
      targetName = filter.target_name;
    }
  }
  return targetType + ", " + filterType + " " + targetName;
};

const addNewTargetFilter = (parentElement, filter, name) => {
  const titleElement = document.createElement("div");
  const backControlsElement = document.createElement("div");
  const newRowElement = document.createElement("div");

  titleElement.textContent = createTargetFiltersTitle(filter);
  titleElement.className = "description";
  backControlsElement.className = "back-row-controls";

  setControlAttributes("edit", onEdit, backControlsElement);
  setControlAttributes("delete", onDelete, backControlsElement);
  newRowElement.id = "target_filter-" + filter.id;
  newRowElement.className = "controls-row";
  newRowElement.setAttribute("type", "target_filter");
  newRowElement.setAttribute("target_filter", JSON.stringify(filter));
  newRowElement.setAttribute("target_filter-id", filter.id);
  newRowElement.setAttribute("player-name", name);

  newRowElement.appendChild(titleElement);
  newRowElement.appendChild(backControlsElement);
  parentElement.appendChild(newRowElement);
};

const createTargetFiltersElement = (name, attributes, defaultAttributes) => {
  const containerElement = document.createElement("div");
  containerElement.id = "cast-requirements";
  containerElement.className = "controls-table";
  const containerLabel = createControlLabel("Target Filters:", "add", onAdd);
  containerLabel.setAttribute("type", "target_filter");
  containerLabel.setAttribute("player-name", name);
  containerElement.appendChild(containerLabel);
  let target_filters = [];
  if (attributes && attributes.hasOwnProperty("target_filters")) {
    target_filters = attributes.target_filters;
  } else if (
    defaultAttributes &&
    defaultAttributes.hasOwnProperty("target_filters")
  ) {
    target_filters = defaultAttributes.target_filters;
  }
  if (target_filters.length > 0) {
    for (let i = 0; i < target_filters.length; i++) {
      const filter = target_filters[i];
      filter.id = i;
      addNewTargetFilter(containerElement, filter, name);
    }
  } else {
    const noResultsElement = createItalicTextElement(
      "No target filters to show"
    );
    containerElement.appendChild(noResultsElement);
  }
  return containerElement;
};

const createSaveReturnElement = (editObj) => {
  const isEdit =
    !!editObj &&
    editObj.hasOwnProperty("id") &&
    editObj.id != null &&
    !isNaN(editObj.id);
  const containerElement = document.createElement("div");
  const saveBattlerElement = createSaveBattlerElement(isEdit);
  const returnElement = createReturnElement();
  containerElement.className = "button-description-row";
  containerElement.appendChild(saveBattlerElement);
  containerElement.appendChild(returnElement);
  return containerElement;
};

const fieldOrDefault = (object, property, defaultValue) => {
  if (object && object.hasOwnProperty(property)) {
    return object[property];
  }
  return defaultValue;
};

const editBattlers = (name, battlerObj) => {
  const containerElement = document.getElementById("container");
  containerElement.innerHTML = "";
  const titleElement = createTitleElement("Yugen Battler - " + name);
  const descriptionInput = createLabeledInput(
    "text",
    "description",
    "Description:",
    fieldOrDefault(battlerObj, "title", "")
  );
  const groupsElement = createGroupsElement(name, battlerObj);
  const actionsElement = createActionsElement(name, battlerObj);
  const saveReturnElement = createSaveReturnElement(battlerObj);
  containerElement.appendChild(titleElement);
  containerElement.appendChild(descriptionInput);
  containerElement.appendChild(groupsElement);
  containerElement.appendChild(actionsElement);
  containerElement.appendChild(saveReturnElement);
  containerElement.setAttribute("type", "battler");
  if (battlerObj) {
    containerElement.setAttribute("battler-id", battlerObj.id);
  }
};

const createActionTitle = (actionObj) => {
  let actionType = kTypeOptions[0].text;
  let actionDelay = kActionDelay;
  let actionPriority = kActionPriority;
  let allowMovement = true;
  let index;
  if (actionObj) {
    actionDelay = actionObj.delay;
    if (actionObj.allow_move) {
      actionPriority = fieldOrDefault(actionObj, "priority", actionPriority);
    } else {
      actionPriority = "";
    }
    for (const option of kTypeOptions) {
      if (option.value == actionObj.type) {
        actionType = option.text;
      }
    }
    if (actionObj.type == "cast") {
      index = actionObj.index;
    }
  }
  let actionTitle = actionType;
  if (index) {
    actionTitle += ", Index: " + index;
  }
  if (actionPriority) {
    actionTitle += ", Priority: " + actionPriority;
  }
  actionTitle += ", Delay: " + actionDelay;
  return actionTitle;
};

const refreshAction = (e) => {
  const name = getPlayerNameAttribute(e);
  const battlerObj = getBattlerAttribute(e);
  const actionId = getActionIdAttribute(e);
  let actionObj = createActionObj();
  if (actionId != null) {
    actionObj.id = actionId;
  }
  editActions(name, battlerObj, actionObj);
};

const getGroupOptions = (battlerObj) => {
  let options = [];
  if (battlerObj) {
    for (const group of battlerObj.groups) {
      let title = group.title;
      if (!title) {
        title = createGroupTitle(group);
      }
      options.push({ value: group.id, text: title });
    }
  }
  return options;
};

const editActions = (name, battlerObj, actionObj) => {
  const containerElement = document.getElementById("container");
  containerElement.innerHTML = "";
  clearAttributes(containerElement);

  const type = actionObj ? actionObj.type : kTypeOptions[0].value;
  const allow_move = actionObj ? actionObj.allow_move : kAllowMove;
  const target_type = actionObj
    ? actionObj.target_type
    : kTargetTypeOptions[0].value;

  const titleElement = createTitleElement("Yugen Battler - " + name);
  const actionTitle = actionObj ? actionObj.title : "";
  const descriptionInput = createLabeledInput(
    "text",
    "description",
    "Description:",
    actionTitle,
    false,
    createActionTitle(actionObj)
  );
  const groupOptions = getGroupOptions(battlerObj);
  const groupSelectElement = createLabeledSelect(
    "group_id",
    "Group:",
    groupOptions,
    fieldOrDefault(actionObj, "group_id", ""),
    false
  );
  const typeSelectElement = createLabeledSelect(
    "type",
    "Type:",
    kTypeOptions,
    fieldOrDefault(actionObj, "type", "")
  );
  const subtypeSelectElement = createLabeledSelect(
    "subtype",
    "Subtype:",
    kCastSubtypeOptions,
    fieldOrDefault(actionObj, "subtype", "")
  );
  const allowMoveInput = createLabeledInput(
    "checkbox",
    "allow_move",
    "Allow Move:",
    fieldOrDefault(actionObj, "allow_move", kAllowMove),
    false
  );
  const priorityInput = createLabeledInput(
    "number",
    "priority",
    "Move Priority:",
    fieldOrDefault(actionObj, "priority", kActionPriority)
  );
  const distanceInput = createLabeledInput(
    "number",
    "distance",
    "Distance:",
    fieldOrDefault(actionObj, "distance", 1)
  );
  const indexInput = createLabeledInput(
    "number",
    "index",
    "Index:",
    fieldOrDefault(actionObj, "index", 0)
  );
  const delayInput = createLabeledInput(
    "number",
    "delay",
    "Delay:",
    fieldOrDefault(actionObj, "delay", kActionDelay)
  );
  const targetTimerInput = createLabeledInput(
    "number",
    "target_timer",
    "Target Timer:",
    fieldOrDefault(actionObj, "target_timer", 1000),
    false
  );
  const targetTypeSelectElement = createLabeledSelect(
    "target_type",
    "Target Type:",
    kTargetTypeOptions,
    fieldOrDefault(actionObj, "target_type", "")
  );
  const targetSelectionSelectElement = createLabeledSelect(
    "target_selection",
    "Target Selection:",
    kTargetSelectionOptions,
    fieldOrDefault(actionObj, "target_selection", "")
  );
  const targetTriggerElement = createTargetTriggersElement(name, actionObj);
  const castRequirementsElement = createCastRequirementsElement(
    name,
    actionObj
  );
  const saveReturnElement = createSaveReturnElement(actionObj);

  typeSelectElement.addEventListener("change", refreshAction);
  subtypeSelectElement.addEventListener("change", refreshAction);
  allowMoveInput.addEventListener("change", refreshAction);
  targetTypeSelectElement.addEventListener("change", refreshAction);
  priorityInput.addEventListener("focusout", refreshAction);
  indexInput.addEventListener("focusout", refreshAction);
  delayInput.addEventListener("focusout", refreshAction);

  containerElement.appendChild(titleElement);
  containerElement.appendChild(descriptionInput);
  if (groupOptions.length > 0) {
    containerElement.appendChild(groupSelectElement);
  }
  containerElement.appendChild(typeSelectElement);
  if (type == "cast") {
    containerElement.appendChild(subtypeSelectElement);
  }
  if (type != "idle") {
    containerElement.appendChild(allowMoveInput);
    if (allow_move) {
      containerElement.appendChild(priorityInput);
    }
    containerElement.appendChild(distanceInput);
  }
  if (type == "cast") {
    containerElement.appendChild(indexInput);
  }
  containerElement.appendChild(delayInput);
  if (type != "idle") {
    containerElement.appendChild(targetTimerInput);
  }
  if (type != "idle" && type != "pickup") {
    containerElement.appendChild(targetTimerInput);
    containerElement.appendChild(targetTypeSelectElement);
    if (target_type != "self") {
      containerElement.appendChild(targetSelectionSelectElement);
    }
    containerElement.appendChild(targetTriggerElement);
  }
  if (type == "cast") {
    containerElement.appendChild(castRequirementsElement);
  }
  containerElement.appendChild(saveReturnElement);

  containerElement.setAttribute("type", "action");
  containerElement.setAttribute("player-name", name);
  if (actionObj) {
    containerElement.setAttribute("action-id", actionObj.id);
  }
  if (battlerObj) {
    containerElement.setAttribute("battler", JSON.stringify(battlerObj));
    containerElement.setAttribute("battler-id", battlerObj.id);
  }
};

const createGroupTitle = (groupObj) => {
  let actionDelay = kActionDelay;
  if (groupObj) {
    actionDelay = groupObj.delay;
  }
  return "Action Group, Delay: " + actionDelay;
};

const editGroups = (name, battlerObj, groupObj) => {
  const containerElement = document.getElementById("container");
  containerElement.innerHTML = "";
  clearAttributes(containerElement);

  const titleElement = createTitleElement("Yugen Battler - " + name);
  const groupTitle = groupObj ? groupObj.title : "";
  const descriptionInput = createLabeledInput(
    "text",
    "description",
    "Description:",
    fieldOrDefault(groupObj, "title", ""),
    false,
    createGroupTitle(groupObj)
  );
  const delayInput = createLabeledInput(
    "number",
    "delay",
    "Delay:",
    fieldOrDefault(groupObj, "delay", kActionDelay)
  );
  const saveReturnElement = createSaveReturnElement(groupObj);
  containerElement.appendChild(titleElement);
  containerElement.appendChild(descriptionInput);
  containerElement.appendChild(delayInput);
  containerElement.appendChild(saveReturnElement);
  containerElement.setAttribute("type", "group");
  containerElement.setAttribute("player-name", name);
  if (groupObj) {
    containerElement.setAttribute("group-id", groupObj.id);
  }
  if (battlerObj) {
    containerElement.setAttribute("battler", JSON.stringify(battlerObj));
    containerElement.setAttribute("battler-id", battlerObj.id);
  }
};

const editTargetTriggers = (name, battlerObj, actionObj, trigger) => {
  const containerElement = document.getElementById("container");
  containerElement.innerHTML = "";
  clearAttributes(containerElement);

  const titleElement = createTitleElement("Yugen Battler - " + name);
  const typeSelectElement = createLabeledSelect(
    "type",
    "Type:",
    kTargetTriggerTypeOptions,
    fieldOrDefault(trigger, "type", "")
  );
  const amountInput = createLabeledInput(
    "number",
    "amount",
    "Amount:",
    fieldOrDefault(trigger, "amount", kPercentAmount)
  );
  const saveReturnElement = createSaveReturnElement(trigger);
  containerElement.appendChild(titleElement);
  containerElement.appendChild(typeSelectElement);
  containerElement.appendChild(amountInput);
  containerElement.appendChild(saveReturnElement);
  containerElement.setAttribute("type", "target_trigger");
  containerElement.setAttribute("player-name", name);
  if (trigger) {
    containerElement.setAttribute("target_trigger-id", trigger.id);
  }
  if (battlerObj) {
    containerElement.setAttribute("battler", JSON.stringify(battlerObj));
    containerElement.setAttribute("battler-id", battlerObj.id);
  }
  if (actionObj) {
    containerElement.setAttribute("action", JSON.stringify(actionObj));
    containerElement.setAttribute("action-id", actionObj.id);
  }
};

const editCastRequirements = (name, battlerObj, actionObj, requirement) => {
  const containerElement = document.getElementById("container");
  containerElement.innerHTML = "";
  clearAttributes(containerElement);

  const titleElement = createTitleElement("Yugen Battler - " + name);
  const typeSelectElement = createLabeledSelect(
    "type",
    "Type:",
    kCastRequirementTypeOptions,
    fieldOrDefault(requirement, "type", "")
  );
  const amountInput = createLabeledInput(
    "number",
    "amount",
    "Amount:",
    fieldOrDefault(requirement, "amount", kPercentAmount)
  );
  const saveReturnElement = createSaveReturnElement(requirement);
  containerElement.appendChild(titleElement);
  containerElement.appendChild(typeSelectElement);
  containerElement.appendChild(amountInput);
  containerElement.appendChild(saveReturnElement);
  containerElement.setAttribute("type", "cast_requirement");
  containerElement.setAttribute("player-name", name);
  if (requirement) {
    containerElement.setAttribute("cast_requirement-id", requirement.id);
  }
  if (battlerObj) {
    containerElement.setAttribute("battler", JSON.stringify(battlerObj));
    containerElement.setAttribute("battler-id", battlerObj.id);
  }
  if (actionObj) {
    containerElement.setAttribute("action", JSON.stringify(actionObj));
    containerElement.setAttribute("action-id", actionObj.id);
  }
};

const editTargetFilters = (name, attributes, defaultAttributes, filter) => {
  const containerElement = document.getElementById("container");
  containerElement.innerHTML = "";
  clearAttributes(containerElement);

  const titleElement = createTitleElement("Yugen Battler - " + name);
  const targetTypeSelectElement = createLabeledSelect(
    "target_type",
    "Target Type:",
    kTargetTypeOptions,
    fieldOrDefault(filter, "target_type", "")
  );
  const typeSelectElement = createLabeledSelect(
    "type",
    "Filter Type:",
    kFilterTypeOptions,
    fieldOrDefault(filter, "type", "")
  );
  const targetNameInput = createLabeledInput(
    "text",
    "target_name",
    "Target Name:",
    fieldOrDefault(filter, "target_name", "")
  );
  const saveReturnElement = createSaveReturnElement(filter);
  containerElement.appendChild(titleElement);
  containerElement.appendChild(targetTypeSelectElement);
  containerElement.appendChild(typeSelectElement);
  containerElement.appendChild(targetNameInput);
  containerElement.appendChild(saveReturnElement);
  containerElement.setAttribute("type", "target_filter");
  containerElement.setAttribute("player-name", name);
  if (filter) {
    containerElement.setAttribute("target_filter-id", filter.id);
  }
  if (attributes) {
    containerElement.setAttribute("attributes", JSON.stringify(attributes));
  }
  if (defaultAttributes) {
    containerElement.setAttribute(
      "default_attributes",
      JSON.stringify(defaultAttributes)
    );
  }
};

const viewAttributes = (responseObj) => {
  const { name, attributes, defaultAttributes } = responseObj;
  editAttributes(name, attributes, defaultAttributes);
};

const editAttributes = (name, attributes, defaultAttributes) => {
  const containerElement = document.getElementById("container");
  containerElement.innerHTML = "";
  clearAttributes(containerElement);

  const titleElement = createTitleElement("Yugen Battler - " + name);
  const allowMoveActionsInput = createLabeledInput(
    "checkbox",
    "allow_move_actions",
    "Allow Actions On Move:",
    fieldOrDefault(
      attributes,
      "allow_move_actions",
      defaultAttributes.allow_move_actions
    ),
    false
  );
  const moveSpeedInput = createLabeledInput(
    "number",
    "moveSpeed",
    "Movement Speed:",
    attributes.moveSpeed,
    false,
    defaultAttributes.moveSpeed
  );
  const turnDelayInput = createLabeledInput(
    "number",
    "turn_delay",
    "Turn Delay:",
    attributes.turn_delay,
    false,
    defaultAttributes.turn_delay
  );
  const filtersElement = createTargetFiltersElement(
    name,
    attributes,
    defaultAttributes
  );
  const saveReturnElement = createSaveReturnElement(attributes);
  containerElement.appendChild(titleElement);
  containerElement.appendChild(allowMoveActionsInput);
  containerElement.appendChild(moveSpeedInput);
  containerElement.appendChild(turnDelayInput);
  containerElement.appendChild(filtersElement);
  containerElement.appendChild(saveReturnElement);
  containerElement.setAttribute("type", "attributes");
  if (attributes) {
    containerElement.setAttribute("attributes", JSON.stringify(attributes));
  }
  if (defaultAttributes) {
    containerElement.setAttribute(
      "default_attributes",
      JSON.stringify(defaultAttributes)
    );
  }
};

const createBattlerObj = () => {
  const container = document.getElementById("container");
  let battlerObj = { actions: [], groups: [] };
  let nodeQueue = [];
  nodeQueue.push(container.childNodes);
  while (nodeQueue.length > 0) {
    const nodes = nodeQueue.shift();
    for (const node of nodes) {
      if (node.childNodes) {
        nodeQueue.push(node.childNodes);
      }
      if (node.name == "description") {
        battlerObj.title = node.value;
      }
      let id = node.id;
      if (id != null && id.includes("group-")) {
        const groupObj = node.getAttribute("group");
        if (groupObj) {
          battlerObj.groups.push(JSON.parse(groupObj));
        }
      }
      if (id != null && id.includes("action-")) {
        const actionObj = node.getAttribute("action");
        if (actionObj) {
          battlerObj.actions.push(JSON.parse(actionObj));
        }
      }
    }
  }
  return battlerObj;
};

const createGroupObj = () => {
  let groupObj = {};
  let container = document.getElementById("container");
  let nodeQueue = [];
  nodeQueue.push(container.childNodes);
  while (nodeQueue.length > 0) {
    const nodes = nodeQueue.shift();
    for (const node of nodes) {
      if (node.childNodes) {
        nodeQueue.push(node.childNodes);
      }
      if (node.name == "description") {
        groupObj.title = node.value;
      }
      if (node.name == "delay") {
        const value = parseInt(node.value);
        if (!isNaN(value)) {
          groupObj.delay = value;
        }
      }
    }
  }
  return groupObj;
};

const createActionObj = () => {
  let actionObj = { target_triggers: [], cast_requirements: [] };
  let container = document.getElementById("container");
  let nodeQueue = [];
  nodeQueue.push(container.childNodes);
  while (nodeQueue.length > 0) {
    const nodes = nodeQueue.shift();
    for (const node of nodes) {
      if (node.childNodes) {
        nodeQueue.push(node.childNodes);
      }
      if (node.name == "description") {
        actionObj.title = node.value;
      }
      if (node.name == "group_id") {
        const value = parseInt(node.value);
        if (!isNaN(value)) {
          actionObj.group_id = value;
        }
      }
      if (node.name == "type") {
        actionObj.type = node.value;
      }
      if (node.name == "subtype") {
        actionObj.subtype = node.value;
      }
      if (node.name == "allow_move") {
        actionObj.allow_move = node.checked;
      }
      if (node.name == "priority") {
        const value = parseInt(node.value);
        if (!isNaN(value)) {
          actionObj.priority = value;
        }
      }
      if (node.name == "index") {
        const value = parseInt(node.value);
        if (!isNaN(value)) {
          actionObj.index = value;
        }
      }
      if (node.name == "distance") {
        const value = parseInt(node.value);
        if (!isNaN(value)) {
          actionObj.distance = value;
        }
      }
      if (node.name == "delay") {
        const value = parseInt(node.value);
        if (!isNaN(value)) {
          actionObj.delay = value;
        }
      }
      if (node.name == "target_timer") {
        const value = parseInt(node.value);
        if (!isNaN(value)) {
          actionObj.target_timer = value;
        }
      }
      if (node.name == "target_type") {
        actionObj.target_type = node.value;
      }
      if (node.name == "target_selection") {
        actionObj.target_selection = node.value;
      }
      let id = node.id;
      if (id != null && id.includes("target_trigger-")) {
        const trigger = node.getAttribute("target_trigger");
        if (trigger) {
          actionObj.target_triggers.push(JSON.parse(trigger));
        }
      }
      if (id != null && id.includes("cast_requirement-")) {
        const requirement = node.getAttribute("cast_requirement");
        if (requirement) {
          actionObj.cast_requirements.push(JSON.parse(requirement));
        }
      }
    }
  }
  return actionObj;
};

const createTargetTriggerObj = () => {
  let trigger = {};
  let container = document.getElementById("container");
  let nodeQueue = [];
  nodeQueue.push(container.childNodes);
  while (nodeQueue.length > 0) {
    const nodes = nodeQueue.shift();
    for (const node of nodes) {
      if (node.childNodes) {
        nodeQueue.push(node.childNodes);
      }
      if (node.name == "type") {
        trigger.type = node.value;
      }
      if (node.name == "amount") {
        const value = parseInt(node.value);
        if (!isNaN(value)) {
          trigger.amount = value;
        }
      }
    }
  }
  return trigger;
};

const createCastRequirementObj = () => {
  let requirement = {};
  let container = document.getElementById("container");
  let nodeQueue = [];
  nodeQueue.push(container.childNodes);
  while (nodeQueue.length > 0) {
    const nodes = nodeQueue.shift();
    for (const node of nodes) {
      if (node.childNodes) {
        nodeQueue.push(node.childNodes);
      }
      if (node.name == "type") {
        requirement.type = node.value;
      }
      if (node.name == "amount") {
        const value = parseInt(node.value);
        if (!isNaN(value)) {
          requirement.amount = value;
        }
      }
    }
  }
  return requirement;
};

const createAttributesObj = () => {
  let attributes = { target_filters: [] };
  let container = document.getElementById("container");
  let nodeQueue = [];
  nodeQueue.push(container.childNodes);
  while (nodeQueue.length > 0) {
    const nodes = nodeQueue.shift();
    for (const node of nodes) {
      if (node.childNodes) {
        nodeQueue.push(node.childNodes);
      }
      if (node.name == "allow_move_actions") {
        attributes.allow_move_actions = node.checked;
      }
      if (node.name == "moveSpeed") {
        if (node.value != null && !isNaN(node.value)) {
          attributes.moveSpeed = parseInt(node.value);
        }
      }
      if (node.name == "turn_delay") {
        if (node.value != null && !isNaN(node.value)) {
          attributes.turn_delay = parseInt(node.value);
        }
      }
      let id = node.id;
      if (id != null && id.includes("target_filter-")) {
        const filter = node.getAttribute("target_filter");
        if (filter) {
          attributes.target_filters.push(JSON.parse(filter));
        }
      }
    }
  }
  return attributes;
};

const createTargetFilterObj = () => {
  let filter = {};
  let container = document.getElementById("container");
  let nodeQueue = [];
  nodeQueue.push(container.childNodes);
  while (nodeQueue.length > 0) {
    const nodes = nodeQueue.shift();
    for (const node of nodes) {
      if (node.childNodes) {
        nodeQueue.push(node.childNodes);
      }
      if (node.name == "type") {
        filter.type = node.value;
      }
      if (node.name == "target_type") {
        filter.target_type = node.value;
      }
      if (node.name == "target_name") {
        filter.target_name = node.value;
      }
    }
  }
  return filter;
};

const addBattlerAction = (battlerObj, actionObj) => {
  battlerObj.actions.push(actionObj);
  return cleanUpBattlerObj(battlerObj);
};

const updateBattlerAction = (battlerObj, actionObj, actionId) => {
  actionObj.id = actionId;
  for (let i = 0; i < battlerObj.actions.length; ++i) {
    if (battlerObj.actions[i].id == actionId) {
      battlerObj.actions[i] = actionObj;
    }
  }
  return cleanUpBattlerObj(battlerObj);
};

const deleteBattlerAction = (battlerObj, actionId) => {
  for (let i = battlerObj.actions.length - 1; i >= 0; --i) {
    if (battlerObj.actions[i].id == actionId) {
      battlerObj.actions.splice(i, 1);
    }
  }
  return cleanUpBattlerObj(battlerObj);
};

const addBattlerGroup = (battlerObj, groupObj) => {
  battlerObj.groups.push(groupObj);
  return cleanUpBattlerObj(battlerObj);
};

const updateBattlerGroup = (battlerObj, groupObj, groupId) => {
  groupObj.id = groupId;
  for (let i = 0; i < battlerObj.groups.length; ++i) {
    if (battlerObj.groups[i].id == groupId) {
      battlerObj.groups[i] = groupObj;
    }
  }
  return cleanUpBattlerObj(battlerObj);
};

const deleteBattlerGroup = (battlerObj, groupId) => {
  for (let i = battlerObj.groups.length - 1; i >= 0; --i) {
    if (battlerObj.groups[i].id == groupId) {
      battlerObj.groups.splice(i, 1);
    }
  }
  return cleanUpBattlerObj(battlerObj);
};

const cleanUpBattlerObj = (battlerObj) => {
  battlerObj.actions.sort((a, b) =>
    createActionTitle(a) < createActionTitle(b) ? -1 : 1
  );
  battlerObj.groups.sort((a, b) =>
    createGroupTitle(a) < createGroupTitle(b) ? -1 : 1
  );
  for (let i = 0; i < battlerObj.actions.length; ++i) {
    battlerObj.actions[i].id = i;
    if (battlerObj.actions[i].hasOwnProperty("group_id")) {
      const group_id = battlerObj.actions[i].group_id;
      let modified = false;
      for (let j = 0; j < battlerObj.groups.length; ++j) {
        if (battlerObj.groups[j].id == group_id) {
          battlerObj.actions[i].group_id = j;
          modified = true;
        }
      }
      if (!modified) {
        delete battlerObj.actions[i].group_id;
      }
    }
  }
  for (let i = 0; i < battlerObj.groups.length; ++i) {
    battlerObj.groups[i].id = i;
  }
  return battlerObj;
};

const addActionTargetTrigger = (actionObj, trigger) => {
  actionObj.target_triggers.push(trigger);
  return cleanUpActionObj(actionObj);
};

const updateActionTargetTrigger = (actionObj, trigger, triggerId) => {
  trigger.id = triggerId;
  for (let i = 0; i < actionObj.target_triggers.length; ++i) {
    if (actionObj.target_triggers[i].id == triggerId) {
      actionObj.target_triggers[i] = trigger;
    }
  }
  return cleanUpActionObj(actionObj);
};

const deleteActionTargetTrigger = (actionObj, triggerId) => {
  for (let i = actionObj.target_triggers.length - 1; i >= 0; --i) {
    if (actionObj.target_triggers[i].id == triggerId) {
      actionObj.target_triggers.splice(i, 1);
    }
  }
  return cleanUpActionObj(actionObj);
};

const addActionCastRequirement = (actionObj, requirement) => {
  actionObj.cast_requirements.push(requirement);
  return cleanUpActionObj(actionObj);
};

const updateActionCastRequirement = (actionObj, requirement, requirementId) => {
  requirement.id = requirementId;
  for (let i = 0; i < actionObj.cast_requirements.length; ++i) {
    if (actionObj.cast_requirements[i].id == requirementId) {
      actionObj.cast_requirements[i] = requirement;
    }
  }
  return cleanUpActionObj(actionObj);
};

const deleteActionCastRequirement = (actionObj, requirementId) => {
  for (let i = actionObj.cast_requirements.length - 1; i >= 0; --i) {
    if (actionObj.cast_requirements[i].id == requirementId) {
      actionObj.cast_requirements.splice(i, 1);
    }
  }
  return cleanUpActionObj(actionObj);
};

const cleanUpActionObj = (actionObj) => {
  for (let i = 0; i < actionObj.target_triggers.length; ++i) {
    actionObj.target_triggers[i].id = i;
  }
  for (let i = 0; i < actionObj.cast_requirements.length; ++i) {
    actionObj.cast_requirements[i].id = i;
  }
  return actionObj;
};

const addAttributeFilters = (attributes, filter) => {
  attributes.target_filters.push(filter);
  return cleanUpAttributesObj(attributes);
};

const updateAttributeFilters = (attributes, filter, filterId) => {
  filter.id = filterId;
  for (let i = 0; i < attributes.target_filters.length; ++i) {
    if (attributes.target_filters[i].id == filterId) {
      attributes.target_filters[i] = filter;
    }
  }
  return cleanUpAttributesObj(attributes);
};

const deleteAttributeFilters = (attributes, filterId) => {
  for (let i = attributes.target_filters.length - 1; i >= 0; --i) {
    if (attributes.target_filters[i].id == filterId) {
      attributes.target_filters.splice(i, 1);
    }
  }
  return cleanUpAttributesObj(attributes);
};

const cleanUpAttributesObj = (attributes) => {
  for (let i = 0; i < attributes.target_filters.length; ++i) {
    attributes.target_filters[i].id = i;
  }
  return attributes;
};

const getAttribute = (e, attribute) => {
  if (e.target.parentNode.getAttribute(attribute)) {
    return e.target.parentNode.getAttribute(attribute);
  }
  if (e.target.parentNode.parentNode.getAttribute(attribute)) {
    return e.target.parentNode.parentNode.getAttribute(attribute);
  }
  if (e.target.parentNode.parentNode.parentNode.getAttribute(attribute)) {
    return e.target.parentNode.parentNode.parentNode.getAttribute(attribute);
  }
  if (
    e.target.parentNode.parentNode.parentNode.parentNode.getAttribute(attribute)
  ) {
    return e.target.parentNode.parentNode.parentNode.parentNode.getAttribute(
      attribute
    );
  }
  return null;
};

const getBattlerIdAttribute = (e) => {
  const battlerId = getAttribute(e, "battler-id");
  return parseInt(battlerId);
};

const getBattlerAttribute = (e) => {
  const battlerObj = getAttribute(e, "battler");
  return JSON.parse(battlerObj);
};

const getActionIdAttribute = (e) => {
  const actionId = getAttribute(e, "action-id");
  return parseInt(actionId);
};

const getActionAttribute = (e) => {
  const actionObj = getAttribute(e, "action");
  return JSON.parse(actionObj);
};

const getGroupIdAttribute = (e) => {
  const groupId = getAttribute(e, "group-id");
  return parseInt(groupId);
};

const getGroupAttribute = (e) => {
  const groupObj = getAttribute(e, "group");
  return JSON.parse(groupObj);
};

const getTargetTriggerIdAttribute = (e) => {
  const triggerId = getAttribute(e, "target_trigger-id");
  return parseInt(triggerId);
};

const getTargetTriggerAttribute = (e) => {
  const trigger = getAttribute(e, "target_trigger");
  return JSON.parse(trigger);
};

const getCastRequirementIdAttribute = (e) => {
  const requirementId = getAttribute(e, "cast_requirement-id");
  return parseInt(requirementId);
};

const getCastRequirementAttribute = (e) => {
  const requirement = getAttribute(e, "cast_requirement");
  return JSON.parse(requirement);
};

const getPlayerNameAttribute = (e) => {
  return getAttribute(e, "player-name");
};

const getTypeAttribute = (e) => {
  return getAttribute(e, "type");
};

const getAttributesAttribute = (e) => {
  const attributes = getAttribute(e, "attributes");
  return JSON.parse(attributes);
};

const getDefaultAttributesAttribute = (e) => {
  const default_attributes = getAttribute(e, "default_attributes");
  return JSON.parse(default_attributes);
};

const getTargetFilterIdAttribute = (e) => {
  const filterId = getAttribute(e, "target_filter-id");
  return parseInt(filterId);
};

const getTargetFilterAttribute = (e) => {
  const filter = getAttribute(e, "target_filter");
  return JSON.parse(filter);
};

const onAttribute = async (e) => {
  const activeTab = await getActiveTabURL();

  chrome.tabs.sendMessage(
    activeTab.id,
    {
      type: "LOAD-ATTRIBUTES",
    },
    viewAttributes
  );
};

const onPause = async (e) => {
  const activeTab = await getActiveTabURL();
  const battlerId = getBattlerIdAttribute(e);

  chrome.tabs.sendMessage(
    activeTab.id,
    {
      type: "PAUSE",
      value: battlerId,
    },
    viewBattlers
  );
};

const onPlayAll = async (e) => {
  const activeTab = await getActiveTabURL();

  chrome.tabs.sendMessage(
    activeTab.id,
    {
      type: "PLAY-ALL",
    },
    viewBattlers
  );
};

const onPauseAll = async (e) => {
  const activeTab = await getActiveTabURL();

  chrome.tabs.sendMessage(
    activeTab.id,
    {
      type: "PAUSE-ALL",
    },
    viewBattlers
  );
};

const onPlay = async (e) => {
  const activeTab = await getActiveTabURL();
  const battlerId = getBattlerIdAttribute(e);

  chrome.tabs.sendMessage(
    activeTab.id,
    {
      type: "PLAY",
      value: battlerId,
    },
    viewBattlers
  );
};

const onAdd = async (e) => {
  const name = getPlayerNameAttribute(e);
  const type = getTypeAttribute(e);
  if (type == "battler") {
    editBattlers(name);
  } else if (type == "action") {
    let battlerObj = createBattlerObj();
    const battlerId = getBattlerIdAttribute(e);
    if (battlerId != null) {
      battlerObj.id = battlerId;
    }
    editActions(name, battlerObj);
  } else if (type == "group") {
    let battlerObj = createBattlerObj();
    const battlerId = getBattlerIdAttribute(e);
    if (battlerId != null) {
      battlerObj.id = battlerId;
    }
    editGroups(name, battlerObj);
  } else if (type == "target_trigger") {
    const battlerObj = getBattlerAttribute(e);
    let actionObj = createActionObj();
    const actionId = getActionIdAttribute(e);
    if (actionId != null) {
      actionObj.id = actionId;
    }
    editTargetTriggers(name, battlerObj, actionObj);
  } else if (type == "cast_requirement") {
    const battlerObj = getBattlerAttribute(e);
    let actionObj = createActionObj();
    const actionId = getActionIdAttribute(e);
    if (actionId != null) {
      actionObj.id = actionId;
    }
    editCastRequirements(name, battlerObj, actionObj);
  } else if (type == "target_filter") {
    const attributes = createAttributesObj();
    const defaultAttributes = getDefaultAttributesAttribute(e);
    editTargetFilters(name, attributes, defaultAttributes);
  }
};

const onEdit = async (e) => {
  const type = getTypeAttribute(e);
  const name = getPlayerNameAttribute(e);
  if (type == "battler") {
    const battlerObj = getBattlerAttribute(e);
    editBattlers(name, battlerObj);
  } else if (type == "action") {
    let battlerObj = createBattlerObj();
    const battlerId = getBattlerIdAttribute(e);
    if (battlerId != null) {
      battlerObj.id = battlerId;
    }
    const actionObj = getActionAttribute(e);
    editActions(name, battlerObj, actionObj);
  } else if (type == "group") {
    let battlerObj = createBattlerObj();
    const battlerId = getBattlerIdAttribute(e);
    if (battlerId != null) {
      battlerObj.id = battlerId;
    }
    const groupObj = getGroupAttribute(e);
    editGroups(name, battlerObj, groupObj);
  } else if (type == "target_trigger") {
    const battlerObj = getBattlerAttribute(e);
    let actionObj = createActionObj();
    const actionId = getActionIdAttribute(e);
    if (actionId != null) {
      actionObj.id = actionId;
    }
    const trigger = getTargetTriggerAttribute(e);
    editTargetTriggers(name, battlerObj, actionObj, trigger);
  } else if (type == "cast_requirement") {
    const battlerObj = getBattlerAttribute(e);
    let actionObj = createActionObj();
    const actionId = getActionIdAttribute(e);
    if (actionId != null) {
      actionObj.id = actionId;
    }
    const requirement = getCastRequirementAttribute(e);
    editCastRequirements(name, battlerObj, actionObj, requirement);
  } else if (type == "target_filter") {
    const attributes = createAttributesObj();
    const defaultAttributes = getDefaultAttributesAttribute(e);
    const filter = getTargetFilterAttribute(e);
    editTargetFilters(name, attributes, defaultAttributes, filter);
  }
};

const onEditAdd = async (e) => {
  const activeTab = await getActiveTabURL();
  const type = getTypeAttribute(e);
  if (type == "battler") {
    const battlerObj = createBattlerObj();
    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "ADD",
        value: battlerObj,
      },
      viewBattlers
    );
  } else if (type == "action") {
    const name = getPlayerNameAttribute(e);
    const actionObj = createActionObj();
    let battlerObj = getBattlerAttribute(e);
    battlerObj = addBattlerAction(battlerObj, actionObj);
    editBattlers(name, battlerObj);
  } else if (type == "group") {
    const name = getPlayerNameAttribute(e);
    const groupObj = createGroupObj();
    let battlerObj = getBattlerAttribute(e);
    battlerObj = addBattlerGroup(battlerObj, groupObj);
    editBattlers(name, battlerObj);
  } else if (type == "target_trigger") {
    const name = getPlayerNameAttribute(e);
    const battlerObj = getBattlerAttribute(e);
    let actionObj = getActionAttribute(e);
    actionObj = addActionTargetTrigger(actionObj, createTargetTriggerObj());
    editActions(name, battlerObj, actionObj);
  } else if (type == "cast_requirement") {
    const name = getPlayerNameAttribute(e);
    const battlerObj = getBattlerAttribute(e);
    let actionObj = getActionAttribute(e);
    actionObj = addActionCastRequirement(actionObj, createCastRequirementObj());
    editActions(name, battlerObj, actionObj);
  } else if (type == "attributes") {
    const attributes = createAttributesObj();

    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "EDIT-ATTRIBUTES",
        value: attributes,
      },
      viewBattlers
    );
  } else if (type == "target_filter") {
    const name = getPlayerNameAttribute(e);
    const defaultAttributes = getDefaultAttributesAttribute(e);
    let attributes = getAttributesAttribute(e);
    attributes = addAttributeFilters(attributes, createTargetFilterObj());
    editAttributes(name, attributes, defaultAttributes);
  }
};

const onEditSave = async (e) => {
  const activeTab = await getActiveTabURL();
  const type = getTypeAttribute(e);
  if (type == "battler") {
    let battlerObj = createBattlerObj();
    const battlerId = getBattlerIdAttribute(e);
    if (battlerId != null) {
      battlerObj.id = battlerId;
    }
    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "EDIT",
        value: battlerObj,
      },
      viewBattlers
    );
  } else if (type == "action") {
    const name = getPlayerNameAttribute(e);
    const actionObj = createActionObj();
    const actionId = getActionIdAttribute(e);
    let battlerObj = getBattlerAttribute(e);
    battlerObj = updateBattlerAction(battlerObj, actionObj, actionId);
    editBattlers(name, battlerObj);
  } else if (type == "group") {
    const name = getPlayerNameAttribute(e);
    const groupObj = createGroupObj();
    const groupId = getGroupIdAttribute(e);
    let battlerObj = getBattlerAttribute(e);
    battlerObj = updateBattlerGroup(battlerObj, groupObj, groupId);
    editBattlers(name, battlerObj);
  } else if (type == "target_trigger") {
    const name = getPlayerNameAttribute(e);
    const trigger = createTargetTriggerObj();
    const triggerId = getTargetTriggerIdAttribute(e);
    const battlerObj = getBattlerAttribute(e);
    let actionObj = getActionAttribute(e);
    actionObj = updateActionTargetTrigger(actionObj, trigger, triggerId);
    editActions(name, battlerObj, actionObj);
  } else if (type == "cast_requirement") {
    const name = getPlayerNameAttribute(e);
    const requirement = createCastRequirementObj();
    const requirementId = getCastRequirementIdAttribute(e);
    const battlerObj = getBattlerAttribute(e);
    let actionObj = getActionAttribute(e);
    actionObj = updateActionCastRequirement(
      actionObj,
      requirement,
      requirementId
    );
    editActions(name, battlerObj, actionObj);
  } else if (type == "attributes") {
    const attributes = createAttributesObj();

    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "EDIT-ATTRIBUTES",
        value: attributes,
      },
      viewBattlers
    );
  } else if (type == "target_filter") {
    const name = getPlayerNameAttribute(e);
    const filterId = getTargetFilterIdAttribute(e);
    const defaultAttributes = getDefaultAttributesAttribute(e);
    let attributes = getAttributesAttribute(e);
    attributes = updateAttributeFilters(
      attributes,
      createTargetFilterObj(),
      filterId
    );
    editAttributes(name, attributes, defaultAttributes);
  }
};

const onEditCancel = async (e) => {
  const activeTab = await getActiveTabURL();
  const type = getTypeAttribute(e);
  if (type == "battler") {
    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "LOAD",
      },
      viewBattlers
    );
  } else if (type == "action" || type == "group") {
    const name = getPlayerNameAttribute(e);
    const battlerObj = getBattlerAttribute(e);
    editBattlers(name, battlerObj);
  } else if (type == "target_trigger" || type == "cast_requirement") {
    const name = getPlayerNameAttribute(e);
    const battlerObj = getBattlerAttribute(e);
    const actionObj = getActionAttribute(e);
    editActions(name, battlerObj, actionObj);
  } else if (type == "attributes") {
    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "LOAD",
      },
      viewBattlers
    );
  } else if (type == "target_filter") {
    const name = getPlayerNameAttribute(e);
    const attributes = getAttributesAttribute(e);
    const defaultAttributes = getDefaultAttributesAttribute(e);
    editAttributes(name, attributes, defaultAttributes);
  }
};

const onDelete = async (e) => {
  const activeTab = await getActiveTabURL();
  const type = getTypeAttribute(e);

  if (type == "battler") {
    const battlerId = getBattlerIdAttribute(e);
    const battlerElementToDelete = document.getElementById(
      "battler-" + battlerId
    );
    battlerElementToDelete.parentNode.removeChild(battlerElementToDelete);

    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "DELETE",
        value: battlerId,
      },
      viewBattlers
    );
  } else if (type == "action") {
    const name = getPlayerNameAttribute(e);
    const actionId = getActionIdAttribute(e);
    let battlerObj = createBattlerObj();
    const battlerId = getBattlerIdAttribute(e);
    if (battlerId != null) {
      battlerObj.id = battlerId;
    }
    battlerObj = deleteBattlerAction(battlerObj, actionId);
    editBattlers(name, battlerObj);
  } else if (type == "group") {
    const name = getPlayerNameAttribute(e);
    const groupId = getGroupIdAttribute(e);
    let battlerObj = createBattlerObj();
    const battlerId = getBattlerIdAttribute(e);
    if (battlerId != null) {
      battlerObj.id = battlerId;
    }
    battlerObj = deleteBattlerGroup(battlerObj, groupId);
    editBattlers(name, battlerObj);
  } else if (type == "target_trigger") {
    const name = getPlayerNameAttribute(e);
    const triggerId = getTargetTriggerIdAttribute(e);
    const battlerObj = getBattlerAttribute(e);
    let actionObj = createActionObj();
    const actionId = getActionIdAttribute(e);
    if (actionId != null) {
      actionObj.id = actionId;
    }
    actionObj = deleteActionTargetTrigger(actionObj, triggerId);
    editActions(name, battlerObj, actionObj);
  } else if (type == "cast_requirement") {
    const name = getPlayerNameAttribute(e);
    const requirementId = getCastRequirementIdAttribute(e);
    const battlerObj = getBattlerAttribute(e);
    let actionObj = createActionObj();
    const actionId = getActionIdAttribute(e);
    if (actionId != null) {
      actionObj.id = actionId;
    }
    actionObj = deleteActionCastRequirement(actionObj, requirementId);
    editActions(name, battlerObj, actionObj);
  } else if (type == "target_filter") {
    const name = getPlayerNameAttribute(e);
    const filterId = getTargetFilterIdAttribute(e);
    const defaultAttributes = getDefaultAttributesAttribute(e);
    let attributes = getAttributesAttribute(e);
    attributes = deleteAttributeFilters(attributes, filterId);
    editAttributes(name, attributes, defaultAttributes);
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  const activeTab = await getActiveTabURL();

  const containerElement = document.getElementById("container");
  if (activeTab.url.includes("127.0.0.1")) {
    const titleElement = createTitleElement("Yugen Battler - Loading Page");
    containerElement.appendChild(titleElement);
    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "LOAD",
      },
      viewBattlers
    );
  } else {
    const titleElement = createTitleElement("Yugen Battler");
    const descElement = createTextElement("Go to hack.yugensaga.com/");
    containerElement.appendChild(titleElement);
    containerElement.appendChild(descElement);
  }
});
