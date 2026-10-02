import React from 'react';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface VideoBackgroundProps {
  videoUrl?: string;
  overlayOpacity?: number;
  children?: React.ReactNode;
}

export const VideoBackground: React.FC<VideoBackgroundProps> = ({
  videoUrl,
  overlayOpacity = 0.4,
  children,
}) => {
  // Resolve local assets/video/video.mp4 asset or fallback to videoUrl prop
  const localVideo = require('../../../assets/video/video.mp4');
  const resolvedSource = videoUrl || (typeof localVideo === 'string' ? localVideo : localVideo?.default || localVideo);

  return (
    <View style={styles.container}>
      {/* ─── Web HTML5 Video Layer ─────────────────────────────────────────── */}
      {Platform.OS === 'web' ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            zIndex: 0,
          }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.85) contrast(1.05)',
            }}
          >
            <source src={resolvedSource} type="video/mp4" />
          </video>
        </div>
      ) : (
        /* Fallback high-def 3D companion backdrop on native */
        <Image
          source={require('../../../assets/illustrations/smarty_companion_mascot.png')}
          style={styles.nativeFallbackImage}
          resizeMode="cover"
        />
      )}

      {/* ─── Cinematic Dark Gradient Overlay Shield ────────────────────────── */}
      <LinearGradient
        colors={[
          'rgba(10, 8, 24, 0.25)',
          `rgba(10, 8, 24, ${overlayOpacity})`,
          'rgba(10, 8, 24, 0.88)',
        ]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0A0818',
  },
  nativeFallbackImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
});

export default VideoBackground;
