const React = require("react");

const View = React.forwardRef((props, ref) =>
  React.createElement("View", { ...props, ref }, props.children)
);
View.displayName = "View";

const Text = React.forwardRef((props, ref) =>
  React.createElement("Text", { ...props, ref }, props.children)
);
Text.displayName = "Text";

const Pressable = React.forwardRef((props, ref) => {
  const children =
    typeof props.children === "function"
      ? props.children({ pressed: false })
      : props.children;
  const style =
    typeof props.style === "function" ? props.style({ pressed: false }) : props.style;
  return React.createElement("Pressable", { ...props, ref, style }, children);
});
Pressable.displayName = "Pressable";

const ActivityIndicator = (props) => React.createElement("ActivityIndicator", props);
ActivityIndicator.displayName = "ActivityIndicator";

const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) =>
    Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style || {}
};

const Platform = {
  OS: "android",
  select: (obj) => obj.android ?? obj.default
};

module.exports = {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform
};
