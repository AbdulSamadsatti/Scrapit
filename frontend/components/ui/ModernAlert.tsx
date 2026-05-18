import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export interface ModernAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: "success" | "danger" | "info";
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

const ModernAlert: React.FC<ModernAlertProps> = ({
  visible,
  title,
  message,
  type = "info",
  onConfirm,
  onCancel,
  confirmText = "OK",
  cancelText = "Cancel",
  showCancel = false,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons
              name={
                type === "success"
                  ? "checkmark-circle-outline"
                  : type === "danger"
                  ? "alert-circle-outline"
                  : "information-circle-outline"
              }
              size={48}
              color="white"
            />
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalMessage}>{message}</Text>
            <View style={styles.modalActions}>
              {showCancel && (
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={onCancel}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>{cancelText}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={onConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmBtnText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: Math.min(width - 40, 400),
    backgroundColor: "white",
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: "0px 10px 30px rgba(0,0,0,0.2)",
      },
    }),
  },
  modalHeader: {
    backgroundColor: "#EF4444", // Always Red Theme as requested
    padding: 30,
    alignItems: "center",
  },
  modalBody: {
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  modalConfirmBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  modalCancelBtnText: {
    color: "#4B5563",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default ModernAlert;
