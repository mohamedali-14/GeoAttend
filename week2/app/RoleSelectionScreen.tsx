import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { colors } from '@/const/colors';


export default function RoleSelectionScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Icon name="location-on" size={24} color={colors.primary} style={styles.logoIcon} />
            <Text style={styles.logoText}>Geo Attendance</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <Text style={styles.greetingText}>Welcome to</Text>
            <Text style={styles.appTitle}>Geo Attendance</Text>
            <Text style={styles.subtitleText}>Select your role to continue</Text>
          </View>

          <View style={styles.cardsContainer}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({
                pathname: '/LoginScreen',
                params: { role: 'professor' }
              })}
            >
              <View style={styles.cardContent}>
                <View style={[styles.iconContainer, styles.iconHighlighted]}>
                  <Icon name="person-outline" size={32} color={colors.primary} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.roleTitle}>Professor</Text>
                  <Text style={styles.roleSubtitle}>استاذ</Text>
                  <Text style={styles.roleDescription}>
                    Manage classes, create sessions, and track attendance.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({
                pathname: '/LoginScreen',
                params: { role: 'student' }
              })}
            >
              <View style={styles.cardContent}>
                <View style={[styles.iconContainer, styles.iconHighlighted]}>
                  <Icon name="school" size={32} color={colors.primary} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.roleTitle}>Student</Text>
                  <Text style={styles.roleSubtitle}>طالب</Text>
                  <Text style={styles.roleDescription}>
                    Check in to classes, view history, and stats.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({
                pathname: '/LoginScreen',
                params: { role: 'Admin' }
              })}
            >
              <View style={styles.cardContent}>
                <View style={[styles.iconContainer, styles.iconHighlighted]}>
                  <Icon name="admin-panel-settings" size={32} color={colors.primary} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.roleTitle}>Admin</Text>
                  <Text style={styles.roleSubtitle}>مدير</Text>
                  <Text style={styles.roleDescription}>
                    Manage all system users and settings.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

          </View>

          <View style={styles.footer}>
            <Text>
              <Text style={styles.needHelp}>Need help? </Text>
              <TouchableOpacity onPress={() => console.log('Contact Support')}>
                <Text>
                  <Text style={styles.contactSupport}>Contact Support</Text>
                </Text>
              </TouchableOpacity>
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingTop: 20,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'flex-start',
    marginTop: 20,
    marginLeft : 15
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  logoIcon: {
    marginRight: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  greetingText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 16,
    color: colors.text.muted,
    textAlign: 'center',
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    marginVertical: 20,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.primary,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    borderColor: colors.primary,
    shadowOpacity: 0.3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  iconHighlighted: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: colors.primary,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  roleTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  roleSubtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.primary,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  needHelp: {
    fontSize: 14,
    color: colors.text.muted,
  },
  contactSupport: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20,
  },
});