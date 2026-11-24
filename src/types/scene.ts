export enum Scene {
  MENU = 'menu',
  LOAD_SAVE = 'load_save',
  TUTORIAL = 'tutorial',
  GAME = 'game',
  PAUSE = 'pause',
  WAREHOUSE = 'warehouse',
  DELIVERY = 'delivery',
  SHOP = 'shop',
  BUSINESS = 'business',
  SETTINGS = 'settings',
}

import { Scene } from './types/scene';

type AppState = {
  currentScene: Scene;
  nextScene: Scene | null;
  isTransitioning: boolean;
};

function appStateReducer(state: AppState, action: AppStateAction): AppState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, nextScene: action.scene, isTransitioning: true };
    case 'SET_SCENE':
      return { ...state, currentScene: action.scene, nextScene: null, isTransitioning: false };
    case 'CANCEL_TRANSITION':
      return { ...state, nextScene: null, isTransitioning: false };
    default:
      return state;
  }
}

export type AppStateAction =
  | { type: 'NAVIGATE'; scene: Scene }
  | { type: 'SET_SCENE'; scene: Scene }
  | { type: 'CANCEL_TRANSITION' };

export { Scene };
