const groupModel = require('./groupModel');
const { clearGroupCache } = require('./groupUtils');

const badWordRegex = /(anjing|bangsat|babi|kontol|memek|sange|tolol|goblok|asu|bodoh|cacat|ngentot|kampret|silit)/i;

async function handleGroupParticipantsUpdate(sock, update) {
    try {
        const { id: jid, participants, action } = update;
        clearGroupCache(jid);

        const groupData = groupModel.getGroup(jid);
        let groupMeta;
        try {
            groupMeta = await sock.groupMetadata(jid);
        } catch {
            return;
        }
        const groupName = groupMeta.subject;

        for (const participant of participants) {
            const name = '@' + participant.split('@')[0];

            if (action === 'add' && groupData.welcome) {
                const defaultMsg = `👋 Selamat datang di *${groupName}*, ${name}!\n\nSemoga betah dan jangan lupa baca deskripsi grup ya.`;
                const text = groupData.customWelcomeMsg
                    ? groupData.customWelcomeMsg.replace('@user', name).replace('@group', groupName)
                    : defaultMsg;

                await sock.sendMessage(jid, { text, mentions: [participant] });
            }

            if (action === 'remove' && groupData.goodbye) {
                const defaultMsg = `👋 ${name} telah meninggalkan grup. Sampai jumpa lagi!`;
                const text = groupData.customGoodbyeMsg
                    ? groupData.customGoodbyeMsg.replace('@user', name).replace('@group', groupName)
                    : defaultMsg;

                await sock.sendMessage(jid, { text, mentions: [participant] });
            }
        }
    } catch (err) {
        console.error('[GROUP EVENT ERROR]', err.message);
    }
}

module.exports = { handleGroupParticipantsUpdate };
