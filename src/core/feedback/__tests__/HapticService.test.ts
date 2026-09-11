import { Vibration } from "react-native";
import { HapticService } from "../hapticService";

describe("HapticService", () => {
  let service: HapticService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HapticService();
  });

  it("triggers vibration for impactLight, impactMedium, and selection", () => {
    service.impactLight();
    expect(Vibration.vibrate).toHaveBeenCalledTimes(1);

    service.impactMedium();
    expect(Vibration.vibrate).toHaveBeenCalledTimes(2);

    service.selection();
    expect(Vibration.vibrate).toHaveBeenCalledTimes(3);
  });

  it("respects setEnabled(false) to suppress vibrations", () => {
    service.setEnabled(false);
    expect(service.isEnabled()).toBe(false);

    service.impactLight();
    service.impactMedium();
    service.impactHeavy();
    service.selection();
    service.notificationSuccess();
    service.notificationError();

    expect(Vibration.vibrate).not.toHaveBeenCalled();
  });

  it("handles exceptions gracefully without throwing", () => {
    (Vibration.vibrate as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Vibrator service failed");
    });

    expect(() => {
      service.impactLight();
    }).not.toThrow();
  });
});
