import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Save, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { attendanceApi, AttendanceRecord, AttendanceUpsertRequest } from '@/lib/api';

const attendanceSchema = z.object({
  clock_in: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  clock_out: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional().or(z.literal('')),
  break_minutes: z.number().min(0, 'Break minutes must be 0 or greater'),
  note: z.string().max(1000, 'Note must be 1000 characters or less').optional(),
}).refine((data) => {
  if (data.clock_out && data.clock_out !== '') {
    const clockIn = data.clock_in.split(':').map(Number);
    const clockOut = data.clock_out.split(':').map(Number);
    const clockInMinutes = clockIn[0] * 60 + clockIn[1];
    const clockOutMinutes = clockOut[0] * 60 + clockOut[1];
    return clockOutMinutes >= clockInMinutes;
  }
  return true;
}, {
  message: 'Clock out time must be after clock in time',
  path: ['clock_out'],
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

export function AttendanceCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      clock_in: '',
      clock_out: '',
      break_minutes: 0,
      note: '',
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      const data = await attendanceApi.getRecords(startDate, endDate, 50);
      setRecords(data);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error loading attendance records',
        description: 'Failed to load attendance data. Please try again.',
      });
    }finally {
      setLoading(false);
    }
  };

  const loadTodayRecord = async () => {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const todayRecord = records.find(record => record.date === todayStr);
      
      if (todayRecord) {
        const clockIn = todayRecord.check_in_time ? format(new Date(todayRecord.check_in_time), 'HH:mm') : '';
        const clockOut = todayRecord.check_out_time ? format(new Date(todayRecord.check_out_time), 'HH:mm') : '';
        
        form.reset({
          clock_in: clockIn,
          clock_out: clockOut,
          break_minutes: todayRecord.break_minutes,
          note: todayRecord.note || '',
        });
      }
    } catch (error) {
      console.error('Error loading today record:', error);
    }
  };

  useEffect(() => {
    loadAttendanceRecords();
  }, [currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (records.length > 0) {
      loadTodayRecord();
    }
  }, [records]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const getRecordForDate = (date: Date): AttendanceRecord | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return records.find(record => record.date === dateStr);
  };

  const onSubmit = async (data: AttendanceFormData) => {
    try {
      setSaving(true);
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      const requestData: AttendanceUpsertRequest = {
        clock_in: data.clock_in,
        break_minutes: data.break_minutes,
      };
      
      if (data.clock_out && data.clock_out !== '') {
        requestData.clock_out = data.clock_out;
      }
      
      if (data.note && data.note !== '') {
        requestData.note = data.note;
      }

      await attendanceApi.upsertRecord(todayStr, requestData);
      
      toast({
        title: 'Attendance saved',
        description: 'Your attendance record has been updated successfully.',
      });
      
      await loadAttendanceRecords();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error saving attendance',
        description: (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to save attendance record. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (dateTimeStr: string | null): string => {
    if (!dateTimeStr) return '-';
    try {
      return format(new Date(dateTimeStr), 'HH:mm');
    } catch {
      return '-';
    }
  };

  const formatWorkHours = (hours: number | null): string => {
    if (hours === null || hours === undefined) return '-';
    return `${hours.toFixed(2)}h`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Attendance Calendar
              </CardTitle>
              <CardDescription>
                Track your daily attendance and work hours
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
                disabled={loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading attendance records...</span>
            </div>
          ) : (
            <div className="space-y-4">
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
                  {monthDays.map(date => {
                    const record = getRecordForDate(date);
                    const isCurrentDay = isToday(date);
                    
                    return (
                      <TableRow key={format(date, 'yyyy-MM-dd')} className={isCurrentDay ? 'bg-blue-50 dark:bg-blue-950' : ''}>
                        <TableCell className="font-medium">
                          {format(date, 'MMM dd')}
                          {isCurrentDay && <Badge variant="secondary" className="ml-2">Today</Badge>}
                        </TableCell>
                        <TableCell>{record ? formatTime(record.check_in_time) : '-'}</TableCell>
                        <TableCell>{record ? formatTime(record.check_out_time) : '-'}</TableCell>
                        <TableCell>{record ? record.break_minutes : '-'}</TableCell>
                        <TableCell>{record ? formatWorkHours(record.work_hours) : '-'}</TableCell>
                        <TableCell>
                          {record && (
                            <Badge variant={record.status === 'checked_out' ? 'default' : 'secondary'}>
                              {record.status === 'checked_out' ? 'Complete' : 'In Progress'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {record?.note || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance</CardTitle>
          <CardDescription>
            Update your attendance record for {format(new Date(), 'MMMM dd, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clock_in"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clock In Time *</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          placeholder="09:00"
                          {...field}
                          disabled={saving}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clock_out"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clock Out Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          placeholder="17:00"
                          {...field}
                          disabled={saving}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="break_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Break Minutes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="60"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={saving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional note about your work day..."
                        className="resize-none"
                        {...field}
                        disabled={saving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Attendance
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
