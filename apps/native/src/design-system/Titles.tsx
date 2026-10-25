import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";

import { colors, fonts, type } from "./theme";

type TitleProps = { children: string; meta?: string; action?: ReactNode };

function Title({ children, meta, action, style, metaTop }: TitleProps & { style: StyleProp<TextStyle>; metaTop: number }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={[style, { color: colors.foreground }]}>
          {children}
        </Text>
        {meta ? <Text style={[styles.meta, { marginTop: metaTop }]}>{meta}</Text> : null}
      </View>
      {action}
    </View>
  );
}

/** Hub pages (Today, Guest home). */
export function LargeTitle(props: TitleProps) {
  return <Title {...props} style={[type.largeTitle, styles.largeTop]} metaTop={6} />;
}

/** Detail pages. */
export function PageTitle(props: TitleProps) {
  return <Title {...props} style={[type.pageTitle, styles.pageTop]} metaTop={4} />;
}

/** Sections on hub pages. */
export function SectionTitle(props: TitleProps) {
  return <Title {...props} style={type.sectionTitle} metaTop={4} />;
}

/** Text link used as a trailing action on a title. */
export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" hitSlop={8} onPress={onPress}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  copy: { flex: 1 },
  largeTop: { marginTop: 12 },
  pageTop: { marginTop: 8 },
  meta: { ...type.meta, color: colors.mutedForeground },
  link: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.foreground,
    textDecorationLine: "underline",
  },
});
