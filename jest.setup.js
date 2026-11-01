const { notifyManager } = require("@tanstack/react-query");

// TanStack Query intentionally batches notifications with setTimeout(0). In Jest
// that scheduler can outlive a renderer that a test has already finished with,
// producing late React updates and keeping handles alive. Production scheduling
// is unchanged; tests use an immediate deterministic scheduler instead.
notifyManager.setScheduler((callback) => callback());
