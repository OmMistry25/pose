import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { colors, fonts } from '../../src/theme/tokens';
import { GridIcon, HomeIcon, ListIcon } from '../../src/ui/Icons';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={[styles.label, focused ? styles.labelActive : styles.labelIdle]}>{label}</Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.bar,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.warm,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: ({ focused }) => <TabLabel label="Home" focused={focused} />,
          tabBarIcon: ({ focused }) => <HomeIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="references"
        options={{
          title: 'References',
          tabBarLabel: ({ focused }) => <TabLabel label="References" focused={focused} />,
          tabBarIcon: ({ focused }) => <ListIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarLabel: ({ focused }) => <TabLabel label="Library" focused={focused} />,
          tabBarIcon: ({ focused }) => <GridIcon active={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 82,
    paddingTop: 8,
    paddingBottom: 18,
    backgroundColor: colors.bg,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 10,
    marginTop: 2,
  },
  labelActive: {
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  labelIdle: {
    color: colors.warm,
  },
});
