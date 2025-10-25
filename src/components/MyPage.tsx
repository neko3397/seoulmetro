import React, { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useWatchProgress } from '../hooks/useWatchProgress';
import { Video } from '../types/video';
import { useEffect } from 'react';
import logo from "../assets/logo.png";
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface MyPageProps {
    videosByCategory: Record<string, Video[]>;
    onBack?: () => void;
}

// Helper: render calendar grid for given YYYY-MM and ISO date logs
function renderMonthCalendar(yearMonth: string, logs: string[]) {
    // This function is no longer used, calendar is rendered inline
    return [];
}

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const MyPage: React.FC<MyPageProps> = ({ videosByCategory, onBack }) => {
    const { progressData, getProgressPercentage } = useWatchProgress();
    const saved = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
    let initialParsed: any = null;
    try {
        if (saved) initialParsed = JSON.parse(saved);
    } catch (e) {
        initialParsed = null;
    }

    const [user, setUser] = useState<any>(initialParsed);
    const employeeId = user?.employeeId;

    const [logs, setLogs] = useState<string[]>([]); // ISO dates
    const [yearMonth, setYearMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    useEffect(() => {
        const fetchLogs = async () => {
            if (!employeeId) return;
            try {
                const v = Date.now();
                // Use local mock server when running on localhost for safe testing
                const apiBase = `https://${(window as any).__SUPABASE_PROJECT_ID__}.supabase.co/functions/v1/make-server-a8898ff1`;

                const res = await fetch(`${apiBase}/users/${employeeId}/attendance/logs?month=${yearMonth}&v=${v}`, {
                    headers: { 'Authorization': `Bearer ${(window as any).__SUPABASE_ANON_KEY__}` }, cache: 'no-store'
                });
                if (res.ok) {
                    const data = await res.json();
                    setLogs((data.logs || []).map((l: any) => new Date(l.timestamp).toISOString()));
                }
            } catch (e) {
                console.error('Error fetching attendance logs', e);
            }
        };

        fetchLogs();
    }, [employeeId, yearMonth]);
    // Optional forced attendance dates for testing/dev. Supported sources (in priority):
    // 1) window.__FORCED_ATTENDANCE_DATES__ = ['YYYY-MM-DD','YYYY-MM-DD']
    // 2) localStorage.forceAttendanceDates = JSON.stringify([...]) or comma-separated string
    const forcedRaw = typeof window !== 'undefined' ? (window as any).__FORCED_ATTENDANCE_DATES__ ?? localStorage.getItem('forceAttendanceDates') : null;

    const forcedDatesSet: Set<string> = React.useMemo(() => {
        if (!forcedRaw) return new Set();
        try {
            if (Array.isArray(forcedRaw)) {
                return new Set(forcedRaw.map((d: any) => String(d).slice(0, 10)));
            }
            // try parse JSON
            if (typeof forcedRaw === 'string') {
                const trimmed = forcedRaw.trim();
                if (trimmed.startsWith('[')) {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) return new Set(parsed.map((d: any) => String(d).slice(0, 10)));
                }
                // comma-separated fallback
                return new Set(trimmed.split(',').map(s => s.trim()).filter(Boolean).map(s => s.slice(0, 10)));
            }
        } catch (e) {
            console.warn('Failed to parse forced attendance dates', e);
        }
        return new Set();
    }, [forcedRaw]);

    const logsSet = React.useMemo(() => new Set(logs.map(l => l.slice(0, 10))), [logs]);
    const toggleAttendance = async (newState: boolean) => {
        if (!user) return;

        const prev = { ...user };

        // Optimistic update locally + state
        const optimistic = { ...user, attendance: newState };
        setUser(optimistic);
        localStorage.setItem('currentUser', JSON.stringify(optimistic));

        // Try to sync to server
        try {
            const v = Date.now();
            const apiBase = `https://${(window as any).__SUPABASE_PROJECT_ID__ || ''}.supabase.co/functions/v1/make-server-a8898ff1`;

            const res = await fetch(`${apiBase}/users/${employeeId}/attendance?v=${v}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(window as any).__SUPABASE_ANON_KEY__ || ''}`,
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({ attendance: newState })
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                // rollback
                setUser(prev);
                localStorage.setItem('currentUser', JSON.stringify(prev));
                toast.error(`출석 동기화 실패: ${res.status} ${text}`);
                console.error('Failed to sync attendance to server', res.status, text);
                return;
            }

            const data = await res.json();
            // update local copy with server-canonical user
            if (data?.user) {
                setUser(data.user);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
            }

            toast.success(newState ? '출석이 확인되었습니다.' : '출석이 취소되었습니다.');
        } catch (e) {
            // rollback
            setUser(prev);
            localStorage.setItem('currentUser', JSON.stringify(prev));
            toast.error('네트워크 오류로 출석 동기화에 실패했습니다.');
            console.error('Error syncing attendance:', e);
        }
    };

    const allVideos: Video[] = useMemo(() => {
        return Object.values(videosByCategory).flat();
    }, [videosByCategory]);

    // 평균 시청률
    const averagePercentage = useMemo(() => {
        if (allVideos.length === 0) return 0;
        const sum = allVideos.reduce((acc, v) => acc + getProgressPercentage(v.id, v.duration), 0);
        return Math.round((sum / allVideos.length) * 10) / 10; // 소수 첫째 자리
    }, [allVideos, getProgressPercentage]);

    // Attendance stats for the selected month
    const [yearStr, monthStr] = yearMonth.split('-').map(s => s);
    const daysInSelectedMonth = useMemo(() => {
        const y = Number(yearStr);
        const m = Number(monthStr) - 1;
        return new Date(y, m + 1, 0).getDate();
    }, [yearMonth]);

    const attendanceCount = useMemo(() => {
        const set = new Set(logs.map(d => d.slice(0, 10)));
        const y = Number(yearStr);
        const m = Number(monthStr);
        let cnt = 0;
        set.forEach(dateStr => {
            const d = new Date(dateStr);
            if (d.getFullYear() === y && d.getMonth() + 1 === m) cnt++;
        });
        return cnt;
    }, [logs, yearMonth]);

    const attendanceRate = daysInSelectedMonth > 0 ? Math.round((attendanceCount / daysInSelectedMonth) * 1000) / 10 : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* 메인 컨텐츠 */}
            <main className="container mx-auto px-4 pt-24">
                {/* 환영 섹션 */}
                <div className="mb-8 text-center">
                    <div className="mb-6">
                        {user && (
                            <div>
                                <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                                    {user.name}님의 마이페이지
                                </h1>

                                <p className="text-slate-500 max-w-2xl mx-auto">
                                    학습 진행 상황과 출석 정보를 확인하세요.
                                </p>
                            </div>
                        )}
                    </div>
                </div>



                {/* 출석 달력 카드 */}
                <div className="mb-8">
                    <div className="relative overflow-hidden rounded-2xl p-4 shadow-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 hover:scale-[1.02] transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 pointer-events-none"></div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">출석 달력</h3>
                            <div className="flex flex-col flex-column items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => {
                                        const [y, m] = yearMonth.split('-').map(Number);
                                        const prev = new Date(y, m - 2);
                                        setYearMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
                                    }} className="bg-white/20 hover:bg-white/30 text-slate-800 border-white/30"><ArrowLeft /></Button>
                                    <div className="font-medium text-slate-800 text-lg">{yearMonth}</div>
                                    <Button size="sm" variant="outline" onClick={() => {
                                        const [y, m] = yearMonth.split('-').map(Number);
                                        const next = new Date(y, m);
                                        setYearMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
                                    }} className="bg-white/20 hover:bg-white/30 text-slate-800 border-white/30"><ArrowRight /></Button>
                                </div>

                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="text-slate-800 text-sm whitespace-nowrap max-w-[5.5rem] truncate">출석률</div>
                                    <div className="font-semibold text-slate-800 text-lg">{attendanceRate}%</div>
                                </div>
                                <div className="w-64">
                                    <Progress value={attendanceRate} className="h-3" />
                                </div>
                            </div>
                            <div className="bg-white rounded-lg p-4">
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full min-w-[280px] border-collapse text-slate-800">
                                        <thead>
                                            <tr>
                                                {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                                                    <th key={d} className="text-center text-sm font-medium h-8 min-w-[40px] text-slate-600">{d}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const year = Number(yearMonth.split('-')[0]);
                                                const month = Number(yearMonth.split('-')[1]) - 1;
                                                const firstDay = new Date(year, month, 1).getDay();
                                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                                const totalCells = firstDay + daysInMonth;
                                                const rows = [];
                                                for (let row = 0; row < Math.ceil(totalCells / 7); row++) {
                                                    const cells = [];
                                                    for (let col = 0; col < 7; col++) {
                                                        const dayIndex = row * 7 + col - firstDay + 1;
                                                        if (dayIndex < 1 || dayIndex > daysInMonth) {
                                                            cells.push(<td key={`empty-${row}-${col}`} className="h-10 min-w-[40px]"></td>);
                                                        } else {
                                                            const iso = new Date(year, month, dayIndex).toISOString().slice(0, 10);
                                                            // Checked if there is a real attendance log OR if a forced test date is set.
                                                            const checked = logsSet.has(iso) || forcedDatesSet.has(iso);
                                                            const isToday = iso === new Date().toISOString().slice(0, 10);
                                                            cells.push(
                                                                <td key={`day-${dayIndex}`} className="text-center h-10 min-w-[40px]">
                                                                    <div
                                                                        role="button"
                                                                        aria-pressed={checked}
                                                                        aria-label={`${yearMonth}-${String(dayIndex).padStart(2, '0')}`}
                                                                        className={`mx-auto flex items-center justify-center rounded-full transition-all duration-150 ${checked ? 'bg-green-500 text-white' : 'bg-transparent text-slate-800'} ${isToday ? 'ring-2 ring-primary' : ''} w-8 h-8 md:w-10 md:h-10`}
                                                                    >
                                                                        <span className="select-none text-sm md:text-base">{dayIndex}</span>
                                                                    </div>
                                                                </td>
                                                            );
                                                        }
                                                    }
                                                    rows.push(<tr key={row}>{cells}</tr>);
                                                }
                                                return rows;
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 평균 시청률 카드 */}
                <div className="mb-8">
                    <div className="relative overflow-hidden rounded-2xl p-4 shadow-lg bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 hover:scale-[1.02] transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 pointer-events-none"></div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-4">전체 평균 시청률</h3>
                            <div className="bg-white/10 rounded-lg p-4">
                                <div className="flex items-center gap-6">
                                    <div className="text-4xl font-extrabold text-slate-800">{averagePercentage}%</div>
                                    <div className="flex-1">
                                        <Progress value={averagePercentage} className="h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 영상별 시청현황 */}
                <div className="mb-8">
                    <h3 className="text-2xl font-bold text-slate-800 mb-6">영상별 시청현황</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {allVideos.map((v) => {
                            const progress = progressData[v.id];
                            const percent = getProgressPercentage(v.id, v.duration);
                            return (
                                <div key={v.id} className="relative overflow-hidden rounded-2xl p-4 shadow-lg bg-gradient-to-br from-slate-100 to-slate-200 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 border border-slate-200">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="relative flex-shrink-0">
                                            <div className="w-40 h-24 rounded-lg overflow-hidden bg-muted">
                                                <img
                                                    src={v.thumbnail}
                                                    alt={v.title}
                                                    className="w-full h-full object-cover"
                                                />
                                                <Badge
                                                    variant="secondary"
                                                    className="absolute bottom-1 right-1 text-md"
                                                >
                                                    {formatDuration(v.duration)}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold truncate text-slate-800">{v.title}</div>
                                            <div className="text-sm text-slate-500 line-clamp-2 mb-3">
                                                {v.description}
                                            </div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-sm text-slate-600">시청률: {percent}%</div>
                                            </div>
                                            <Progress value={Math.max(5, percent)} className="h-2" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MyPage;
