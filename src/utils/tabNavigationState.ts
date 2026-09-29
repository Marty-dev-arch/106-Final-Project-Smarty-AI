/**
 * tabNavigationState.ts
 * A tiny module-level singleton that tracks which tab was last active
 * so slide direction can be calculated (left ← vs right →) on tab switches.
 */

import { TabKey } from '../components/common/BottomNav';

const TAB_ORDER: TabKey[] = ['Home', 'Quizzes', 'Create', 'Awards', 'Performance'];

let previousTab: TabKey = 'Home';
let currentTab: TabKey = 'Home';

export const tabNavState = {
  getDirection(): 'left' | 'right' {
    const prevIdx = TAB_ORDER.indexOf(previousTab);
    const currIdx = TAB_ORDER.indexOf(currentTab);
    // Navigating to a tab with higher index → content comes from the right
    return currIdx >= prevIdx ? 'right' : 'left';
  },

  setTab(tab: TabKey) {
    previousTab = currentTab;
    currentTab = tab;
  },

  getCurrent(): TabKey {
    return currentTab;
  },
};
