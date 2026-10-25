import { Children, Fragment, type PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { cardStyle } from "./Card";
import { colors } from "./theme";

// A Card with no padding. Its children (usually ListRow) are divided by
// borderSoft hairlines. Sections inside a panel never get their own card.
export function Panel({ children }: PropsWithChildren) {
  const items = Children.toArray(children);
  return (
    <View style={styles.panel}>
      {items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? <View style={styles.divider} /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { ...cardStyle, padding: 0, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSoft, marginLeft: 16 },
});
