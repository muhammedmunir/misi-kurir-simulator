export enum Scene {
  MENU = "menu",
  LOAD_SAVE = "load_save",
  TUTORIAL = "tutorial",
  GAME = "game",
  PAUSE = "pause",
  WAREHOUSE = "warehouse",
  DELIVERY = "delivery",
  SHOP = "shop",
  BUSINESS = "business",
  SETTINGS = "settings",
}

export type AppStateAction =
  | { type: "NAVIGATE"; scene: Scene }
  | { type: "SET_SCENE"; scene: Scene }
  | { type: "CANCEL_TRANSITION" };
