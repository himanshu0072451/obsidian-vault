// import React from "react";
// import { Modal, View, Image, Pressable, Text } from "react-native";

// interface ImageViewerProps {
//   visible: boolean;
//   imageUri: string | null;
//   onClose: () => void;
// }

// export default function ImageViewer({
//   visible,
//   imageUri,
//   onClose,
// }: ImageViewerProps) {
//   return (
//     <Modal visible={visible} animationType="fade" transparent={false}>
//       <View className="flex-1 bg-black">
//         {/* Header */}
//         <View className="absolute top-14 right-6 z-50">
//           <Pressable
//             onPress={onClose}
//             className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
//           >
//             <Text className="text-2xl text-white">✕</Text>
//           </Pressable>
//         </View>

//         {/* Image */}
//         {imageUri && (
//           <Image
//             source={{ uri: imageUri }}
//             style={{
//               width: "100%",
//               height: "100%",
//             }}
//             resizeMode="contain"
//           />
//         )}
//       </View>
//     </Modal>
//   );
// }

// --------------------------------------------------------------

import React from "react";
import { Modal, View, Image, Pressable, Text, StyleSheet } from "react-native";

interface ImageViewerProps {
  visible: boolean;
  imageUri: string | null;
  fileName?: string;
  onClose: () => void;
}

export default function ImageViewer({
  visible,
  imageUri,
  fileName,
  onClose,
}: ImageViewerProps) {
  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text numberOfLines={1} style={styles.fileName}>
            {fileName ?? "Protected Image"}
          </Text>

          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {/* Image */}
        {imageUri && (
          <View style={styles.imageContainer}>
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          </View>
        )}

        {/* Bottom Hint */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Pinch to zoom • Swipe to explore</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  header: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: 16,
    paddingVertical: 12,

    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  fileName: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  closeButton: {
    width: 44,
    height: 44,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.08)",

    marginLeft: 12,
  },

  closeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  imageWrapper: {
    width: "100%",
    height: "90%",

    borderRadius: 24,
    overflow: "hidden",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  hintContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,

    alignItems: "center",
  },

  hintText: {
    color: "#9ca3af",
    fontSize: 12,

    paddingHorizontal: 16,
    paddingVertical: 8,

    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});
