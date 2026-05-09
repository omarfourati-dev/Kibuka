import { create } from 'zustand';
import type { Space } from '@omarsapp/shared-types';

interface SpaceState {
  currentSpace: Space | null;
  spaces: Space[];
  setCurrentSpace: (space: Space) => void;
  setSpaces: (spaces: Space[]) => void;
}

export const useSpaceStore = create<SpaceState>()((set) => ({
  currentSpace: null,
  spaces: [],
  setCurrentSpace: (space) => set({ currentSpace: space }),
  setSpaces: (spaces) => set({ spaces }),
}));
