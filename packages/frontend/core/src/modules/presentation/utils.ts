export const formatLocalDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatLocalTime = (d: Date) => {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getDefaultMeetingTimes = () => {
  const now = new Date();
  const ms15Min = 15 * 60 * 1000;
  const roundedStart = new Date(Math.round(now.getTime() / ms15Min) * ms15Min);
  const roundedEnd = new Date(roundedStart.getTime() + 30 * 60 * 1000);

  return {
    startDate: formatLocalDate(roundedStart),
    startTime: formatLocalTime(roundedStart),
    endDate: formatLocalDate(roundedEnd),
    endTime: formatLocalTime(roundedEnd),
  };
};

export const calculateEndTime = (dateStr: string, timeStr: string) => {
  if (!dateStr || !timeStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (
    isNaN(year) || isNaN(month) || isNaN(day) ||
    isNaN(hours) || isNaN(minutes)
  ) {
    return null;
  }
  const startDateObj = new Date(year, month - 1, day, hours, minutes, 0);
  const endDateObj = new Date(startDateObj.getTime() + 30 * 60 * 1000);
  return {
    endDate: formatLocalDate(endDateObj),
    endTime: formatLocalTime(endDateObj),
  };
};
