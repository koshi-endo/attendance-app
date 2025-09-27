import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AttendanceCalendar } from '@/components/AttendanceCalendar';

export function AppPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Engineer Dashboard</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Welcome, {user?.full_name || user?.username}!
            </p>
          </div>
          <Button onClick={logout} variant="outline">
            Logout
          </Button>
        </div>
        
        <AttendanceCalendar />
      </div>
    </div>
  );
}
