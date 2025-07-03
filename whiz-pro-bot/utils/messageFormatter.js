const config = require('../config.js'); // Adjust path as necessary if this file moves deeper

// --- Helper function for "hidden" link ---
function formatHiddenLink(url) {
    if (!url || typeof url !== 'string') return '';
    return url.split('').join('\u200B'); // Zero Width Space
}
// --- End Helper function ---

// --- Standard Message Footer ---
function getBotFooter() {
    const hiddenGroupLink = formatHiddenLink(config.whatsappGroupUrl);
    return `\n\n---\n${config.footerText}\nGroup: ${hiddenGroupLink}`;
}
// --- End Standard Message Footer ---

/**
 * Formats and sends a message from the bot.
 * Attempts to send the main logo as a thumbnail with the text message.
 * Appends the standard bot footer.
 * For owner commands, can optionally send a specific owner image.
 *
 * @param {object} sock - The Baileys socket instance.
 * @param {string} chatId - The JID to send the message to.
 * @param {string} text - The main text content of the message.
 * @param {object} [options={}] - Additional options.
 * @param {object} [options.quotedMsg=null] - The message to reply to.
 * @param {boolean} [options.withLogo=true] - Whether to attempt sending the main logo.
 * @param {boolean} [options.withOwnerImage=false] - Whether to attempt sending the owner command image.
 */
async function formatAndSendMessage(sock, chatId, text, options = {}) {
    const { quotedMsg = null, withLogo = true, withOwnerImage = false } = options;
    let fullMessageText = text;

    // Prepare message object for Baileys
    let messageOptions = {};
    if (quotedMsg) {
        messageOptions.quoted = quotedMsg;
    }

    // Add footer
    fullMessageText += getBotFooter();

    // Handle images (logo or owner image)
    // We will send the image first, then the text message as a follow-up,
    // as sending image with long caption or complex text can be problematic with link previews.
    // Alternatively, use contextInfo for thumbnail, but that's also complex.

    let imageUrlToSend = null;
    if (withOwnerImage && config.ownerCmdImageUrl) {
        imageUrlToSend = config.ownerCmdImageUrl;
    } else if (withLogo && config.mainLogoUrl) {
        imageUrlToSend = config.mainLogoUrl;
    }

    try {
        if (imageUrlToSend) {
            await sock.sendMessage(chatId, {
                image: { url: imageUrlToSend },
                caption: fullMessageText // Send text as caption to the image
            }, messageOptions); // messageOptions for quoted reply context
        } else {
            // If no image, send text message directly
            await sock.sendMessage(chatId, { text: fullMessageText }, messageOptions);
        }
    } catch (error) {
        // Fallback to text only if image send fails or if no image was intended
        console.error(`Error sending message with image/logo (falling back to text): ${error.message}`);
        addLog(`Error sending message with image/logo to ${chatId}: ${error.message}`, 'ERROR');
        try {
            await sock.sendMessage(chatId, { text: fullMessageText }, messageOptions); // Fallback
        } catch (textError) {
            console.error(`Error sending fallback text message to ${chatId}: ${textError.message}`);
            addLog(`Fallback text message also failed for ${chatId}: ${textError.message}`, 'ERROR');
        }
    }
}


module.exports = {
    formatHiddenLink, // Export if needed elsewhere, though primarily used in getBotFooter
    getBotFooter,
    formatAndSendMessage
};
