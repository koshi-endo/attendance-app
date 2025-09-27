import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Users, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { adminApi, User, AttendanceRecord, AttendanceWithUser } from '@/lib/api';

type ViewMode = 'daily' | 'monthly';

export function OwnerDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceWithUser[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (viewMode === 'daily') {
      loadDailyAttendance();
    } else if (viewMode === 'monthly' && selectedUserId) {
      loadMonthlyAttendance();
    }
  }, [viewMode, selectedDate, selectedMonth, selectedUserId]);

  const loadUsers = async () => {
    try {
      const usersData = await adminApi.getAllUsers();
      setUsers(usersData);
     } catch {
       toast({
         variant: "destructive",
         title: "Error loading users",
         description: "Failed to load user list",
       });
     }
  };

  const loadDailyAttendance = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getDailyAttendance(selectedDate);
      setDailyAttendance(data);
    } catch {
      toast({
        variant: "destructive",
        title: "Error loading attendance",
        description: "Failed to load daily attendance data",
      });
    }finally {
      setLoading(false);
    }
  };

  const loadMonthlyAttendance = async () => {
    if (!selectedUserId) return;
    
    setLoading(true);
    try {
      const data = await adminApi.getUserMonthlyAttendance(selectedUserId, selectedMonth);
      setMonthlyAttendance(data);
    } catch {
      toast({
        variant: "destructive",
        title: "Error loading attendance",
        description: "Failed to load monthly attendance data",
      });
    }finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (viewMode === 'daily') {
      exportDailyCSV();
    } else {
      exportMonthlyCSV();
    }
  };

  const exportDailyCSV = () => {
    const headers = ['Date', 'User', 'Email', 'Clock In', 'Clock Out', 'Break Minutes', 'Work Hours', 'Status', 'Note'];
    const rows = dailyAttendance.map(record => [
      selectedDate,
      record.user.full_name || record.user.username,
      record.user.email,
      record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : '',
      record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm') : '',
      record.break_minutes.toString(),
      record.work_hours?.toFixed(2) || '',
      record.status,
      record.note || ''
    ]);

    downloadCSV([headers, ...rows], `daily-attendance-${selectedDate}.csv`);
  };

  const exportMonthlyCSV = () => {
    const selectedUser = users.find(u => u.id === selectedUserId);
    const headers = ['Date', 'Clock In', 'Clock Out', 'Break Minutes', 'Work Hours', 'Status', 'Note'];
    const rows = monthlyAttendance.map(record => [
      record.date,
      record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : '',
      record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm') : '',
      record.break_minutes.toString(),
      record.work_hours?.toFixed(2) || '',
      record.status,
      record.note || ''
    ]);

    const filename = `monthly-attendance-${selectedUser?.username}-${selectedMonth}.csv`;
    downloadCSV([headers, ...rows], filename);
  };

  const downloadCSV = (data: string[][], filename: string) => {
    const csvContent = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export successful",
      description: `Downloaded ${filename}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'daily' ? 'default' : 'outline'}
          onClick={() => setViewMode('daily')}
          className="flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          Daily View
        </Button>
        <Button
          variant={viewMode === 'monthly' ? 'default' : 'outline'}
          onClick={() => setViewMode('monthly')}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Monthly View
        </Button>
      </div>

      {viewMode === 'daily' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Daily Attendance</CardTitle>
                <CardDescription>View all engineers' attendance for a specific date</CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Break (min)</TableHead>
                    <TableHead>Work Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                        No attendance records found for {selectedDate}
                      </TableCell>
                    </TableRow>
                  ) : (
                    dailyAttendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.user.full_name || record.user.username}</div>
                            <div className="text-sm text-zinc-500">{record.user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : '-'}
                        </TableCell>
                        <TableCell>
                          {record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm') : '-'}
                        </TableCell>
                        <TableCell>{record.break_minutes}</TableCell>
                        <TableCell>{record.work_hours?.toFixed(2) || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{record.note || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === 'monthly' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Monthly Attendance</CardTitle>
                <CardDescription>View a specific user's attendance for a month</CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <Select value={selectedUserId?.toString() || ''} onValueChange={(value) => setSelectedUserId(parseInt(value))}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.full_name || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-auto"
                />
                <Button onClick={exportToCSV} variant="outline" size="sm" disabled={!selectedUserId}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedUserId ? (
              <div className="text-center py-8 text-zinc-500">
                Please select a user to view their monthly attendance
              </div>
            ) : loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{monthlyAttendance.length}</div>
                    <div className="text-sm text-zinc-500">Working Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {monthlyAttendance.reduce((sum, record) => sum + (record.work_hours || 0), 0).toFixed(1)}
                    </div>
                    <div className="text-sm text-zinc-500">Total Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {monthlyAttendance.length > 0 
                        ? (monthlyAttendance.reduce((sum, record) => sum + (record.work_hours || 0), 0) / monthlyAttendance.length).toFixed(1)
                        : '0'
                      }
                    </div>
                    <div className="text-sm text-zinc-500">Avg Hours/Day</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {monthlyAttendance.filter(record => !record.check_out_time).length}
                    </div>
                    <div className="text-sm text-zinc-500">Incomplete</div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Break (min)</TableHead>
                      <TableHead>Work Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyAttendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                          No attendance records found for {selectedMonth}
                        </TableCell>
                      </TableRow>
                    ) : (
                      monthlyAttendance.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{format(new Date(record.date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            {record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : '-'}
                          </TableCell>
                          <TableCell>
                            {record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm') : '-'}
                          </TableCell>
                          <TableCell>{record.break_minutes}</TableCell>
                          <TableCell>{record.work_hours?.toFixed(2) || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{record.note || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
