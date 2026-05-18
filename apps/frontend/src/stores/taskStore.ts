import { create } from 'zustand';

interface TaskState {
  // TODO: tasks by column, selected task, filters
}

const useTaskStore = create<TaskState>()(() => ({
  // TODO: initial state
}));

export default useTaskStore;
