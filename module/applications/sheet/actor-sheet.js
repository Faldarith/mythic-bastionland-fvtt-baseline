import { config } from "../../config.js";
import { actorRestAction } from "../../actions/actor-rest-action.js";
import { actorRollScarsAction } from "../../actions/actor-roll-scars-action.js";
import { actorSaveAction } from "../../actions/actor-save-action.js";
import { actorRestoreAction } from "../../actions/actor-restore-action.js";
import { actorTakeDamageAction } from "../../actions/actor-take-damage-action.js";
import { attackVirtueLossAction } from "../../actions/actor-virtue-loss-action.js";
import { actorAttackAction } from "../../actions/actor-attack-action.js";
import { actorRegenerateAction } from "../../actions/actor-regenerate-action.js";
import { actorAddItemAction } from "../../actions/actor-add-item-action.js";
import { actorInlineRollAction } from "../../actions/actor-inline-roll-action.js";

/**
 * @extends {ActorSheet}
 */
export class MBActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["mythic-bastionland", "sheet", "actor"],
      width: 630,
      minWidth: 630,
      height: 600,
      scrollY: [".scrollable"]
    });
  }

  /** @override */
  get title() {
    const title = super.title;
    return `${title} - ${game.i18n.localize(`TYPES.Actor.${this.actor.type}`)}`;
  }

  /** @override */
  get template() {
    const path = `${config.systemPath}/templates/applications/sheet/actor/`;
    return `${path}/${this.actor.type}-sheet.hbs`;
  }

  /** @override */
  _getHeaderButtons() {
    return [{
      class: `regenerate-button-${this.actor.id}`,
      label: game.i18n.localize("MB.Regenerate"),
      icon: "fas fa-dice-d20",
      onclick: event => this.invokeAction(event, actorRegenerateAction, this.actor)
    }, ...super._getHeaderButtons()];
  }

  /** @override */
  async getData(options) {
    let data = super.getData(options);
    data.config = config;

    data = await this.prepareActors(data);
    data = await this.prepareItems(data);

    console.log(data);

    return data;
  }

  async prepareItems(data) {
    const itemTypeOrders = { weapon: 1, shield: 2, plate: 3, coat: 4, helm: 5, misc: 6, passion: 7, ability: 7, scar: 7 };
    data.data.items = data.data.items.sort((a, b) => itemTypeOrders[a.type] - itemTypeOrders[b.type] || a.name.localeCompare(b.name));

    for (const item of data.data.items) {
      item.system.enrichedDescription = await TextEditor.enrichHTML(item.system.description);
      item.system.isEquippable = [config.itemTypes.weapon, config.itemTypes.coat, config.itemTypes.plate, config.itemTypes.helm, config.itemTypes.shield].includes(item.type);
    }

    data.data.abilities = data.data.items.filter((item) => item.type === config.itemTypes.ability);
    data.data.passions = data.data.items.filter((item) => item.type === config.itemTypes.passion);
    data.data.scars = data.data.items.filter((item) => item.type === config.itemTypes.scar);
    data.data.properties = data.data.items.filter((item) => ([config.itemTypes.weapon, config.itemTypes.coat, config.itemTypes.plate, config.itemTypes.helm, config.itemTypes.shield, config.itemTypes.misc].includes(item.type)));

    return data;
  }

  async prepareActors(data) {
    const actors = [];
    for (const uuid of data.data.system.actors ?? []) {
      const actor = await fromUuid(uuid);
      if (actor) {
        actors.push((await actor.sheet.getData()).data);
      }
    }
    data.data.steeds = actors.filter((actor) => actor.type === "steed");
    data.data.companions = actors.filter((actor) => actor.type === "npc");
    return data;
  }

  /**
   * @param {String} event
   * @param {Object} listeners
   */
  bindSelectorsEvent(event, listeners) {
    for (const [selector, callback] of Object.entries(listeners)) {
      this.element.find(selector).on(event, callback.bind(this));
    }
  }

  /**
   * @param {MouseEvent} event
   * @returns {PBItem}
   */
  getItem(event) {
    return this.actor.items.get(this.getClosestData(event, "item-id"));
  }

  /**
   * @param {MouseEvent} event
   * @returns {PBItem}
   */
  getActor(event) {
    return game.actors.get(this.getClosestData(event, "item-id"));
  }

  /**
   * @param {MouseEvent} event
   * @param {String} data 
   * @returns {String}
   */
  getClosestData(event, data) {
    return $(event.target).closest(`[data-${data}]`).data(data);
  }

  /**
   * @override
   *
   * @param {JQuery.<HTMLElement>} html
   */
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.options.editable) return;

    this.bindSelectorsEvent("click", {
      ".item-toggle-equipped": this._onToggleEquipped,
      ".item-edit": this._onItemEdit,
      ".item-delete": this._onItemDelete,
      ".actor-edit": this._onActorEdit,
      ".actor-delete": this._onActorDelete,
      ".item-qty-plus": this._onItemAddQuantity,
      ".item-qty-minus": this._onItemSubtractQuantity,
      ".roll-save": event => this.invokeAction(event, actorSaveAction, this.actor, this.getClosestData(event, "virtue")),
      ".button-add-item": event => this.invokeAction(event, actorAddItemAction, this.actor),
      ".button-rest": event => this.invokeAction(event, actorRestAction, this.actor),
      ".button-roll-scars": event => this.invokeAction(event, actorRollScarsAction, this.actor),
      ".button-restore": event => this.invokeAction(event, actorRestoreAction, this.actor),
      ".button-take-damage": event => this.invokeAction(event, actorTakeDamageAction, this.actor),
      ".button-virtue-loss": event => this.invokeAction(event, attackVirtueLossAction, this.actor),
      ".button-attack": event => this.invokeAction(event, actorAttackAction, this.actor),
      ".inline-roll": event => this.invokeAction(event, actorInlineRollAction, ...this.getOnlineRollData(this.actor, event))
    });
  }

  /**
   * @private
   *
   * @param {MouseEvent} event
   */
  getOnlineRollData(actor, event) {
    console.log(this.getClosestData(event, "data-actor-id"));
    console.log(game.actors.get(this.getClosestData(event, "actor-id")) );
    return [
      game.actors.get(this.getClosestData(event, "actor-id")) ?? actor,
      this.getClosestData(event, "formula"),
      this.getClosestData(event, "flavor"),
      this.getClosestData(event, "source"),
      this.getClosestData(event, "fatigue")
    ];
  }

  /**
   * @param {MouseEvent} event 
   * @param {Function} action 
   * @param  {...any} args 
   */
  async invokeAction(event, action, ...args) {
    event.preventDefault();
    event.stopPropagation();
    await action(...args);
  }

  /**
   * @private
   *
   * @param {MouseEvent} event
   */
  async _onItemEdit(event) {
    event.preventDefault();
    const item = this.getItem(event);
    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * @private
   *
   * @param {MouseEvent} event
   */
  async _onActorEdit(event) {
    event.preventDefault();
    const actor = this.getActor(event);
    if (actor) {
      actor.sheet.render(true);
    }
  }

  /**
   * @private
   *
   * @param {MouseEvent} event
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const item = this.getItem(event);
    await this.actor.deleteEmbeddedDocuments("Item", [item.id]);
  }

  /**
   * @private
   *
   * @param {MouseEvent} event
   */
  async _onActorDelete(event) {
    event.preventDefault();
    const actor = this.getActor(event);
    this.actor.update({ "system.actors": this.actor.system.actors.filter((a) => a !== actor.uuid) });
  }

  /**
   * @private
   *
   * @param {MouseEvent} event
   */
  async _onItemAddQuantity(event) {
    event.preventDefault();
    const item = this.getItem(event);
    await item.update({ "system.quantity.value": Math.min(item.system.quantity.value + 1, item.system.quantity.max) });
  }

  /**
   * @private
   *
   * @param {MouseEvent} event
   */
  async _onItemSubtractQuantity(event) {
    event.preventDefault();
    const item = this.getItem(event);
    await item.update({ "system.quantity.value": Math.max(item.system.quantity.value - 1, 0) });
  }

  /**
   * @private
   *
   * @param {MouseEvent} event
   */
  async _onToggleEquipped(event) {
    const item = this.getItem(event);
    await item.update({ "system.equipped": !item.system.equipped });
  }

  /**
   * @param {Event} event 
   * @param {{updateData: Object, preventClose: Boolean}}
   * @returns 
   */
  async _onSubmit(event, { updateData = null, preventClose = false } = {}) {
    const fields = [
      "system.glory",
      "system.guard.value", "system.guard.max",
      "system.virtues.vigour.value", "system.virtues.vigour.max",
      "system.virtues.clarity.value", "system.virtues.clarity.max",
      "system.virtues.spirit.value", "system.virtues.spirit.max"
    ];

    fields.forEach((key) => {
      const field = this.element.find(`[name='${key}']`);
      if (field.length) {
        field.val(Math.max(field.val(), 0));
      }
    });

    return super._onSubmit(event, { updateData, preventClose });
  }

  /**
   * @param {DragEvent} event
   * @param {ActorSheet.DropData.Actor} actorData
   * @private
   */
  async _onDropActor(event, actorData) {
    const actor = await fromUuid(actorData.uuid);
    if ([config.actorTypes.steed, config.actorTypes.npc].includes(actor.type)) {
      this.actor.update({ "system.actors": [...new Set([...this.actor.system.actors, actorData.uuid])] });
    }
  }
}
