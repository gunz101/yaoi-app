import { useEffect, useState, useRef } from 'react';
import { View, Image, Dimensions, StyleSheet } from 'react-native';
import { getImageUri } from '@/utils/imageCache';

const SCREEN_WIDTH = Dimensions.get('window').width - 32;
const IMG_HEIGHT = 250;

interface Props {
  images: string[];
}

export function ExerciseImageSlideshow({ images }: Props) {
  const [uris, setUris] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let ok = true;
    (async () => {
      const r: string[] = [];
      for (const img of images) {
        const u = await getImageUri(img);
        if (u) r.push(u);
      }
      if (ok) setUris(r);
    })();
    return () => { ok = false; };
  }, [images]);

  useEffect(() => {
    if (uris.length < 2) return;
    timer.current = setInterval(() => setIdx(i => (i + 1) % uris.length), 1500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [uris.length]);

  if (uris.length === 0) return null;

  return (
    <View style={styles.box}>
      <Image
        source={{ uri: uris[idx] }}
        style={styles.img}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: SCREEN_WIDTH,
    height: IMG_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#e5e5e5',
  },
  img: {
    width: SCREEN_WIDTH,
    height: IMG_HEIGHT,
  },
});
