
const { getStreamFromURL, uploadImgbb } = global.utils;

module.exports = {
  config: {
    name: "antichangeinfobox",
    version: "2.0.0",
    author: "NTKhang / Bassit",
    countDown: 5,
    role: 0,
    description: {
      en: "Protect group information from unwanted changes"
    },
    category: "box chat",
    guide: {
      en:
        "{pn} avt on/off\n" +
        "{pn} name on/off\n" +
        "{pn} nickname on/off\n" +
        "{pn} theme on/off\n" +
        "{pn} emoji on/off"
    }
  },

  langs: {
    en: {
      antiChangeAvatarOn: "✅ Anti-change avatar enabled.",
      antiChangeAvatarOff: "✅ Anti-change avatar disabled.",
      missingAvt: "❌ Group avatar not found.",
      antiChangeNameOn: "✅ Anti-change group name enabled.",
      antiChangeNameOff: "✅ Anti-change group name disabled.",
      antiChangeNicknameOn: "✅ Anti-change nickname enabled.",
      antiChangeNicknameOff: "✅ Anti-change nickname disabled.",
      antiChangeThemeOn: "✅ Anti-change theme enabled.",
      antiChangeThemeOff: "✅ Anti-change theme disabled.",
      antiChangeEmojiOn: "✅ Anti-change emoji enabled.",
      antiChangeEmojiOff: "✅ Anti-change emoji disabled."
    }
  },

  onStart: async function ({
    message,
    event,
    args,
    threadsData,
    getLang
  }) {
    const type = (args[0] || "").toLowerCase();
    const action = (args[1] || "").toLowerCase();
    const threadID = event.threadID;

    if (!["on", "off"].includes(action)) {
      return message.reply(
        "Usage:\n" +
        "antichangeinfobox avt on/off\n" +
        "antichangeinfobox name on/off\n" +
        "antichangeinfobox nickname on/off\n" +
        "antichangeinfobox theme on/off\n" +
        "antichangeinfobox emoji on/off"
      );
    }

    const data = await threadsData.get(
      threadID,
      "data.antiChangeInfoBox",
      {}
    );

    let key;
    let value;

    switch (type) {
      case "avt":
      case "avatar":
      case "image": {
        key = "avatar";

        if (action === "on") {
          const threadData = await threadsData.get(threadID);

          if (!threadData.imageSrc) {
            return message.reply(getLang("missingAvt"));
          }

          try {
            const uploaded = await uploadImgbb(
              threadData.imageSrc
            );
            value = uploaded.image.url;
          } catch (err) {
            console.error("[ANTI-CHANGE AVATAR SETUP]", err);
            return message.reply("Failed to save group avatar.");
          }
        }
        break;
      }

      case "name": {
        key = "name";

        if (action === "on") {
          const threadData = await threadsData.get(threadID);
          value = threadData.threadName;
        }
        break;
      }

      case "nickname": {
        key = "nickname";

        if (action === "on") {
          const threadData = await threadsData.get(threadID);
          value = {};

          for (const member of threadData.members || []) {
            value[String(member.userID)] = member.nickname;
          }
        }
        break;
      }

      case "theme": {
        key = "theme";

        if (action === "on") {
          const threadData = await threadsData.get(threadID);
          value = threadData.threadThemeID;
        }
        break;
      }

      case "emoji": {
        key = "emoji";

        if (action === "on") {
          const threadData = await threadsData.get(threadID);
          value = threadData.emoji;
        }
        break;
      }

      default:
        return message.reply("Unknown protection type.");
    }

    if (action === "off") {
      delete data[key];
    } else {
      data[key] = value;
    }

    await threadsData.set(
      threadID,
      data,
      "data.antiChangeInfoBox"
    );

    const langKey =
      "antiChange" +
      key.charAt(0).toUpperCase() + key.slice(1) +
      action.charAt(0).toUpperCase() + action.slice(1);

    return message.reply(getLang(langKey));
  },

  onEvent: async function ({
    event,
    threadsData,
    role,
    api
  }) {
    const {
      threadID,
      logMessageType,
      logMessageData,
      author
    } = event;

    const botID = String(api.getCurrentUserID());
    const authorID = String(author);
    const isAdmin = role >= 1 || authorID === botID;

    const data = await threadsData.get(
      threadID,
      "data.antiChangeInfoBox",
      {}
    );

    switch (logMessageType) {
      case "log:thread-image": {
        if (!data.avatar) return;

        return async function () {
          if (isAdmin) {
            const imageSrc = logMessageData.url;

            if (!imageSrc) {
              await threadsData.set(
                threadID,
                "REMOVE",
                "data.antiChangeInfoBox.avatar"
              );
              return;
            }

            try {
              const uploaded = await uploadImgbb(imageSrc);
              await threadsData.set(
                threadID,
                uploaded.image.url,
                "data.antiChangeInfoBox.avatar"
              );
            } catch (err) {
              console.error("[ANTI-CHANGE AVATAR SAVE]", err);
            }

            return;
          }

          if (data.avatar === "REMOVE") return;

          try {
            await api.changeGroupImage(
              await getStreamFromURL(data.avatar),
              threadID
            );
          } catch (err) {
            console.error("[ANTI-CHANGE AVATAR]", err);
          }
        };
      }

      case "log:thread-name": {
        if (!Object.prototype.hasOwnProperty.call(data, "name")) {
          return;
        }

        return async function () {
          if (isAdmin) {
            await threadsData.set(
              threadID,
              logMessageData.name,
              "data.antiChangeInfoBox.name"
            );
            return;
          }

          try {
            await api.setTitle(data.name, threadID);
          } catch (err) {
            console.error("[ANTI-CHANGE NAME]", err);
          }
        };
      }

      case "log:user-nickname": {
        if (!Object.prototype.hasOwnProperty.call(data, "nickname")) {
          return;
        }

        return async function () {
          const { nickname, participant_id } = logMessageData;
          const memberID = String(participant_id);

          if (isAdmin) {
            await threadsData.set(
              threadID,
              nickname,
              `data.antiChangeInfoBox.nickname.${memberID}`
            );
            return;
          }

          const oldNickname = data.nickname[memberID];

          if (oldNickname === undefined) return;

          try {
            await api.changeNickname(
              oldNickname,
              threadID,
              memberID
            );
          } catch (err) {
            console.error("[ANTI-CHANGE NICKNAME]", err);
          }
        };
      }

      case "log:thread-color": {
        if (!Object.prototype.hasOwnProperty.call(data, "theme")) {
          return;
        }

        return async function () {
          if (isAdmin) {
            await threadsData.set(
              threadID,
              logMessageData.theme_id,
              "data.antiChangeInfoBox.theme"
            );
            return;
          }

          try {
            await api.changeThreadColor(
              data.theme || "196241301102133",
              threadID
            );
          } catch (err) {
            console.error("[ANTI-CHANGE THEME]", err);
          }
        };
      }

      case "log:thread-icon": {
        if (!Object.prototype.hasOwnProperty.call(data, "emoji")) {
          return;
        }

        return async function () {
          if (isAdmin) {
            await threadsData.set(
              threadID,
              logMessageData.thread_icon,
              "data.antiChangeInfoBox.emoji"
            );
            return;
          }

          try {
            await api.changeThreadEmoji(
              data.emoji,
              threadID
            );
          } catch (err) {
            console.error("[ANTI-CHANGE EMOJI]", err);
          }
        };
      }
    }
  }
};
