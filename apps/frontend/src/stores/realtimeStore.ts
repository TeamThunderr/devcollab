import { create } from 'zustand';

interface RealtimeState {
  // TODO: onlineUsers, socket connection status
}

const useRealtimeStore = create<RealtimeState>()(() => ({
  // TODO: initial state
}));

export default useRealtimeStore;
