import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    ScrollView, ActivityIndicator, Animated, Dimensions, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/const/colors';
import { useAuth } from '../../context/AuthContext';
import ButtonNav from '@/components/ButtonNav';

import { Course, LectureSession } from './types';
import { getCurrentLocation } from './geoService';

import ProfessorCoursesScreen    from './ProfessorCoursesScreen';
import ProfessorSessionsScreen   from './ProfessorSessionsScreen';
import ProfessorAttendanceScreen from './ProfessorAttendanceScreen';
import ProfessorMaterialsScreen from './ProfessorMaterialsScreen';
import ProfessorScheduleScreen   from './ProfessorScheduleScreen';
import { createSession, endSession, fetchActiveSessions, fetchDashboardStats, fetchProfessorCourses } from './professorService';

const { width } = Dimensions.get('window');

const StatCard: React.FC<{ icon:string; value:string|number; label:string; color:string; delay?:number }> =
({ icon, value, label, color, delay=0 }) => {
    const fade  = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(20)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade,  { toValue:1, duration:500, delay, useNativeDriver:true }),
            Animated.timing(slide, { toValue:0, duration:500, delay, useNativeDriver:true }),
        ]).start();
    }, []);
    return (
        <Animated.View style={[styles.statCard, { opacity:fade, transform:[{translateY:slide}] }]}>
            <View style={[styles.statIconWrap, { backgroundColor:color+'22' }]}>
                <Icon name={icon} size={22} color={color} />
            </View>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </Animated.View>
    );
};

const SectionHeader: React.FC<{ title:string; actionLabel?:string; onAction?:()=>void }> =
({ title, actionLabel, onAction }) => (
    <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {actionLabel && <TouchableOpacity onPress={onAction}><Text style={styles.sectionAction}>{actionLabel}</Text></TouchableOpacity>}
    </View>
);

export default function ProfessorDashboard() {
    const { userData, user } = useAuth();

    const [activeTab, setActiveTab] = useState<'home'|'courses'|'attendance'|'schedule'>('home');
    const [courses, setCourses]               = useState<Course[]>([]);
    const [activeSessions, setActiveSessions] = useState<LectureSession[]>([]);
    const [loading, setLoading]               = useState(true);
    const [stats, setStats]                   = useState({ totalStudents:0, totalCourses:0, avgAttendance:0 });

    const [showNewSession, setShowNewSession]     = useState(false);
    const [selectedCourse, setSelectedCourse]     = useState<Course|null>(null);
    const [sessionStartTime, setSessionStartTime] = useState('');
    const [sessionEndTime, setSessionEndTime]     = useState('');
    const [sessionRoom, setSessionRoom]           = useState('');
    const [creatingSession, setCreatingSession]   = useState(false);

    const [geoEnabled, setGeoEnabled]         = useState(false);
    const [radiusMeters, setRadiusMeters]     = useState('50');
    const [fetchingLocation, setFetchingLocation] = useState(false);

    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [selectedSession, setSelectedSession]         = useState<LectureSession|null>(null);

    const [showMaterials, setShowMaterials]       = useState(false);
    const [materialsSession, setMaterialsSession] = useState<LectureSession|null>(null);

    const headerOpacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(headerOpacity, { toValue:1, duration:600, useNativeDriver:true }).start();
    }, []);

    useEffect(() => { if (user?.uid) fetchData(); }, [user]);

    const fetchData = async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            const fetchedCourses = await fetchProfessorCourses(user.uid);
            setCourses(fetchedCourses);

            const [sessions, dashStats] = await Promise.all([
                fetchActiveSessions(user.uid, fetchedCourses),
                fetchDashboardStats(user.uid, fetchedCourses),
            ]);

            setActiveSessions(sessions);
            setStats(dashStats);
        } catch (e) {
            console.error('fetchData error:', e);
            Alert.alert('Error', 'Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async () => {
        if (!selectedCourse) { Alert.alert('Error', 'Please select a course'); return; }
        if (!sessionStartTime || !sessionEndTime) { Alert.alert('Error', 'Please enter times'); return; }

        let centerLat: number | undefined;
        let centerLng: number | undefined;

        if (geoEnabled) {
            setFetchingLocation(true);
            const loc = await getCurrentLocation();
            setFetchingLocation(false);
            if (!loc) {
                Alert.alert('خطأ', 'تعذّر الحصول على موقعك. تحقق من إذن الموقع وأعد المحاولة.');
                return;
            }
            centerLat = loc.latitude;
            centerLng = loc.longitude;
        }

        try {
            setCreatingSession(true);
            await createSession({
                professorId: user!.uid,
                professorName: userData?.fullName || '',
                course: selectedCourse,
                startTime: sessionStartTime,
                endTime: sessionEndTime,
                room: sessionRoom,
                geoEnabled,
                centerLat,
                centerLng,
                radiusMeters: parseInt(radiusMeters) || 50,
            });
            Alert.alert('✅ Success', `Session for ${selectedCourse.name} started!`);
            setShowNewSession(false);
            setSelectedCourse(null);
            setSessionStartTime('');
            setSessionEndTime('');
            setSessionRoom('');
            setGeoEnabled(false);
            setRadiusMeters('50');
            fetchData();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setCreatingSession(false);
        }
    };

    const handleEndSession = (id: string) => {
        Alert.alert('End Session', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'End', style: 'destructive', onPress: async () => {
                try {
                    await endSession(id);
                    fetchData();
                } catch (e: any) {
                    Alert.alert('Error', e.message);
                }
            }},
        ]);
    };

    const getGreeting = () => {
        const h = new Date().getHours();
        return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    };

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
    );

    const renderHome = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.heroCard, { opacity: headerOpacity }]}>
                <View style={styles.heroLeft}>
                    <Text style={styles.heroGreeting}>{getGreeting()},</Text>
                    <Text style={styles.heroName}>Dr. {userData?.fullName?.split(' ')[0] || 'Professor'}</Text>
                    <Text style={styles.heroSub}>
                        {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
                    </Text>
                </View>
                <View style={styles.heroIcon}><Icon name="school" size={44} color={colors.primary} /></View>
            </Animated.View>

            <View style={styles.statsRow}>
                <StatCard icon="menu-book"      value={stats.totalCourses}        label="Courses"     color="#10B981" delay={100} />
                <StatCard icon="people"          value={stats.totalStudents}       label="Students"    color="#3B82F6" delay={200} />
                <StatCard icon="bar-chart"       value={`${stats.avgAttendance}%`} label="Avg Attend." color="#F59E0B" delay={300} />
            </View>

            {activeSessions.length > 0 && (
                <>
                    <SectionHeader title="🔴 Live Sessions" />
                    {activeSessions.map(s => (
                        <View key={s.id} style={styles.liveCard}>
                            <View style={styles.liveBadge}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                            <Text style={styles.liveCourseName}>{s.courseName}</Text>
                            <View style={styles.liveStats}>
                                <View style={styles.liveStatItem}>
                                    <Icon name="people" size={16} color={colors.text.muted} />
                                    <Text style={styles.liveStatText}>{s.attendeeCount}/{s.totalStudents} present</Text>
                                </View>
                                <View style={styles.liveStatItem}>
                                    <Icon name="room" size={16} color={colors.text.muted} />
                                    <Text style={styles.liveStatText}>{s.room}</Text>
                                </View>
                                <View style={styles.liveStatItem}>
                                    <Icon name="access-time" size={16} color={colors.text.muted} />
                                    <Text style={styles.liveStatText}>
                                        {s.startTime.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.liveActions}>
                                <TouchableOpacity style={styles.liveViewBtn}
                                    onPress={() => { setSelectedSession(s); setShowAttendanceModal(true); }}>
                                    <Icon name="visibility" size={16} color={colors.primary} />
                                    <Text style={styles.liveViewText}>Attendance</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.liveViewBtn, { borderColor: '#8B5CF6' }]}
                                    onPress={() => {
                                        setMaterialsSession(s);
                                        setShowMaterials(true);
                                    }}>
                                    <Icon name="auto-awesome" size={16} color="#8B5CF6" />
                                    <Text style={[styles.liveViewText, { color: '#8B5CF6' }]}>PDF · QR · Quiz</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.liveEndBtn} onPress={() => handleEndSession(s.id)}>
                                    <Icon name="stop" size={16} color="#EF4444" />
                                    <Text style={styles.liveEndText}>End</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </>
            )}

            <SectionHeader title="Quick Actions" />
            <View style={styles.quickGrid}>
                {[
                    { icon:'add-circle',     label:'New Session',  color:'#10B981', onPress:()=>setShowNewSession(true) },
                    { icon:'bar-chart',      label:'Attendance',   color:'#3B82F6', onPress:()=>setActiveTab('attendance') },
                    { icon:'calendar-today', label:'My Schedule',  color:'#F59E0B', onPress:()=>setActiveTab('schedule') },
                    { icon:'menu-book',      label:'Courses',      color:'#8B5CF6', onPress:()=>setActiveTab('courses') },
                ].map((a, i) => (
                    <TouchableOpacity key={i} style={styles.quickCard} onPress={a.onPress}>
                        <View style={[styles.quickIconBg, { backgroundColor: a.color+'22' }]}>
                            <Icon name={a.icon} size={26} color={a.color} />
                        </View>
                        <Text style={styles.quickLabel}>{a.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <SectionHeader title="My Courses" actionLabel="View All" onAction={() => setActiveTab('courses')} />
            {courses.slice(0, 3).map(c => (
                <View key={c.id} style={styles.todayCard}>
                    <View style={[styles.todayAccent, { backgroundColor: c.color }]} />
                    <View style={styles.todayInfo}>
                        <Text style={styles.todayName}>{c.name}</Text>
                        <Text style={styles.todayMeta}>{c.code} • {c.studentCount} students</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.startBtn, { backgroundColor: c.color+'22', borderColor: c.color }]}
                        onPress={() => { setSelectedCourse(c); setShowNewSession(true); }}>
                        <Text style={[styles.startBtnText, { color: c.color }]}>Start</Text>
                    </TouchableOpacity>
                </View>
            ))}
            <View style={{ height: 100 }} />
        </ScrollView>
    );

    return (
        <View style={styles.root}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.topBar}>
                    <View>
                        <Text style={styles.topBarTitle}>Professor Portal</Text>
                        <Text style={styles.topBarSub}>{userData?.department || 'Faculty'}</Text>
                    </View>
                    <TouchableOpacity onPress={fetchData} style={{ padding: 8 }}>
                        <Icon name="refresh" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.tabBar}>
                    {([
                        { key:'home',       icon:'home',           label:'Home' },
                        { key:'courses',    icon:'menu-book',      label:'Courses' },
                        { key:'attendance', icon:'bar-chart',      label:'Attendance' },
                        { key:'schedule',   icon:'calendar-today', label:'Schedule' },
                    ] as const).map(t => (
                        <TouchableOpacity key={t.key}
                            style={[styles.tabItem, activeTab===t.key && styles.tabItemActive]}
                            onPress={() => setActiveTab(t.key)}>
                            <Icon name={t.icon} size={20} color={activeTab===t.key ? colors.primary : colors.text.muted} />
                            <Text style={[styles.tabLabel, activeTab===t.key && styles.tabLabelActive]}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {activeTab === 'home'       && renderHome()}
                {activeTab === 'courses'    && (
                    <ProfessorCoursesScreen
                    />
                )}
                {activeTab === 'attendance' && (
                    <ProfessorAttendanceScreen
                    />
                )}
                {activeTab === 'schedule' && (
                    <ProfessorScheduleScreen
                    />
                )}
            </SafeAreaView>

            <ProfessorSessionsScreen
                visible={showNewSession}
                onClose={() => setShowNewSession(false)}
                courses={courses}
                selectedCourse={selectedCourse}
                onSelectCourse={setSelectedCourse}
                sessionStartTime={sessionStartTime}
                onChangeStartTime={setSessionStartTime}
                sessionEndTime={sessionEndTime}
                onChangeEndTime={setSessionEndTime}
                sessionRoom={sessionRoom}
                onChangeRoom={setSessionRoom}
                creatingSession={creatingSession || fetchingLocation}
                onCreateSession={handleCreateSession}
                geoEnabled={geoEnabled}
                onToggleGeo={setGeoEnabled}
                radiusMeters={radiusMeters}
                onChangeRadius={setRadiusMeters}
                fetchingLocation={fetchingLocation}
            />

            {(materialsSession || activeSessions.length > 0) && (
                <ProfessorMaterialsScreen
                    visible={showMaterials}
                    onClose={() => setShowMaterials(false)}
                    session={(materialsSession ?? activeSessions[0])!}
                    professorName={userData?.fullName || ''}
                    onSessionUpdated={fetchData}
                />
            )}

            <ButtonNav role="professor" />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex:1, backgroundColor:colors.background.primary, paddingTop:25 },
    safeArea: { flex:1 },
    loadingContainer: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:colors.background.primary },
    loadingText: { marginTop:12, fontSize:14, color:colors.text.muted },
    topBar: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingTop:12, paddingBottom:8 },
    topBarTitle: { fontSize:20, fontWeight:'700', color:colors.text.primary },
    topBarSub: { fontSize:12, color:colors.text.muted, marginTop:2 },
    tabBar: { flexDirection:'row', backgroundColor:colors.background.secondary, marginHorizontal:16, borderRadius:14, padding:4, marginBottom:12, borderWidth:1, borderColor:colors.border.primary },
    tabItem: { flex:1, alignItems:'center', paddingVertical:8, borderRadius:10, gap:2 },
    tabItemActive: { backgroundColor:colors.background.primary, shadowColor:'#000', shadowOpacity:0.1, shadowRadius:4, elevation:2 },
    tabLabel: { fontSize:10, color:colors.text.muted },
    tabLabelActive: { color:colors.primary, fontWeight:'600' },
    tabContent: { flex:1, paddingHorizontal:16 },
    heroCard: { backgroundColor:colors.background.card, borderRadius:20, padding:22, marginBottom:16, flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderWidth:1, borderColor:colors.border.primary, borderLeftWidth:4, borderLeftColor:colors.primary },
    heroLeft: { flex:1 },
    heroGreeting: { fontSize:14, color:colors.text.muted },
    heroName: { fontSize:24, fontWeight:'800', color:colors.text.primary, marginVertical:2 },
    heroSub: { fontSize:12, color:colors.text.muted },
    heroIcon: { width:64, height:64, borderRadius:32, backgroundColor:colors.primary+'1A', justifyContent:'center', alignItems:'center' },
    statsRow: { flexDirection:'row', gap:8, marginBottom:20 },
    statCard: { flex:1, backgroundColor:colors.background.card, borderRadius:14, padding:12, alignItems:'center', borderWidth:1, borderColor:colors.border.primary },
    statIconWrap: { width:36, height:36, borderRadius:18, justifyContent:'center', alignItems:'center', marginBottom:6 },
    statValue: { fontSize:16, fontWeight:'800' },
    statLabel: { fontSize:10, color:colors.text.muted, textAlign:'center', marginTop:2 },
    sectionHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12, marginTop:8 },
    sectionTitle: { fontSize:16, fontWeight:'700', color:colors.text.primary },
    sectionAction: { fontSize:13, color:colors.primary, fontWeight:'600' },
    liveCard: { backgroundColor:'#EF444408', borderRadius:16, padding:16, marginBottom:12, borderWidth:1, borderColor:'#EF444433' },
    liveBadge: { flexDirection:'row', alignItems:'center', gap:6, marginBottom:8 },
    liveDot: { width:8, height:8, borderRadius:4, backgroundColor:'#EF4444' },
    liveText: { fontSize:11, fontWeight:'700', color:'#EF4444', letterSpacing:1 },
    liveCourseName: { fontSize:17, fontWeight:'700', color:colors.text.primary, marginBottom:8 },
    liveStats: { flexDirection:'row', gap:16, marginBottom:12, flexWrap:'wrap' },
    liveStatItem: { flexDirection:'row', alignItems:'center', gap:4 },
    liveStatText: { fontSize:13, color:colors.text.muted },
    liveActions: { flexDirection:'row', gap:10 },
    liveViewBtn: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:10, borderRadius:10, borderWidth:1, borderColor:colors.primary },
    liveViewText: { fontSize:13, color:colors.primary, fontWeight:'600' },
    liveEndBtn: { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:16, paddingVertical:10, borderRadius:10, borderWidth:1, borderColor:'#EF4444' },
    liveEndText: { fontSize:13, color:'#EF4444', fontWeight:'600' },
    quickGrid: { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:20 },
    quickCard: { width:(width-52)/2, backgroundColor:colors.background.card, borderRadius:14, padding:16, alignItems:'center', gap:10, borderWidth:1, borderColor:colors.border.primary },
    quickIconBg: { width:48, height:48, borderRadius:24, justifyContent:'center', alignItems:'center' },
    quickLabel: { fontSize:13, fontWeight:'600', color:colors.text.primary, textAlign:'center' },
    todayCard: { backgroundColor:colors.background.card, borderRadius:14, padding:14, flexDirection:'row', alignItems:'center', marginBottom:10, borderWidth:1, borderColor:colors.border.primary },
    todayAccent: { width:4, borderRadius:2, marginRight:12, minHeight:50 },
    todayInfo: { flex:1 },
    todayName: { fontSize:14, fontWeight:'700', color:colors.text.primary },
    todayMeta: { fontSize:12, color:colors.text.muted, marginTop:2 },
    startBtn: { paddingHorizontal:14, paddingVertical:6, borderRadius:8, borderWidth:1 },
    startBtnText: { fontSize:12, fontWeight:'700' },
});