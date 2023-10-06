import crypto from 'crypto';

export const genres = [
    { id: 'Any', name: 'Any' },
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 14, name: 'Fantasy' },
    { id: 36, name: 'History' },
    { id: 27, name: 'Horror' },
    { id: 10402, name: 'Music' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Science Fiction' },
    { id: 10770, name: 'TV Movie' },
    { id: 53, name: 'Thriller' },
    { id: 10752, name: 'War' },
    { id: 37, name: 'Western' }
];

export const yearOptions = [
    { id: 'Any', name: 'Any', start: null, end: null },
    ...Array.from({ length: 12 }, (_, i) => ({
        id: `'${2020 - i * 10}s`,
        name: `'${2020 - i * 10}s`,
        start: `${2020 - i * 10}-01-01`,
        end: `${2029 - i * 10}-12-31`,
    }))
];

export function verifyInitData(telegramInitData: string): boolean {
    const urlParams = new URLSearchParams(telegramInitData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    urlParams.sort();
    let dataCheckString = '';
    for (const [key, value] of urlParams.entries()) {
        dataCheckString += `${key}=${value}\n`;
    }
    dataCheckString = dataCheckString.slice(0, -1);
    const secret = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN);
    const calculatedHash = crypto.createHmac('sha256', secret.digest()).update(dataCheckString).digest('hex');

    return calculatedHash === hash;
}