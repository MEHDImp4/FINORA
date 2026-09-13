const React = require("react");

const Image = React.forwardRef((props, ref) =>
  React.createElement("Image", { ...props, ref }, props.children)
);
Image.displayName = "Image";
Image.clearDiskCache = jest.fn().mockResolvedValue(true);
Image.clearMemoryCache = jest.fn().mockResolvedValue(true);

module.exports = {
  Image,
  ImageBackground: Image
};

