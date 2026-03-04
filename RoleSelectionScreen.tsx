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
import Colors from '../constants/Colors';

export default function RoleSelectionScreen() {
  const router = useRouter();
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style = {styles.locationContainer}>
          <Icon name="location-on" size={24} color={Colors.primary} />
          <Text style={styles.locationText}>Geo Attendance</Text>
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
              <View style={[styles.iconContainer, styles.professorIcon]}>
                <Icon name="person-outline" size={32} color="#FFFFFF" />
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
              <View style={[styles.iconContainer, styles.studentIcon]}>
                <Icon name="school" size={32} color="#FFFFFF" />
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
        </View>

        <View style={styles.footer}>
          <Text style={styles.needHelp}>Need help? </Text>
          <TouchableOpacity onPress={() => console.log('Contact Support')}>
            <Text>
              <Text style={styles.contactSupport}>Contact Support</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  titleContainer: {
    marginTop: 40,
    marginBottom: 30,
  },
  greetingText: {
    fontSize: 36,
    color: Colors.text,
    fontWeight : '700',
    textAlign : 'center',
  },
  appTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
    textAlign : 'center',  
    marginTop: 4,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 18,
    color: Colors.textMuted,
    textAlign : 'center',
    marginTop: 8,
  },
  cardsContainer: {
    flex: 1,
    gap: 16, 
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardContent: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  professorIcon: {
    backgroundColor: Colors.primary,
  },
  studentIcon: {
    backgroundColor: Colors.primary,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  roleSubtitle: {
    fontSize: 18,
    color: Colors.primary,
    marginTop: 2,
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
    fontWeight: '400',
  },
  footer: {
    paddingVertical: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  needHelp: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  contactSupport: {
    fontSize: 15,
    color: Colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});