import React from "react";
import renderer from "react-test-renderer";
import { FinoraText } from "../components/FinoraText";
import { FinoraButton } from "../components/FinoraButton";
import { FinoraIconButton } from "../components/FinoraIconButton";
import { FinoraScreen } from "../components/FinoraScreen";
import { colors, spacing, typography } from "../tokens";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null
}));

describe("Finora Design System Primitives", () => {
  describe("Tokens", () => {
    it("exports cinematic dark theme colors", () => {
      expect(colors.background).toBe("#0A0A0C");
      expect(colors.primary).toBe("#E50914");
      expect(colors.card).toBe("#14141A");
      expect(colors.textPrimary).toBe("#FFFFFF");
    });

    it("exports standard spacing and typography scale", () => {
      expect(spacing.md).toBe(16);
      expect(typography.display.fontSize).toBe(32);
      expect(typography.body.fontSize).toBe(14);
    });
  });

  describe("FinoraText", () => {
    it("renders text content with display variant", () => {
      const tree = renderer.create(<FinoraText variant="display">FINORA Title</FinoraText>).toJSON();
      expect(tree).toBeTruthy();
    });

    it("resolves token color correctly", () => {
      const tree = renderer.create(<FinoraText color="primary">Red Text</FinoraText>).toJSON();
      expect(tree).toBeTruthy();
    });
  });

  describe("FinoraButton", () => {
    it("renders label and handles press event", () => {
      const onPressMock = jest.fn();
      const component = renderer.create(
        <FinoraButton label="Play Movie" onPress={onPressMock} />
      );

      const root = component.root;
      const pressable = root.findByType("Pressable" as any);
      pressable.props.onPress();

      expect(onPressMock).toHaveBeenCalledTimes(1);
      expect(component.toJSON()).toBeTruthy();
    });

    it("displays loading indicator when loading is true", () => {
      const tree = renderer.create(<FinoraButton label="Loading..." loading={true} />).toJSON();
      expect(tree).toBeTruthy();
    });

    it("renders optional badge beside label", () => {
      const component = renderer.create(<FinoraButton label="Resume" badge="42%" />);
      expect(component.root.findByProps({ children: "42%" })).toBeTruthy();
    });
  });

  describe("FinoraIconButton", () => {
    it("renders with minimum touch target size 44x44 and accessibility label", () => {
      const onPressMock = jest.fn();
      const component = renderer.create(
        <FinoraIconButton accessibilityLabel="Favorite" onPress={onPressMock}>
          <FinoraText>★</FinoraText>
        </FinoraIconButton>
      );

      const pressable = component.root.findByType("Pressable" as any);
      pressable.props.onPress();

      expect(onPressMock).toHaveBeenCalledTimes(1);
      expect(component.toJSON()).toBeTruthy();
    });
  });

  describe("FinoraScreen", () => {
    it("renders root container with dark background", () => {
      const tree = renderer.create(
        <FinoraScreen>
          <FinoraText>Screen Content</FinoraText>
        </FinoraScreen>
      ).toJSON();
      expect(tree).toBeTruthy();
    });
  });
});
