import React, { createContext, useState, useContext, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification,
    User,
} from 'firebase/auth';
import { doc, setDoc, getDoc} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';


interface AuthContextType {
    user: User | null;
    userData: any | null;
    login: (email: string, password: string, expectedRole: string) => Promise<any>;
    register: (email: string, password: string, userData: any) => Promise<void>;
    logout: () => Promise<void>;
    loading: boolean;
    resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserData(userDoc.data());
                }
            } else {
                setUserData(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);
//
    const login = async (email: string, password: string, expectedRole: string) => {
        try {

            setLoading(true);

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (!user.emailVerified) {
                await signOut(auth);
                throw new Error("Please verify your email before login");
            }

            const userDoc = await getDoc(doc(db, 'users', user.uid));

            if (!userDoc.exists()) {
                await signOut(auth);
                throw new Error("User data not found");
            }

            const userData = userDoc.data();

            if (userData.role !== expectedRole) {
                await signOut(auth);
                throw new Error(
                    expectedRole === 'student'
                        ? "This email is registered as a Professor. Please select Professor role"
                        : "This email is registered as a Student. Please select Student role"
                );
            }

            setUserData(userData);
            setLoading(false);

            return userData;

        } catch (error) {
            setLoading(false);
            throw error;
        }
    };

    const register = async (email: string, password: string, userData: any) => {
        try {
            setLoading(true);
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await sendEmailVerification(user);

            await setDoc(doc(db, 'users', user.uid), {
                ...userData,
                email: user.email,
                emailVerified: false,
                createdAt: new Date().toISOString(),
            });
            setLoading(false);
        } catch (error) {
            setLoading(false);
            throw error;
        }
    };

    const logout = async () => {
        try {
            setLoading(true);
            await signOut(auth);
            setLoading(false);
        } catch (error) {
            setLoading(false);
            throw error;
        }
    };

    const resendVerificationEmail = async () => {
        try {
            if (auth.currentUser) {
                await sendEmailVerification(auth.currentUser);
            }
        } catch (error) {
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            userData,
            login,
            register,
            logout,
            loading,
            resendVerificationEmail,

        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};