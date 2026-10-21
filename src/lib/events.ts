// Browser events that keep the local stores and the account sync in step.

/** Fired after the CV or progress is written locally by the user. The sync engine uploads it. */
export const LOCAL_CHANGE = "bridgeuni:local-change";
/** Fired after data is replaced from outside (account download, restore, log out). Hooks reload. */
export const DATA_REPLACED = "bridgeuni:data-replaced";

export const emit = (name: string) => window.dispatchEvent(new Event(name));
