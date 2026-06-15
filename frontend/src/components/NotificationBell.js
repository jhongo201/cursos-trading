import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Notifications fetch error:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Unread count fetch error:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Mark read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Mark all read error:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.notification_id);
    
    // Navigate based on notification type
    if (notification.type === 'comment' && notification.related_id) {
      // related_id is lesson_id, we need to get the course
      // For now just close the popover
      setOpen(false);
    } else if (notification.type === 'live_session' && notification.related_id) {
      navigate(`/live-sessions/${notification.related_id}`);
      setOpen(false);
    } else if (notification.type === 'achievement') {
      navigate('/achievements');
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-zinc-400 hover:text-zinc-100"
          data-testid="notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-zinc-950 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-zinc-900 border-zinc-800 text-zinc-100" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notificaciones</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-amber-500 hover:text-amber-400"
              >
                Marcar todas como leídas
              </Button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-2">
            {notifications.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">
                No tienes notificaciones
              </p>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.notification_id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    notif.read
                      ? 'bg-zinc-800/30 text-zinc-400'
                      : 'bg-amber-500/10 text-zinc-100 border border-amber-500/20'
                  } hover:bg-zinc-800`}
                  data-testid={`notification-${notif.notification_id}`}
                >
                  <div className="flex items-start gap-2">
                    {!notif.read && (
                      <div className="h-2 w-2 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{notif.content}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {new Date(notif.created_at).toLocaleDateString('es-ES', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};