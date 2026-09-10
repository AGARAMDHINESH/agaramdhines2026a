import { useState, useEffect, useRef } from 'react';
import { getChatMessages, getClasses } from '../lib/db';

export function useChatNotifications(currentUser: { id: string, name: string, role: string, grade?: string } | null, isChatOpen: boolean = false) {
  const [unreadCount, setUnreadCount] = useState(0);
  const lastNotifiedMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;

    // Request notification permission if not granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(console.error);
    }

    const checkMessages = async () => {
      try {
        if (isChatOpen) {
          // If chat is open, automatically mark as read and don't show notifications
          try {
            localStorage.setItem(`lastChatRead_${currentUser.id}`, new Date().toISOString());
          } catch (e) {
            console.warn("Failed to save lastChatRead to localStorage", e);
          }
          setUnreadCount(0);
          return;
        }

        const [messages, classes] = await Promise.all([
          getChatMessages(),
          getClasses()
        ]);
        
        let lastReadStr = localStorage.getItem(`lastChatRead_${currentUser.id}`);
        let lastReadTime = lastReadStr ? new Date(lastReadStr).getTime() : 0;
        
        // If no last read time exists, set it to now so old messages don't trigger notifications
        if (!lastReadStr) {
          lastReadTime = Date.now();
          try {
            localStorage.setItem(`lastChatRead_${currentUser.id}`, new Date(lastReadTime).toISOString());
          } catch (e) {
            console.warn("Failed to save initial lastChatRead", e);
          }
        }
        
        // Find student's class ID if they are a student
        let studentClassId = '';
        if (currentUser.role === 'Student' && currentUser.grade) {
          const studentClass = (classes || []).find((c: any) => c.name === currentUser.grade);
          if (studentClass) studentClassId = `class_${studentClass.id}`;
        }

        // Filter messages relevant to the user
        const relevantMessages = (messages || []).filter((msg: any) => {
          // Message is to global or directly to the user
          let isRecipient = msg.recipientId === 'global' || !msg.recipientId || msg.recipientId === currentUser.id;
          
          if (currentUser.role === 'Student') {
            if (msg.recipientId === 'group_students') isRecipient = true;
            if (studentClassId && msg.recipientId === studentClassId) isRecipient = true;
          } else if (currentUser.role === 'Staff') {
            if (msg.recipientId === 'group_staff') isRecipient = true;
            if (msg.recipientId?.startsWith('class_')) isRecipient = true;
          } else if (currentUser.role === 'Admin') {
            if (msg.recipientId === 'group_students' || msg.recipientId === 'group_staff') isRecipient = true;
            if (msg.recipientId?.startsWith('class_')) isRecipient = true;
          }
          // Message is not from the user
          const isNotSender = msg.senderId !== currentUser.id;
          // Message is newer than last read
          const msgTime = new Date(msg.timestamp).getTime();
          const isNewer = msgTime > lastReadTime;
          
          return isRecipient && isNotSender && isNewer;
        });

        setUnreadCount(relevantMessages.length);

        if (relevantMessages.length > 0) {
          const latestMsg = relevantMessages[relevantMessages.length - 1];
          
          // Only notify if it's a new message we haven't notified about yet
          if (latestMsg.id !== lastNotifiedMessageIdRef.current) {
            lastNotifiedMessageIdRef.current = latestMsg.id;
            
            if ('Notification' in window && Notification.permission === 'granted') {
              const notificationText = latestMsg.text || (latestMsg.image ? 'Sent an image' : latestMsg.audio ? 'Sent an audio message' : 'Sent an attachment');
              new Notification('New Message in Live Chat', {
                body: `${latestMsg.senderName}: ${notificationText}`,
                icon: '/vite.svg'
              });
            }
          }
        }
      } catch (error) {
        console.error("Error checking chat messages for notifications:", error);
      }
    };

    checkMessages();
    const interval = setInterval(checkMessages, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [currentUser?.id, isChatOpen]);

  const markAsRead = () => {
    if (currentUser?.id) {
      try {
        localStorage.setItem(`lastChatRead_${currentUser.id}`, new Date().toISOString());
      } catch (e) {
        console.warn("Failed to save lastChatRead to localStorage", e);
      }
      setUnreadCount(0);
    }
  };

  return { unreadCount, markAsRead };
}
