import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'quiz_completed' | 'streak_milestone' | 'achievement' | 'study_tip' | 'system';
  read: boolean;
  createdAt: number;
  actionScreen?: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isDropdownOpen: boolean;
  openDropdown: () => void;
  closeDropdown: () => void;
  toggleDropdown: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  sendNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const LOCAL_NOTIFS_STORAGE_KEY = '@smarty_ai_local_notifications_';

const DEFAULT_WELCOME_NOTIFICATIONS: Omit<AppNotification, 'id'>[] = [
  {
    title: 'Welcome to Smarty AI! 🎓',
    message: 'Upload documents or lecture notes to synthesize AI quizzes in seconds.',
    type: 'system',
    read: false,
    createdAt: Date.now() - 1000 * 60 * 5, // 5 mins ago
    actionScreen: 'UploadQuiz',
  },
  {
    title: 'Daily Study Streak Active 🔥',
    message: 'Take a quick 5-question drill today to keep your streak burning!',
    type: 'streak_milestone',
    read: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    actionScreen: 'Dashboard',
  },
  {
    title: 'Achievements Unlocked 🏆',
    message: 'Explore badges, medals, and mastery ribbons in the Awards tab.',
    type: 'achievement',
    read: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    actionScreen: 'Achievements',
  },
];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const userId = user?.uid;

  // Realtime Firestore Listener & Local fallback
  useEffect(() => {
    if (!userId) {
      // If not logged in, clear or show offline defaults
      setNotifications([]);
      return;
    }

    let unsubscribe = () => {};

    if (db) {
      try {
        const notifsRef = collection(db, 'users', userId, 'notifications');
        const q = query(notifsRef, orderBy('createdAt', 'desc'));

        unsubscribe = onSnapshot(
          q,
          async (snapshot) => {
            if (snapshot.empty) {
              const seededKey = '@smarty_ai_notifs_seeded_' + userId;
              const hasSeeded = await AsyncStorage.getItem(seededKey);
              if (!hasSeeded) {
                await AsyncStorage.setItem(seededKey, 'true');
                await seedInitialNotifications(userId);
              } else {
                setNotifications([]);
              }
            } else {
              const loaded: AppNotification[] = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...(docSnap.data() as Omit<AppNotification, 'id'>),
              }));
              setNotifications(loaded);
              // Save to offline storage
              AsyncStorage.setItem(LOCAL_NOTIFS_STORAGE_KEY + userId, JSON.stringify(loaded)).catch(() => {});
            }
          },
          async (error) => {
            console.warn('Realtime notifications listener notice:', error);
            // Load from local storage fallback
            loadFromLocalStorage(userId);
          }
        );
      } catch (err) {
        console.warn('Firestore notifications init error:', err);
        loadFromLocalStorage(userId);
      }
    } else {
      loadFromLocalStorage(userId);
    }

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const loadFromLocalStorage = async (uid: string) => {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_NOTIFS_STORAGE_KEY + uid);
      if (stored !== null) {
        setNotifications(JSON.parse(stored));
      } else {
        const seededKey = '@smarty_ai_notifs_seeded_' + uid;
        const hasSeeded = await AsyncStorage.getItem(seededKey);
        if (!hasSeeded) {
          await AsyncStorage.setItem(seededKey, 'true');
          const initial = DEFAULT_WELCOME_NOTIFICATIONS.map((n, i) => ({
            ...n,
            id: `local_${Date.now()}_${i}`,
          }));
          setNotifications(initial);
          await AsyncStorage.setItem(LOCAL_NOTIFS_STORAGE_KEY + uid, JSON.stringify(initial));
        } else {
          setNotifications([]);
        }
      }
    } catch (e) {
      console.warn('Failed to load local notifications:', e);
    }
  };

  const seedInitialNotifications = async (uid: string) => {
    if (!db) return;
    try {
      const notifsRef = collection(db, 'users', uid, 'notifications');
      for (const item of DEFAULT_WELCOME_NOTIFICATIONS) {
        await addDoc(notifsRef, item);
      }
    } catch (e) {
      console.warn('Could not seed initial notifications:', e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const openDropdown = () => setIsDropdownOpen(true);
  const closeDropdown = () => setIsDropdownOpen(false);
  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    if (db && userId && !id.startsWith('local_')) {
      try {
        const notifDocRef = doc(db, 'users', userId, 'notifications', id);
        await updateDoc(notifDocRef, { read: true });
      } catch (e) {
        console.warn('Error marking notification read in Firestore:', e);
      }
    }
  };

  const markAllAsRead = async () => {
    // Clear notifications list so the user sees the empty "All Caught Up" state
    setNotifications([]);

    if (userId) {
      await AsyncStorage.setItem('@smarty_ai_notifs_seeded_' + userId, 'true');
      await AsyncStorage.setItem(LOCAL_NOTIFS_STORAGE_KEY + userId, JSON.stringify([]));
    }

    if (db && userId) {
      try {
        const notifsRef = collection(db, 'users', userId, 'notifications');
        const snapshot = await getDocs(notifsRef);
        const batch = writeBatch(db);
        snapshot.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      } catch (e) {
        console.warn('Error clearing notifications on markAllAsRead:', e);
      }
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    if (db && userId && !id.startsWith('local_')) {
      try {
        const notifDocRef = doc(db, 'users', userId, 'notifications', id);
        await deleteDoc(notifDocRef);
      } catch (e) {
        console.warn('Error deleting notification from Firestore:', e);
      }
    }
  };

  const sendNotification = async (
    notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ) => {
    const newNotif: Omit<AppNotification, 'id'> = {
      ...notification,
      read: false,
      createdAt: Date.now(),
    };

    // Sanitize payload to strip undefined fields (prevents Firestore rejection)
    const sanitizedNotif: Record<string, any> = {};
    Object.entries(newNotif).forEach(([k, v]) => {
      if (v !== undefined) {
        sanitizedNotif[k] = v;
      }
    });

    if (db && userId) {
      try {
        const notifsRef = collection(db, 'users', userId, 'notifications');
        const docRef = await addDoc(notifsRef, sanitizedNotif);
        const created: AppNotification = {
          ...(sanitizedNotif as Omit<AppNotification, 'id'>),
          id: docRef.id,
        };
        setNotifications((prev) => [created, ...prev.filter((n) => n.id !== docRef.id)]);
      } catch (e) {
        console.warn('Error sending notification to Firestore, saving locally:', e);
        const localNotif: AppNotification = {
          ...(sanitizedNotif as Omit<AppNotification, 'id'>),
          id: `local_${Date.now()}`,
        };
        setNotifications((prev) => [localNotif, ...prev]);
      }
    } else {
      const localNotif: AppNotification = {
        ...(sanitizedNotif as Omit<AppNotification, 'id'>),
        id: `local_${Date.now()}`,
      };
      setNotifications((prev) => [localNotif, ...prev]);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isDropdownOpen,
        openDropdown,
        closeDropdown,
        toggleDropdown,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        sendNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
