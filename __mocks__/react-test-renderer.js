global.IS_REACT_ACT_ENVIRONMENT = true;
const rtr = require('react-test-renderer/cjs/react-test-renderer.development.js');
const origCreate = rtr.create;
const wrappedCreate = (...args) => {
  let instance;
  rtr.act(() => {
    instance = origCreate(...args);
  });
  return instance;
};
module.exports = {
  ...rtr,
  create: wrappedCreate,
  default: {
    ...rtr,
    create: wrappedCreate
  }
};
