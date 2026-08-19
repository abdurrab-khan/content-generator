import { Pressable, View } from "react-native";
import { colors, fonts, radii } from "../../theme";
import { AppText } from "./app-text";

/**
 * Segmented tab switch (requirement #4) — pill container, highlighted active
 * segment, optional count badges. Renders a stable view tree per segment so
 * presses can never be cancelled by a mid-gesture restructure.
 */

export interface TabItem<T extends string> {
  key: T;
  label: string;
  count?: number;
}

export interface SegmentedTabsProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
}

export function SegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
}: SegmentedTabsProps<T>) {
  return (
    <View
      style={{
        overflow: "hidden",
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 4,
        gap: 4,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(tab.key)}
            style={{ flex: 1 }}
          >
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
                paddingVertical: 9,
                borderRadius: radii.full,
                overflow: "hidden",
                backgroundColor: isActive ? colors.primary : "transparent",
              }}
            >
              <AppText
                variant="label"
                style={{
                  color: isActive ? "#fff" : colors.textMuted,
                  fontFamily: isActive ? fonts.semibold : fonts.medium,
                }}
              >
                {tab.label}
              </AppText>
              {tab.count !== undefined ? (
                <View
                  style={{
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.25)"
                      : colors.cardAlt,
                    borderRadius: radii.full,
                    paddingHorizontal: 7,
                    paddingVertical: 1,
                  }}
                >
                  <AppText
                    variant="caption"
                    style={{
                      color: isActive ? "#fff" : colors.textDim,
                      fontSize: 11,
                    }}
                  >
                    {tab.count}
                  </AppText>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
