import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AppPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Engineer Dashboard</h1>
          <Button onClick={logout} variant="outline">
            Logout
          </Button>
        </div>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Welcome, {user?.full_name || user?.username}!</CardTitle>
              <CardDescription>
                You have engineer access to the attendance system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Email: {user?.email}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Role: Engineer
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
