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

const ScrollView = React.forwardRef((props, ref) =>
  React.createElement("ScrollView", { ...props, ref }, props.children)
);
ScrollView.displayName = "ScrollView";

const RefreshControl = (props) => React.createElement("RefreshControl", props);
RefreshControl.displayName = "RefreshControl";

const FlatList = React.forwardRef((props, ref) => {
  const items = Array.isArray(props.data)
    ? props.data.map((item, index) => {
        const key = props.keyExtractor ? props.keyExtractor(item, index) : String(index);
        const element = props.renderItem ? props.renderItem({ item, index }) : null;
        return element ? React.cloneElement(element, { key }) : null;
      })
    : null;
  return React.createElement("FlatList", { ...props, ref }, items);
});
FlatList.displayName = "FlatList";

const ActivityIndicator = (props) => React.createElement("ActivityIndicator", props);
ActivityIndicator.displayName = "ActivityIndicator";

const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) =>
    Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style || {},
  absoluteFillObject: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  }
};

const Platform = {
  OS: "android",
  select: (obj) => obj.android ?? obj.default
};

const Dimensions = {
  get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 })
};

const PixelRatio = {
  get: () => 3,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (size) => size * 3,
  roundToNearestPixel: (size) => size
};

const StatusBar = () => null;
StatusBar.currentHeight = 44;
StatusBar.setHidden = () => {};
StatusBar.setBarStyle = () => {};

const AppState = {
  currentState: "active",
  addEventListener: () => ({
    remove: () => {}
  })
};

module.exports = {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Dimensions,
  PixelRatio,
  StatusBar,
  AppState
};
