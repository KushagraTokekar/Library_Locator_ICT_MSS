import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";

import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  DrawerContentScrollView,
  DrawerItemList
} from "@react-navigation/drawer";

import { useThemeContext } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Colors } from "../../constants/theme";

import { useEffect } from "react";


type IoniconsName =
  React.ComponentProps<typeof Ionicons>["name"];


/*
Drawer icon helper
*/

function DrawerIcon(
  name: IoniconsName,
  focused: boolean,
  color: string
) {
  return (
    <Ionicons
      name={
        focused
          ? name
          : (`${name}-outline` as IoniconsName)
      }
      size={22}
      color={color}
    />
  );
}


/*
Custom drawer layout
*/

function CustomDrawerContent(
  props: any
) {

  const { mode } =
    useThemeContext();

  const theme =
    Colors[mode];

  const { logout } =
    useAuth();

  const router =
    useRouter();


  const handleLogout =
    async () => {

      await logout();

      router.replace("/login");

    };


  return (

    <View
      style={{
        flex: 1,
        backgroundColor:
          theme.background
      }}
    >

      {/* Drawer Header */}

      <View
        style={[
          styles.drawerHeader,
          {
            borderBottomColor:
              theme.border
          }
        ]}
      >

        <View
          style={[
            styles.drawerLogo,
            {
              backgroundColor:
                theme.tint
            }
          ]}
        >

          <Ionicons
            name="library"
            size={24}
            color="white"
          />

        </View>

        <View
          style={{ marginLeft: 12 }}
        >

          <Text
            style={[
              styles.drawerAppName,
              { color: theme.text }
            ]}
          >
            Library Locator
          </Text>

          <Text
            style={[
              styles.drawerSubName,
              { color: theme.icon }
            ]}
          >
            Sahitya Sabha
          </Text>

        </View>

      </View>


      {/* Drawer Items */}

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{
          paddingTop: 8
        }}
      >

        <DrawerItemList {...props} />

      </DrawerContentScrollView>


      {/* Drawer Footer */}

      <View
        style={[
          styles.drawerFooter,
          {
            borderTopColor:
              theme.border
          }
        ]}
      >

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >

          <View
            style={styles.logoutIcon}
          >

            <Ionicons
              name="log-out-outline"
              size={20}
              color="#e53935"
            />

          </View>

          <Text
            style={styles.logoutText}
          >
            Logout
          </Text>

        </TouchableOpacity>

      </View>

    </View>

  );

}


/*
Main drawer layout
*/

export default function TabsLayout() {

  const { mode } =
    useThemeContext();

  const theme =
    Colors[mode];

  const {
    token,
    isLoading,
    isSuperAdmin
  } = useAuth();

  const router =
    useRouter();


  /*
  Protect routes if session missing
  */

  useEffect(() => {

    if (
      !isLoading &&
      !token
    ) {

      router.replace("/login");

    }

  }, [
    token,
    isLoading,
    router
  ]);


  /*
  Prevent flicker while restoring session
  */

  if (
    isLoading ||
    !token
  ) {

    return (

      <View
        style={{
          flex: 1,
          justifyContent:
            "center",
          alignItems:
            "center",
          backgroundColor:
            theme.background
        }}
      >

        <ActivityIndicator
          size="large"
          color={theme.tint}
        />

      </View>

    );

  }


  /*
  Drawer navigation layout
  */

  return (

    <Drawer
      drawerContent={(props) => (

        <CustomDrawerContent
          {...props}
        />

      )}

      screenOptions={{

        headerShown: true,

        headerStyle: {
          backgroundColor:
            theme.background
        },

        headerTintColor:
          theme.text,

        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 17
        },

        headerShadowVisible:
          false,

        drawerStyle: {
          backgroundColor:
            theme.background
        },

        drawerActiveTintColor:
          theme.tint,

        drawerInactiveTintColor:
          theme.icon,

        drawerLabelStyle: {
          fontSize: 15,
          fontWeight: "500"
        },

        drawerActiveBackgroundColor:

          mode === "dark"

            ? "rgba(77,182,172,0.12)"

            : "rgba(0,121,107,0.10)"

      }}

    >

      <Drawer.Screen
        name="home"
        options={{
          drawerLabel:
            "Search Books",
          drawerIcon:
            ({ focused, color }) =>
              DrawerIcon(
                "book",
                focused,
                color
              )
        }}
      />

      <Drawer.Screen
        name="profile"
        options={{
          drawerLabel:
            "Profile",
          drawerIcon:
            ({ focused, color }) =>
              DrawerIcon(
                "person",
                focused,
                color
              )
        }}
      />

      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel:
            "Settings",
          drawerIcon:
            ({ focused, color }) =>
              DrawerIcon(
                "settings",
                focused,
                color
              )
        }}
      />

      <Drawer.Screen
        name="explore"
        options={{
          drawerLabel:
            "About & Tips",
          drawerIcon:
            ({ focused, color }) =>
              DrawerIcon(
                "information-circle",
                focused,
                color
              )
        }}
      />

      {/* SUPER ADMIN ONLY SCREEN */}

      <Drawer.Screen
  name="admin"
  options={{
    drawerLabel: "Admin Panel",
    drawerItemStyle: {
      display: isSuperAdmin ? "flex" : "none"
    },
    drawerIcon: ({ focused, color }) =>
      DrawerIcon("shield", focused, color)
  }}
/>

    </Drawer>

  );

}


/*
Styles
*/

const styles = StyleSheet.create({

  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1
  },

  drawerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },

  drawerAppName: {
    fontSize: 16,
    fontWeight: "700"
  },

  drawerSubName: {
    fontSize: 12,
    marginTop: 2
  },

  drawerFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 28
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor:
      "rgba(229,57,53,0.08)"
  },

  logoutIcon: {
    marginRight: 14
  },

  logoutText: {
    color: "#e53935",
    fontSize: 15,
    fontWeight: "600"
  }

});