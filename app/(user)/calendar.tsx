import { COLORS } from "@/constants/colors";
import { useAuthState } from "@/Firebase/hooks/useAuth";
import {
    useCreateEvent,
    useDeleteEvent,
    useEventsByDate,
    useUserEvents,
} from "@/Firebase/hooks/useCalendar";
import { CalendarEvent } from "@/Firebase/services/CalendarService";
import { scheduleEventNotification } from "@/Firebase/services/NotificationService";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import {
    ArrowLeft,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    Plus,
    X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuthState();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    time: new Date(),
    timeString: "",
    type: "personal" as CalendarEvent["type"],
  });

  // Fetch events
  const { data: allEvents = [], isLoading: eventsLoading } = useUserEvents(
    user?.uid,
  );

  // Mutations
  const createEventMutation = useCreateEvent();
  const deleteEventMutation = useDeleteEvent();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const formatTimeString = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatDisplayTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  };

  // Calculate selected date string after formatDate is defined
  const selectedDateString = formatDate(selectedDate);
  const { data: selectedDateEvents = [] } = useEventsByDate(
    user?.uid,
    selectedDateString,
  );

  const isSameDay = (date1: Date, date2: Date) => {
    return formatDate(date1) === formatDate(date2);
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const checkDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    );
    return isSameDay(checkDate, new Date());
  };

  const isSelectedDay = (day: number | null) => {
    if (!day) return false;
    const checkDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    );
    return isSameDay(checkDate, selectedDate);
  };

  const hasEvent = (day: number | null) => {
    if (!day) return false;
    const checkDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    );
    const dateString = formatDate(checkDate);
    return allEvents.some((event) => event.date === dateString);
  };

  const getEventsForSelectedDate = () => {
    return selectedDateEvents;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const handleDayPress = (day: number | null) => {
    if (!day) return;
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    );
    setSelectedDate(newDate);
  };

  const handleTimePickerChange = (
    event: any,
    selectedTime: Date | undefined,
  ) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      const timeString = formatTimeString(selectedTime);
      setNewEvent({
        ...newEvent,
        time: selectedTime,
        timeString: timeString,
      });
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !user?.uid) return;

    createEventMutation.mutate(
      {
        userId: user.uid,
        eventData: {
          date: selectedDateString,
          title: newEvent.title,
          time: newEvent.timeString,
          type: newEvent.type,
        },
      },
      {
        onSuccess: async (eventData: any) => {
          // If event has a time, schedule a notification
          if (newEvent.timeString && eventData?.eventId) {
            try {
              await scheduleEventNotification({
                userId: user.uid,
                eventId: eventData.eventId,
                eventTitle: newEvent.title,
                eventDate: selectedDateString,
                eventTime: newEvent.timeString,
                eventType: newEvent.type,
              });
            } catch (error) {
              console.warn("Failed to schedule notification:", error);
              // Don't fail the event creation if notification scheduling fails
            }
          }

          setNewEvent({
            title: "",
            time: new Date(),
            timeString: "",
            type: "personal",
          });
          setShowAddEventModal(false);
        },
        onError: (error) => {
          console.error("Failed to create event:", error);
        },
      },
    );
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!user?.uid) return;

    deleteEventMutation.mutate(
      { userId: user.uid, eventId },
      {
        onError: (error) => {
          console.error("Failed to delete event:", error);
        },
      },
    );
  };

  const getEventColor = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "appointment":
        return "#FF6B9D";
      case "milestone":
        return "#FFB84D";
      case "reminder":
        return "#5B9FFF";
      case "personal":
        return "#9B7EDE";
      default:
        return COLORS.PRIMARY;
    }
  };

  const days = getDaysInMonth(currentDate);
  const todayEvents = getEventsForSelectedDate();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <ArrowLeft size={24} color={COLORS.PRIMARY} strokeWidth={2.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Calendar</Text>
        <Pressable
          onPress={() => setShowAddEventModal(true)}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
        >
          <Plus size={24} color={COLORS.PRIMARY} strokeWidth={2.5} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Calendar */}
        <View style={styles.calendarCard}>
          {/* Month Navigation */}
          <View style={styles.monthHeader}>
            <Pressable onPress={goToPreviousMonth} style={styles.monthButton}>
              <ChevronLeft size={24} color={COLORS.PRIMARY} />
            </Pressable>
            <Text style={styles.monthText}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
            <Pressable onPress={goToNextMonth} style={styles.monthButton}>
              <ChevronRight size={24} color={COLORS.PRIMARY} />
            </Pressable>
          </View>

          {/* Day Names */}
          <View style={styles.dayNamesRow}>
            {dayNames.map((day) => (
              <View key={day} style={styles.dayNameCell}>
                <Text style={styles.dayNameText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {days.map((day, index) => (
              <Pressable
                key={index}
                style={[
                  styles.dayCell,
                  !day && styles.emptyDayCell,
                  isToday(day) && styles.todayCell,
                  isSelectedDay(day) && styles.selectedDayCell,
                ]}
                onPress={() => handleDayPress(day)}
                disabled={!day}
              >
                {day && (
                  <>
                    <Text
                      style={[
                        styles.dayText,
                        isToday(day) && styles.todayText,
                        isSelectedDay(day) && styles.selectedDayText,
                      ]}
                    >
                      {day}
                    </Text>
                    {hasEvent(day) && <View style={styles.eventDot} />}
                  </>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Events for Selected Date */}
        <View style={styles.eventsSection}>
          <View style={styles.eventsSectionHeader}>
            <CalendarIcon size={20} color={COLORS.PRIMARY} />
            <Text style={styles.eventsSectionTitle}>
              Events for{" "}
              {selectedDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>

          {eventsLoading ? (
            <View style={styles.noEventsCard}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Loading events...</Text>
            </View>
          ) : todayEvents.length === 0 ? (
            <View style={styles.noEventsCard}>
              <Text style={styles.noEventsText}>No events scheduled</Text>
              <Text style={styles.noEventsSubtext}>
                Tap the + button to add an event
              </Text>
            </View>
          ) : (
            todayEvents.map((event) => (
              <View
                key={event.id}
                style={[
                  styles.eventCard,
                  { borderLeftColor: getEventColor(event.type) },
                ]}
              >
                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {event.time && (
                    <View style={styles.eventTimeRow}>
                      <Clock size={14} color="#999" />
                      <Text style={styles.eventTime}>{event.time}</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.eventTypeBadge,
                      { backgroundColor: getEventColor(event.type) + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.eventTypeText,
                        { color: getEventColor(event.type) },
                      ]}
                    >
                      {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleDeleteEvent(event.id)}
                  style={styles.deleteButton}
                >
                  <X size={18} color="#FF6B6B" />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Event Modal */}
      <Modal
        visible={showAddEventModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddEventModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Event</Text>
                <Pressable
                  onPress={() => setShowAddEventModal(false)}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color="#999" />
                </Pressable>
              </View>

              <Text style={styles.modalDateText}>
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Event Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter event title"
                  value={newEvent.title}
                  onChangeText={(text) =>
                    setNewEvent({ ...newEvent, title: text })
                  }
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Time (Optional)</Text>
                <Pressable
                  style={styles.timePickerButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Clock size={18} color={COLORS.PRIMARY} />
                  <Text style={styles.timePickerButtonText}>
                    {newEvent.timeString
                      ? formatDisplayTime(newEvent.time)
                      : "Select time"}
                  </Text>
                </Pressable>
              </View>

              {/* Time Picker Modal for iOS/Android */}
              {showTimePicker && (
                <View style={styles.timePickerContainer}>
                  <DateTimePicker
                    value={newEvent.time}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleTimePickerChange}
                  />
                  {Platform.OS === "ios" && (
                    <Pressable
                      style={styles.timePickerDone}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.timePickerDoneText}>Done</Text>
                    </Pressable>
                  )}
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.typeButtons}>
                  {(
                    [
                      "appointment",
                      "milestone",
                      "reminder",
                      "personal",
                    ] as const
                  ).map((type) => (
                    <Pressable
                      key={type}
                      style={[
                        styles.typeButton,
                        newEvent.type === type && styles.typeButtonActive,
                        { borderColor: getEventColor(type) },
                        newEvent.type === type && {
                          backgroundColor: getEventColor(type) + "20",
                        },
                      ]}
                      onPress={() => setNewEvent({ ...newEvent, type })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          newEvent.type === type && styles.typeButtonTextActive,
                          newEvent.type === type && {
                            color: getEventColor(type),
                          },
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.saveButtonPressed,
                  (!newEvent.title.trim() || createEventMutation.isPending) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleAddEvent}
                disabled={
                  !newEvent.title.trim() || createEventMutation.isPending
                }
              >
                {createEventMutation.isPending ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={[styles.saveButtonText, { marginLeft: 8 }]}>
                      Adding...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>Add Event</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFBFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PINK,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  calendarCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  monthButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  dayNamesRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  dayNameCell: {
    flex: 1,
    alignItems: "center",
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 8,
  },
  emptyDayCell: {
    backgroundColor: "transparent",
  },
  todayCell: {
    backgroundColor: COLORS.PINK,
  },
  selectedDayCell: {
    backgroundColor: COLORS.PRIMARY,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  todayText: {
    color: COLORS.PRIMARY,
  },
  selectedDayText: {
    color: "#FFF",
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.PRIMARY,
    marginTop: 2,
  },
  eventsSection: {
    marginBottom: 24,
  },
  eventsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  eventsSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  noEventsCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  noEventsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: "#999",
  },
  loadingText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
  },
  eventCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  eventTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  eventTime: {
    fontSize: 14,
    color: "#999",
  },
  eventTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eventTypeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    padding: 8,
  },
  milestonesSection: {
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
  milestoneCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  milestoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.PINK,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  milestoneDate: {
    fontSize: 13,
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDateText: {
    fontSize: 14,
    color: "#999",
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: "#1A1A1A",
  },
  timePickerButton: {
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timePickerButtonText: {
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  timePickerContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 16,
  },
  timePickerDone: {
    padding: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  timePickerDoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.PRIMARY,
  },
  typeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  typeButtonTextActive: {
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
});
