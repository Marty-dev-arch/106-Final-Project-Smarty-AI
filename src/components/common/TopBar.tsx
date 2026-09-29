import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";
import NotificationDropdown from "./NotificationDropdown";
import THEME from "../../config/theme";

export const BellIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = "#464554",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Top handle loop */}
    <Path
      d="M10.5 4.5C10.5 3.67 11.17 3 12 3C12.83 3 13.5 3.67 13.5 4.5"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
    />
    {/* Bell arch body */}
    <Path
      d="M6 17V11C6 7.69 8.69 5 12 5C15.31 5 18 7.69 18 11V17"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Bottom ledge horizontal bar */}
    <Path
      d="M4 17.5H20"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
    />
    {/* Bottom rounded clapper */}
    <Path
      d="M10.2 19C10.5 20.2 11.2 21 12 21C12.8 21 13.5 20.2 13.8 19H10.2Z"
      fill={color}
    />
  </Svg>
);

// Pixel-perfect Profile Person outline icon matching Figma reference (media_1790214006359.png)
export const ProfilePersonIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 22,
  color = "#FFFFFF",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Circle outline head */}
    <Path
      d="M12 11.5C14.07 11.5 15.75 9.82 15.75 7.75C15.75 5.68 14.07 4 12 4C9.93 4 8.25 5.68 8.25 7.75C8.25 9.82 9.93 11.5 12 11.5Z"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Open curved shoulder arch */}
    <Path
      d="M5 20C5 16.5 8 14.5 12 14.5C16 14.5 19 16.5 19 20"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface TopBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  showLogo?: boolean;
  useMascotLogo?: boolean;
  showActions?: boolean;
  showBell?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  showBack = false,
  onBack,
  showLogo = true,
  useMascotLogo = false,
  showActions = true,
  showBell = true,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { unreadCount, toggleDropdown } = useNotifications();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: Math.max(insets.top, 12),
            minHeight: 56 + Math.max(insets.top, 12),
          },
        ]}
      >
        {/* Left side: Back arrow and/or Original Logo + Title */}
        <View style={styles.leftContainer}>
          {showBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
          )}

          {showLogo && (
            <Image
              source={
                useMascotLogo
                  ? require("../../../assets/illustrations/smarty_companion_mascot.png")
                  : require("../../../assets/illustrations/smarty_logo.png")
              }
              style={styles.logoImage}
              resizeMode="contain"
            />
          )}

          <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
        </View>

        {/* Right side: Bell Icon with Badge + Profile Avatar */}
        {showActions && (
          <View style={styles.rightContainer}>
            {showBell && (
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={toggleDropdown}
              >
                <BellIcon size={24} color={isDark ? "#94A3B8" : "#1F2937"} />
                {unreadCount > 0 && (
                  <View style={styles.bellBadgeDot}>
                    {unreadCount > 1 && (
                      <Text style={styles.bellBadgeText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.profileAvatar,
                { backgroundColor: user?.photoURL ? "transparent" : "#3B46E6" },
              ]}
              onPress={() => navigation.navigate("ProfileSetiing")}
              activeOpacity={0.85}
            >
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profileAvatarImage} resizeMode="cover" />
              ) : (
                <ProfilePersonIcon size={22} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Real-time Notifications Dropdown Modal */}
      <NotificationDropdown />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    zIndex: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  leftContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 10,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  iconButton: {
    padding: 6,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  bellBadgeDot: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  bellBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3B46E6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B46E6",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
    overflow: "hidden",
  },
  profileAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});

export default TopBar;
