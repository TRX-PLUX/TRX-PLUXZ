const db = require('./database');

function getGroup(jid) {
    if (!db.groups.has(jid)) {
        db.groups.set(jid, {
            jid,
            welcome: true,
            goodbye: true,
            antiLink: false,
            antiSpam: false,
            antiToxic: false,
            autoReply: false,
            muted: false, // bot bisu di grup ini (owner-only)
            nsfw: false,
            gameEnabled: true,
            customWelcomeMsg: '',
            customGoodbyeMsg: '',
            blacklistWords: [],
            createdAt: Date.now(),
        });
    }
    return db.groups.get(jid);
}

function updateGroup(jid, partial) {
    return db.groups.update(jid, partial);
}

function toggleSetting(jid, key) {
    const group = getGroup(jid);
    const newValue = !group[key];
    updateGroup(jid, { [key]: newValue });
    return newValue;
}

module.exports = { getGroup, updateGroup, toggleSetting };
