import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { NotificationsModal } from "../components/NotificationsModal";
import { useNotificationStore, FinoraNotification } from "../../../stores/notificationStore";

describe("NotificationsModal", () => {
  const sampleNotifications: FinoraNotification[] = [
    {
      id: "notif-1",
      title: "Nouvel épisode disponible",
      body: "L'épisode 5 de Severance Saison 2 est disponible.",
      type: "new_episode",
      mediaId: "ep-105",
      timestamp: Date.now() - 3600000,
      read: false
    },
    {
      id: "notif-2",
      title: "Nouveau film ajouté",
      body: "Dune: Part Two a été ajouté à votre serveur.",
      type: "new_movie",
      mediaId: "movie-200",
      timestamp: Date.now() - 7200000,
      read: true
    },
    {
      id: "notif-3",
      title: "Nouvelle série",
      body: "Shogun Saison 1 est disponible.",
      type: "new_series",
      mediaId: "series-300",
      timestamp: Date.now() - 86400000,
      read: false
    }
  ];

  beforeEach(() => {
    useNotificationStore.setState({
      notifications: sampleNotifications,
      unreadCount: 2
    });
    jest.clearAllMocks();
  });

  it("renders modal with notification cards and unread count", () => {
    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <NotificationsModal visible={true} onClose={jest.fn()} />
      );
    });

    const root = component!.root;
    expect(root.findByProps({ children: "Notifications" })).toBeDefined();
    expect(root.findByProps({ children: 2 })).toBeDefined();
    expect(root.findByProps({ children: "Nouvel épisode disponible" })).toBeDefined();
    expect(root.findByProps({ children: "Nouveau film ajouté" })).toBeDefined();
  });

  it("filters notifications when category tabs are clicked", () => {
    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <NotificationsModal visible={true} onClose={jest.fn()} />
      );
    });

    const root = component!.root;
    const seriesText = root.findByProps({ children: "Séries" });
    const seriesPressable = seriesText.parent;

    expect(seriesPressable).toBeDefined();
    ReactTestRenderer.act(() => {
      seriesPressable!.props.onPress();
    });

    expect(root.findByProps({ children: "Nouvel épisode disponible" })).toBeDefined();
    expect(root.findAllByProps({ children: "Nouveau film ajouté" })).toHaveLength(0);
  });

  it("calls onSelectMedia and marks notification as read when an item is pressed", () => {
    const onSelectMediaMock = jest.fn();
    const onCloseMock = jest.fn();

    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <NotificationsModal
          visible={true}
          onClose={onCloseMock}
          onSelectMedia={onSelectMediaMock}
        />
      );
    });

    const root = component!.root;
    const itemPressable = root.findAllByType("Pressable" as any).find(
      (p) =>
        p.props.accessibilityLabel &&
        p.props.accessibilityLabel.includes("Nouvel épisode disponible")
    );

    expect(itemPressable).toBeDefined();
    ReactTestRenderer.act(() => {
      itemPressable!.props.onPress();
    });

    expect(onSelectMediaMock).toHaveBeenCalledWith("ep-105");
    expect(onCloseMock).toHaveBeenCalled();

    const updated = useNotificationStore.getState().notifications.find((n) => n.id === "notif-1");
    expect(updated?.read).toBe(true);
  });

  it("marks all notifications as read when clicking mark all button", () => {
    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <NotificationsModal visible={true} onClose={jest.fn()} />
      );
    });

    const root = component!.root;
    const markAllPressable = root.findAllByType("Pressable" as any).find(
      (p) => p.props.accessibilityLabel === "Tout marquer comme lu"
    );

    expect(markAllPressable).toBeDefined();
    ReactTestRenderer.act(() => {
      markAllPressable!.props.onPress();
    });

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications.every((n) => n.read)).toBe(true);
  });

  it("renders empty state when there are no notifications", () => {
    useNotificationStore.setState({ notifications: [], unreadCount: 0 });

    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <NotificationsModal visible={true} onClose={jest.fn()} />
      );
    });

    expect(component!.root.findByProps({ children: "Tout est à jour" })).toBeDefined();
  });
});
