const pad2 = (value: number): string => String(value).padStart(2, '0');

const toDate = (value: number): Date => new Date(value);

export const formatSelectionDateInput = (value: number): string => {
  const date = toDate(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const formatSelectionHourInput = (value: number): string => pad2(toDate(value).getHours());

export const buildSelectionRangeFromDateHourInputs = (
  startDate: string,
  startHour: string,
  endDate: string,
  endHour: string,
): [number, number] | null => {
  if (!startDate || !endDate) {
    return null;
  }

  const start = new Date(`${startDate}T${startHour || '00'}:00:00`).getTime();
  const end = new Date(`${endDate}T${endHour || '00'}:00:00`).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  return [start, end];
};
