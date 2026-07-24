const userModel = require('../../lib/userModel');
const moment = require('moment-timezone');

module.exports = {
    command: ['profile', 'me', 'status', 'limit'],
    category: 'tools',
    description: 'Menampilkan profil dan status akun kamu',
    limitCost: 0,
    execute: async (msg, { sock, jid, sender, isOwner }) => {
        const user = userModel.getUser(sender);
        const isPremium = userModel.isPremiumActive(user);

        let premiumInfo = 'Free';
        if (isOwner) {
            premiumInfo = 'Owner / Pemilik';
        } else if (isPremium) {
            premiumInfo = user.premiumExpired === 0
                ? 'Lifetime ✨'
                : `Sampai ${moment(user.premiumExpired).format('DD MMM YYYY')} ✨`;
        }

        const verifiedStatus = user.channelVerified ? '✅ Terverifikasi' : '⏳ Belum verifikasi';
        const ageVerified = user.isVerified18 ? '✅ Terverifikasi 18+' : '⏳ Belum verifikasi 18+';

        const text = `╭─❍❁『 *PROFILE* 』❁❍\n`
            + `│ 👤 Nomor    : ${sender.split('@')[0]}\n`
            + `│ 📛 Nama     : ${user.name || '-'}\n`
            + `│ 📢 Channel  : ${verifiedStatus}\n`
            + `│ 🔞 18+      : ${ageVerified}\n`
            + `│ 💎 Status   : ${premiumInfo}\n`
            + `│ ⚡ Limit    : ${user.dailyLimit}\n`
            + `│ 🎯 Level    : ${user.level}\n`
            + `│ ✨ XP       : ${user.xp}\n`
            + `│ 💰 Balance  : Rp${user.balance.toLocaleString('id-ID')}\n`
            + `│ 🔑 Kode Ref : ${user.referralCode}\n`
            + `│ 👥 Referral : ${user.referralCount} orang (Rp${user.referralEarnings.toLocaleString('id-ID')})\n`
            + `│ 📅 Bergabung: ${moment(user.createdAt).format('DD MMM YYYY')}\n`
            + `╰────────────────`;

        await sock.sendMessage(jid, { text }, { quoted: msg });
    }
};
