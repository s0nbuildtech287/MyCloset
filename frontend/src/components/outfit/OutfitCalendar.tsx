import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Calendar as CalendarIcon, Sparkles } from 'lucide-react';

interface Outfit {
  id: string;
  name: string;
  thumbnailUrl: string;
}

interface DiaryEntry {
  id: string;
  outfitId: string;
  wearDate: string;
  outfit: Outfit;
}

export default function OutfitCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch diary entries and outfits on mount and month change
  const fetchData = async () => {
    try {
      setLoading(true);
      const [diaryRes, outfitsRes] = await Promise.all([
        apiClient.get('/diary'),
        apiClient.get('/outfits'),
      ]);
      setDiaryEntries(diaryRes.data);
      setOutfits(outfitsRes.data);
    } catch (err) {
      console.error('Failed to load calendar planner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Starting day of the week (Monday-based where 0=Monday, 6=Sunday)
  let startDay = new Date(year, month, 1).getDay();
  // Adjust JS getDay() (0 = Sunday) to Monday-based (0 = Monday, 6 = Sunday)
  startDay = startDay === 0 ? 6 : startDay - 1;

  // Format date helper: YYYY-MM-DD in local time
  const getLocalDateString = (day: number) => {
    const d = new Date(year, month, day);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  // Navigations
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Click day cell
  const handleDayClick = (day: number) => {
    const formattedDate = getLocalDateString(day);
    setSelectedDate(formattedDate);
    setIsModalOpen(true);
  };

  // Schedule / Assign Outfit to date
  const handleScheduleOutfit = async (outfitId: string) => {
    if (!selectedDate) return;
    try {
      await apiClient.post('/diary', {
        outfitId,
        wearDate: selectedDate,
      });
      setIsModalOpen(false);
      fetchData(); // reload
    } catch (err) {
      console.error('Failed to schedule outfit:', err);
    }
  };

  // Remove Outfit schedule
  const handleUnscheduleOutfit = async (entryId: string) => {
    try {
      await apiClient.delete(`/diary/${entryId}`);
      setIsModalOpen(false);
      fetchData(); // reload
    } catch (err) {
      console.error('Failed to delete diary entry:', err);
    }
  };

  // Find entry for a specific day
  const getEntryForDay = (day: number) => {
    const formattedDate = getLocalDateString(day);
    return diaryEntries.find((entry) => {
      const entryDateOnly = new Date(entry.wearDate).toISOString().split('T')[0];
      return entryDateOnly === formattedDate;
    });
  };

  const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  // Render day cells
  const dayCells = [];
  for (let i = 0; i < startDay; i++) {
    dayCells.push(<div key={`empty-${i}`} className="aspect-square bg-stone-50/20 border border-stone-100/40 rounded-xl" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const entry = getEntryForDay(day);
    const formattedDate = getLocalDateString(day);
    const isToday = new Date().toISOString().split('T')[0] === formattedDate;

    dayCells.push(
      <button
        key={`day-${day}`}
        onClick={() => handleDayClick(day)}
        className={`aspect-square border border-stone-100 rounded-xl bg-white flex flex-col justify-between items-stretch hover:border-[#C4704F] transition-all relative overflow-hidden group shadow-sm ${
          isToday ? 'ring-1 ring-[#C4704F]' : ''
        }`}
      >
        {/* Date badge — always floats in top-left corner */}
        <span className={`absolute top-1 left-1 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full leading-none z-20 ${
          isToday ? 'bg-[#C4704F] text-white shadow-xs' : 'text-stone-700 bg-white/90 backdrop-blur-xs shadow-xs border border-stone-100'
        }`}>
          {day}
        </span>

        {entry ? (
          <div className="absolute inset-0 w-full h-full z-10 bg-[#FAF9F6]">
            <img
              src={entry.outfit.thumbnailUrl}
              alt={entry.outfit.name}
              className="object-contain w-full h-full transform group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
            <span className="p-1 rounded-full bg-[#C4704F]/10 text-[#C4704F]">
              <Plus className="h-3 w-3" />
            </span>
          </div>
        )}
      </button>
    );
  }

  // Selected date status inside modal
  const selectedEntry = selectedDate ? diaryEntries.find(e => new Date(e.wearDate).toISOString().split('T')[0] === selectedDate) : null;

  return (
    <div className="bg-white rounded-3xl border border-stone-100 p-6 shadow-sm space-y-6 max-w-4xl mx-auto">
      {/* Calendar Header controls */}
      <div className="flex justify-between items-center pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-[#C4704F]" />
          <h3 className="text-md font-bold text-[#2A2521] font-serif">
            {monthNames[month]} năm {year}
          </h3>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 border border-stone-200 rounded-lg hover:bg-stone-50 text-stone-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 border border-stone-200 rounded-lg hover:bg-stone-50 text-stone-600 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekdays Labels */}
      <div className="grid grid-cols-7 gap-2.5 text-center text-[10px] font-bold text-stone-400 tracking-wider">
        {weekdays.map((d) => (
          <div key={d} className="py-1 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Monthly Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <span className="w-8 h-8 rounded-full border-4 border-[#C4704F] border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2.5">
          {dayCells}
        </div>
      )}

      {/* Scheduling / Selection Modal */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <div>
                <h4 className="font-bold text-md text-[#2A2521] font-serif">Lịch trình ngày</h4>
                <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider mt-0.5">
                  {new Date(selectedDate).toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-stone-50 rounded-lg text-stone-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            {selectedEntry ? (
              // Case 1: Already has outfit scheduled
              <div className="space-y-4 text-center">
                <div className="aspect-square max-w-[200px] mx-auto bg-[#FAF6F1]/50 border border-stone-100 rounded-2xl p-4 flex items-center justify-center">
                  <img
                    src={selectedEntry.outfit.thumbnailUrl}
                    alt={selectedEntry.outfit.name}
                    className="object-contain max-h-full max-w-full"
                  />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-[#2A2521] font-serif">
                    {selectedEntry.outfit.name}
                  </h5>
                  <p className="text-[10px] text-stone-400 mt-0.5">Đã lên lịch mặc cho ngày này</p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => handleUnscheduleOutfit(selectedEntry.id)}
                    className="flex items-center justify-center gap-1.5 w-full py-2 border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hủy lịch mặc đồ
                  </button>
                </div>
              </div>
            ) : (
              // Case 2: Schedule new outfit selection
              <div className="space-y-4">
                <div className="flex gap-1.5 items-center text-xs font-semibold text-stone-600">
                  <Sparkles className="h-3.5 w-3.5 text-[#C4704F]" />
                  Chọn một bộ phối để lên lịch:
                </div>

                {outfits.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-stone-200 rounded-xl text-stone-400 text-xs">
                    Tủ đồ chưa lưu bộ phối nào.
                    <br />
                    Hãy qua mục Ghép Đồ để sáng tạo trước nhé!
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 max-h-[250px] overflow-y-auto pr-1">
                    {outfits.map((outfit) => (
                      <button
                        key={outfit.id}
                        onClick={() => handleScheduleOutfit(outfit.id)}
                        className="p-2 border border-stone-100 rounded-xl bg-stone-50/30 hover:border-[#C4704F] hover:bg-white transition-all text-center flex flex-col items-center gap-1.5"
                      >
                        <div className="aspect-square w-full bg-[#FAF6F1]/50 border border-stone-100 rounded-lg p-1 flex items-center justify-center overflow-hidden">
                          <img
                            src={outfit.thumbnailUrl}
                            alt={outfit.name}
                            className="object-contain max-h-full max-w-full"
                          />
                        </div>
                        <span className="text-[9px] font-bold text-stone-600 line-clamp-1 block w-full leading-none">
                          {outfit.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
