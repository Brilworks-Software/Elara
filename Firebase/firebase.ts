import authModule from "@react-native-firebase/auth";
import firestoreModule from "@react-native-firebase/firestore";

// For React Native Firebase, the configuration is automatically loaded from:
// - iOS: GoogleService-Info.plist
// - Android: google-services.json
// Firebase is initialized in the native code (AppDelegate for iOS, MainApplication for Android)

// Get Firebase service instances by calling the modules as functions
export const auth = authModule();
export const firestore = firestoreModule();

// Export a default for compatibility
export default {
  auth,
  firestore,
};
