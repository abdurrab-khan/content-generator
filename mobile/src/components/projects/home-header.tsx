import { useState } from "react";
import { Pressable, TouchableOpacity, View } from "react-native";
import { useSession } from "../../session/session-provider";
import { colors, fonts, radii } from "../../theme";
import { AccountSheet } from "../auth/account-sheet";
import { AppText } from "../ui/app-text";

/** Home header: greeting + avatar that opens the account sheet. */

export function HomeHeader() {
  const { user } = useSession();
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption">Welcome back</AppText>
          <AppText variant="heading" numberOfLines={1}>
            {user?.name?.split(" ")[0] ?? "there"}
          </AppText>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Account menu"
          onPress={() => setAccountOpen(true)}
          style={{
            width: 42,
            height: 42,
            borderRadius: radii.full,
            backgroundColor: colors.cardAlt,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppText
            variant="subheading"
            style={{ color: colors.primaryBright, fontFamily: fonts.bold }}
          >
            {(user?.name ?? "?").slice(0, 1).toUpperCase()}
          </AppText>
        </TouchableOpacity>
      </View>

      <AccountSheet
        visible={accountOpen}
        onClose={() => setAccountOpen(false)}
      />
    </>
  );
}
