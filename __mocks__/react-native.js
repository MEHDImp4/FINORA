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

const KeyboardAvoidingView = React.forwardRef((props, ref) =>
  React.createElement("KeyboardAvoidingView", { ...props, ref }, props.children)
);
KeyboardAvoidingView.displayName = "KeyboardAvoidingView";

const TouchableOpacity = React.forwardRef((props, ref) =>
  React.createElement("TouchableOpacity", { ...props, ref }, props.children)
);
TouchableOpacity.displayName = "TouchableOpacity";

const Switch = React.forwardRef((props, ref) =>
  React.createElement("Switch", { ...props, ref })
);
Switch.displayName = "Switch";

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
  const header =
    typeof props.ListHeaderComponent === "function"
      ? React.createElement(props.ListHeaderComponent)
      : props.ListHeaderComponent || null;
  const footer =
    typeof props.ListFooterComponent === "function"
      ? React.createElement(props.ListFooterComponent)
      : props.ListFooterComponent || null;
  const empty =
    (!props.data || props.data.length === 0)
      ? typeof props.ListEmptyComponent === "function"
        ? React.createElement(props.ListEmptyComponent)
        : props.ListEmptyComponent || null
      : null;
  return React.createElement("FlatList", { ...props, ref }, header, items, empty, footer);
});
FlatList.displayName = "FlatList";

const ActivityIndicator = (props) => React.createElement("ActivityIndicator", props);
ActivityIndicator.displayName = "ActivityIndicator";

const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) =>
    Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style || {},
  absoluteFill: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  },
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

const PanResponder = {
  create: (config) => ({
    panHandlers: {
      onStartShouldSetResponder: config.onStartShouldSetPanResponder || (() => true),
      onMoveShouldSetResponder: config.onMoveShouldSetPanResponder || (() => true),
      onResponderGrant: config.onPanResponderGrant || (() => {}),
      onResponderMove: config.onPanResponderMove || (() => {}),
      onResponderRelease: config.onPanResponderRelease || (() => {}),
      onResponderTerminate: config.onPanResponderTerminate || (() => {})
    }
  })
};

const Modal = React.forwardRef((props, ref) =>
  props.visible ? React.createElement("Modal", { ...props, ref }, props.children) : null
);
Modal.displayName = "Modal";

const TextInput = React.forwardRef((props, ref) =>
  React.createElement("TextInput", { ...props, ref }, props.children)
);
TextInput.displayName = "TextInput";

const Keyboard = {
  dismiss: jest.fn(),
  addListener: () => ({ remove: () => {} })
};

const AccessibilityInfo = {
  isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
  addEventListener: () => ({ remove: () => {} })
};

const useWindowDimensions = () => ({ width: 390, height: 844, scale: 3, fontScale: 1 });

const Alert = {
  alert: jest.fn()
};

class AnimatedValue {
  constructor(val) {
    this._value = val;
  }
  setValue(val) {
    this._value = val;
  }
  interpolate(config) {
    return this;
  }
}

const Animated = {
  Value: AnimatedValue,
  timing: (val, config) => ({
    start: (callback) => {
      if (config && config.toValue !== undefined) {
        val.setValue(config.toValue);
      }
      if (callback) callback({ finished: true });
    },
    stop: () => {}
  }),
  sequence: (animations) => ({
    start: (callback) => {
      animations.forEach((a) => a.start());
      if (callback) callback({ finished: true });
    },
    stop: () => {}
  }),
  loop: (animation) => ({
    start: (callback) => {
      animation.start();
    },
    stop: () => {}
  }),
  View: View
};

module.exports = {
  View,
  Text,
  TextInput,
  Keyboard,
  Pressable,
  Switch,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Dimensions,
  PixelRatio,
  StatusBar,
  AppState,
  PanResponder,
  Modal,
  AccessibilityInfo,
  useWindowDimensions,
  Alert,
  Animated,
  NativeModules: {},
  Vibration: {
    vibrate: jest.fn(),
    cancel: jest.fn()
  },
  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    addEventListener: () => ({ remove: () => {} })
  }
};
