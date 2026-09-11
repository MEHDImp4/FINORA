const React = require("react");

function MockIcon(props) {
  return React.createElement("Text", props, props.name || "");
}

module.exports = {
  Ionicons: MockIcon,
  MaterialIcons: MockIcon,
  FontAwesome: MockIcon,
  Feather: MockIcon,
  AntDesign: MockIcon
};
