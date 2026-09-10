import { useState, useEffect } from 'react';
import { getHomework } from '../lib/db';

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'homework' | 'general';
  isRead: boolean;
}

export function useHomeworkNotifications(userRole: 'student' | 'admin' | 'staff', userGrade?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const homework = await getHomework();
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];

      let relevantHomework = homework;
      if (userRole === 'student' && userGrade) {
        relevantHomework = homework.filter((hw: any) => hw.grade === userGrade);
      }

      const upcoming = relevantHomework.filter((hw: any) => {
        // Show notifications for homework due today or tomorrow
        return hw.dueDate === tomorrowStr || hw.dueDate === todayStr;
      });

      const newNotifications = upcoming.map((hw: any) => ({
        id: `hw-${hw.id}`,
        title: `Homework Due Soon: ${hw.title}`,
        message: `${hw.subject} homework for ${hw.grade} is due on ${hw.dueDate}.`,
        date: hw.dueDate,
        type: 'homework' as const,
        isRead: false
      }));

      setNotifications(newNotifications);
    };

    fetchNotifications();
    
    // Set up an interval to check periodically
    const interval = setInterval(fetchNotifications, 60 * 60 * 1000); // Check every hour
    return () => clearInterval(interval);
  }, [userRole, userGrade]);

  return { notifications };
}
