import { ConfirmationModal } from "@/components/ConfirmationModal";
import { COLORS } from "@/constants/colors";
import { useAuthState, useLogout } from "@/Firebase/hooks/useAuth";
import { useUserProfile } from "@/Firebase/hooks/useUser";
import {
    requestNotificationPermission,
    retryFCMTokenRegistration,
} from "@/Firebase/services/NotificationService";
import { useRouter } from "expo-router";
import {
    Bell,
    Calendar,
    ChevronRight,
    HelpCircle,
    LogOut,
    Settings,
    ShieldCheck,
    User,
} from "lucide-react-native";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthState();
  const { data: userProfile, isLoading: profileLoading } = useUserProfile(
    user?.uid,
  );
  const logoutMutation = useLogout();
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleToggleNotifications = async () => {
    if (!user?.uid) return;

    // If enabling notifications, request permission
    if (!notificationsEnabled) {
      try {
        console.log("User is enabling notifications, requesting permission...");

        // Request permission
        const hasPermission = await requestNotificationPermission();
        console.log("Permission result:", hasPermission);

        if (hasPermission) {
          // Retry FCM token registration
          const tokenResult = await retryFCMTokenRegistration(user.uid);
          console.log("Token registration result:", tokenResult);

          if (tokenResult.success) {
            setNotificationsEnabled(true);
            Alert.alert(
              "Success",
              "Notifications have been enabled! You'll now receive reminders and updates.",
            );
          } else {
            Alert.alert(
              "Partial Setup",
              tokenResult.error ||
                "Notifications permission granted, but we're still setting up your device. Try again in a moment.",
            );
            setNotificationsEnabled(true);
          }
        } else {
          Alert.alert(
            "Permission Denied",
            "Notifications are disabled. Please enable them in Settings > Elara > Notifications.",
          );
        }
      } catch (error: any) {
        console.error("Error enabling notifications:", error);
        Alert.alert(
          "Error",
          error.message || "Failed to enable notifications. Please try again.",
        );
      }
    } else {
      // If disabling notifications, just toggle
      setNotificationsEnabled(false);
      // You can add logic here to disable notifications in Firebase
    }
  };

  const handleSignOut = async () => {
    try {
      const result = await logoutMutation.mutateAsync();
      if (result.success) {
        setShowSignOutModal(false);
        router.replace("/auth");
      } else {
        setShowSignOutModal(false);
        Alert.alert("Error", result.error || "Failed to sign out");
      }
    } catch (error: any) {
      setShowSignOutModal(false);
      Alert.alert("Error", error.message || "Failed to sign out");
    }
  };

  const getFirstName = () => {
    if (!userProfile?.name) return "";
    return userProfile.name.split(" ")[0];
  };

  const menuSections = [
    {
      title: "Account Settings",
      items: [
        {
          id: "edit-profile",
          icon: User,
          label: "Edit Profile",
          onPress: () => router.push("/(user)/edit-profile"),
        },
        {
          id: "calendar",
          icon: Calendar,
          label: "Calendar & Events",
          onPress: () => router.push("/(user)/calendar"),
        },
        {
          id: "notifications",
          icon: Bell,
          label: "Notifications",
          onPress: () => handleToggleNotifications(),
          hasToggle: true,
        },
        {
          id: "privacy",
          icon: ShieldCheck,
          label: "Privacy & Security",
          onPress: () => router.push("/(user)/privacy-security"),
        },
      ],
    },
    {
      title: "Support & About",
      items: [
        {
          id: "help",
          icon: HelpCircle,
          label: "Help Support",
          onPress: () => router.push("/(user)/help-support"),
        },
        {
          id: "about",
          icon: Settings,
          label: "About App",
          onPress: () => router.push("/(user)/about-app"),
        },
      ],
    },
  ];

  if (profileLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {userProfile?.photoURL ? (
            <Image
              source={{ uri: userProfile.photoURL }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {userProfile?.name ? userProfile.name[0].toUpperCase() : "U"}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>
              {userProfile?.name || "User Name"}
            </Text>
            <Text style={styles.userEmail}>
              {userProfile?.email || "email@example.com"}
            </Text>
            <View style={styles.tagContainer}>
              <View style={styles.journeyTag}>
                <Text style={styles.journeyTagText}>
                  {userProfile?.selectedJourney
                    ? userProfile.selectedJourney.charAt(0).toUpperCase() +
                      userProfile.selectedJourney.slice(1)
                    : "Journey"}
                </Text>
              </View>
              {userProfile?.pregnancyWeek && (
                <View style={styles.weekTag}>
                  <Text style={styles.weekTagText}>
                    Week {userProfile.pregnancyWeek}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIdx) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuList}>
              {section.items.map((item, itemIdx) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuItemPressed,
                    itemIdx === section.items.length - 1 && styles.noBorder,
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.menuIconContainer}>
                    <item.icon
                      size={20}
                      color={COLORS.PRIMARY}
                      strokeWidth={2}
                    />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.hasToggle ? (
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={handleToggleNotifications}
                      trackColor={{
                        false: "#E0E0E0",
                        true: COLORS.PRIMARY_LIGHT,
                      }}
                      thumbColor={
                        notificationsEnabled ? COLORS.PRIMARY : "#F4F4F4"
                      }
                      ios_backgroundColor="#E0E0E0"
                    />
                  ) : (
                    <ChevronRight size={20} color="#999" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          onPress={() => setShowSignOutModal(true)}
        >
          <View style={styles.logoutIconContainer}>
            <LogOut size={20} color="#FF6B6B" strokeWidth={2} />
          </View>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Sign Out Confirmation Modal */}
      <ConfirmationModal
        visible={showSignOutModal}
        title="Sign Out"
        message="Are you sure you want to sign out from Elara?"
        confirmText="Sign Out"
        cancelText="Cancel"
        confirmDestructive
        isLoading={logoutMutation.isPending}
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFBFB",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  profileCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 24,
    marginBottom: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEE",
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.PINK,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.PRIMARY,
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#999",
    marginBottom: 10,
  },
  tagContainer: {
    flexDirection: "row",
    gap: 8,
  },
  journeyTag: {
    backgroundColor: "#F5E6EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  journeyTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.PRIMARY,
  },
  weekTag: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  weekTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    marginBottom: 12,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  menuList: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  menuItemPressed: {
    backgroundColor: "#FAFAFA",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 24,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  logoutButtonPressed: {
    backgroundColor: "#FFEBEB",
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B6B",
    flex: 1,
  },
  footer: {
    marginTop: 32,
    alignItems: "center",
  },
  versionText: {
    fontSize: 12,
    color: "#CCC",
  },
});
