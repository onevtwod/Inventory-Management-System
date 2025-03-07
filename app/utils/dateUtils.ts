/**
 * Date utility functions for handling Malaysia timezone (UTC+8)
 */

/**
 * Get current date-time in Malaysia timezone (UTC+8)
 * @returns Date object representing current time in Malaysia
 */
export function getMalaysiaTime(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
}

/**
 * Format a date to ISO string in Malaysia timezone
 * @param date Optional date to format (defaults to current time)
 * @returns ISO string representing the time in Malaysia timezone
 */
export function getMalaysiaISOString(date?: Date): string {
    const malaysiaTime = date ? new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })) : getMalaysiaTime();
    return malaysiaTime.toISOString();
}

/**
 * Adjust any date to Malaysia timezone
 * @param date Date to adjust
 * @returns Date object adjusted to Malaysia timezone
 */
export function adjustToMalaysiaTime(date: Date): Date {
    return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
}

/**
 * Format a date for display in Malaysia timezone
 * @param dateString ISO date string to format
 * @returns Formatted date string in Malaysia timezone
 */
export function formatMalaysiaTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-MY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kuala_Lumpur'
    });
}

const dateUtils = {
    getMalaysiaTime,
    getMalaysiaISOString,
    adjustToMalaysiaTime,
    formatMalaysiaTime,
};

export default dateUtils; 