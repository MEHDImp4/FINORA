const tasks = new Map();

module.exports = {
  defineTask: jest.fn((taskName, executor) => {
    tasks.set(taskName, executor);
  }),
  isTaskDefined: jest.fn((taskName) => tasks.has(taskName)),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterAllTasksAsync: jest.fn().mockResolvedValue(undefined),
  _tasks: tasks
};
