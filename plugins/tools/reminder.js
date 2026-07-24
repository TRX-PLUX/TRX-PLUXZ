const moment = require('moment-timezone');

const reminders = new Map();

function formatReminder(reminder) {
    return `${reminder.text} — ${moment(reminder.at).tz('Asia/Jakarta').format('DD MMM YYYY HH:mm')}`;
}

module.exports = {
    command: ['reminder', 'alarm'],
    category: 'tools',
    description: 'Membuat reminder atau alarm sederhana.',
    cooldown: 3,
    limitCost: 1,
    execute: async (msg, { sock, jid, args, text }) => {
        const [when, ...rest] = args;
        const note = rest.join(' ') || text;
        if (!when || !note) {
            return sock.sendMessage(jid, { text: '📝 Format: *.reminder <HH:mm> <teks>*\nContoh: .reminder 20:30 Belajar' }, { quoted: msg });
        }

        const now = moment().tz('Asia/Jakarta');
        const target = moment.tz(`${now.format('YYYY-MM-DD')} ${when}`, 'YYYY-MM-DD HH:mm', 'Asia/Jakarta');
        if (!target.isValid() || target.isBefore(now)) {
            return sock.sendMessage(jid, { text: '⚠️ Waktu reminder tidak valid atau sudah lewat.' }, { quoted: msg });
        }

        const id = `${jid}:${Date.now()}`;
        reminders.set(id, { id, jid, text: note, at: target.valueOf() });
        setTimeout(async () => {
            const reminder = reminders.get(id);
            if (!reminder) return;
            reminders.delete(id);
            await sock.sendMessage(jid, { text: `⏰ Reminder: ${reminder.text}` }, { quoted: msg });
        }, target.valueOf() - Date.now());

        await sock.sendMessage(jid, { text: `✅ Reminder disimpan untuk ${target.format('DD MMM YYYY HH:mm')}.

${note}` }, { quoted: msg });
    }
};
