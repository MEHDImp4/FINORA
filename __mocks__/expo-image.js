const React = require("react");

const Image = React.forwardRef((props, ref) =>
  React.createElement("Image", { ...props, ref }, props.children)
);
Image.displayName = "Image";

module.exports = {
  Image,
  ImageBackground: Image
};

