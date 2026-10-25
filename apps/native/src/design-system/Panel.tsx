import { Children, Fragment, type PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { cardStyle } from "./Card";
import { colors } from "./theme";

// A Card with no padding. Its children (usually ListRow) are divided by
// borderSoft hairlines. Sections inside a panel never get their own card.
// `flat` drops the card chrome for rows that already sit inside a sheet or
// card, so there is never a box in a box.
export function Panel({ children, flat = false }: PropsWithChildren<{ flat?: boolean }>) {
  const items = Children.toArray(children);
  return (
    <View style={flat ? styles.flat : styles.panel}>
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
  // Rows carry 16 of their own padding; pull them out to the sheet gutter (20).
  flat: { marginHorizontal: -16 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSoft, marginLeft: 16 },
});
