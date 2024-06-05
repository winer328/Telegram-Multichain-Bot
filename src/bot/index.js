const TelegramBot = require('node-telegram-bot-api');

// bot state
const { BOT_STATE, USER_ACTION, GENERAL_ACTION } = require('../constant');

// custom message
const { customEditMessage, customSendMessage } = require("./customMessage");


const bot = new TelegramBot(process.env.BOT_TOKEN);

var botProgram = {
    bot: bot,
    botStarted: false,
    deposit_wallet: '',
    risk_level: 'low',
    risk_percent: 0.2,
    withdraw_wallet: '',
    withdraw_type: '',
    withdraw_comfirm: false,
    tutorial_step: 1,

    start: () => {
        bot.startPolling();
        console.log(` 🔌  ${process.env.BOT_NAME} BOT Connected to Polling...`);

        // Set custom commands
        const commands = [
            { command: 'start', description: 'Start the bot' }
        ];
      
        // Set custom commands when the bot starts up
        botProgram.bot.setMyCommands(commands).then(() => {
            console.log('Custom commands set successfully!');
        }).catch((error) => {
            console.error('Error setting custom commands:', error);
        });

        bot.on('polling_error', (error) => {
            console.log('polling error: ', error); // => 'EFATAL'
            return;
        });

        // when command is entered.
        bot.onText(/.*/, async (message) => {
            const text = message.text;
            if (!text) return;

            // when '/start' command
            if(text === '/start') {
                console.log(message);
                botProgram.botStarted = true;
                console.log('bot action started.');
                
                // delete bot history
                // for (let i = 1; i < 201; i++) {
                //     bot.deleteMessage(message.chat.id,message.message_id-i).catch(er=>{return})
                // }

                await botProgram.goToStartPage(message, true);
                return;
            } else {
                if(botProgram.bot_state == BOT_STATE.WITHDRAW) {
                    if(!botProgram.withdraw_comfirm) {
                        botProgram.withdraw_wallet = message.text;
                        await bot.sendMessage(message.chat.id, 'Your ' + botProgram.withdraw_type + ' address for withdraw is: `' + botProgram.withdraw_wallet + '`.\n If right, please text "Yes".', {
                            parse_mode: "Markdown",
                            reply_markup: JSON.stringify({
                                force_reply: true
                            })
                        });
                        botProgram.withdraw_comfirm = true;
                        return;    
                    } else {
                        if(message.text == 'Yes') {
                            try {
                                console.log('User @' + message.from.username + ' sent ' + botProgram.withdraw_type + ' withdraw request to wallet:\n `' + botProgram.withdraw_wallet + '`');
                                await bot.sendMessage(process.env.ADMIN_CHAT_ID, 'User @' + message.from.username + ' sent ' + botProgram.withdraw_type + ' withdraw request to wallet\n <code>' + botProgram.withdraw_wallet + '</code>', {
                                    parse_mode: "HTML",
                                    reply_markup: JSON.stringify({
                                        force_reply: true
                                    })
                                });
                            } catch(e){
                                console.log(e);
                            }
                            
                            await bot.sendMessage(message.chat.id, 'Your withdraw request is successfully sent to admin.', {
                                reply_markup: JSON.stringify({
                                    force_reply: true
                                })
                            });
                        } else {
                            await bot.sendMessage(message.chat.id, `Please re-type your wallet address in ${botProgram.withdraw_type} for withdraw.`, {
                                reply_markup: JSON.stringify({
                                    force_reply: true
                                })
                            });
                        }
                        botProgram.withdraw_comfirm = false;
                        return;    
                    }
                    
                } else if (botProgram.bot_state == BOT_STATE.INVEST) {
                    if(message.text == 'Yes') {
                        await bot.sendMessage(process.env.ADMIN_CHAT_ID, 'User @' + message.from.username + ' set invest risk to ' + botProgram.risk_percent + '% per day.', {
                            parse_mode: "HTML",
                            reply_markup: JSON.stringify({
                                force_reply: true
                            })
                        });
                        let invest_link = process.env.INVEST_LOW_LINK;
                        if(botProgram.risk_level == 'medium') invest_link = process.env.INVEST_MEDIUM_LINK;
                        else if (botProgram.risk_level == 'high') invest_link = process.env.INVEST_HIGH_LINK;
                        await bot.sendMessage(message.chat.id, `Enjoy Investing with us!\n${invest_link}`, {
                            reply_markup: JSON.stringify({
                                force_reply: true
                            })
                        });
                        return;
                    }
                } else if (botProgram.bot_state == BOT_STATE.DEPOSIT) {
                    if(message.text == 'Yes') {
                        await bot.sendMessage(process.env.ADMIN_CHAT_ID, 'User @' + message.from.username + ' has deposited to ' + botProgram.deposit_wallet, {
                            parse_mode: "HTML",
                            reply_markup: JSON.stringify({
                                force_reply: false
                            })
                        });
                        await bot.sendMessage(message.chat.id, `Your deposit action sent to Admin.`, {
                            reply_markup: JSON.stringify({
                                force_reply: false
                            })
                        });
                        return;
                    }
                }
            }
        })

        // when button clicked
        bot.on('callback_query', async (callback_data) => {
            if (!callback_data.data) return;

            const command = callback_data.data;
            if(command == GENERAL_ACTION.BACK) {
                await botProgram.goToStartPage(callback_data.message, false);
                return;
            } else if(command == GENERAL_ACTION.HELP) {
                await botProgram.goToHelpPage(callback_data.message, false);
                return;
            } else if(command == GENERAL_ACTION.TUTORIAL) {
                try{
                    botProgram.bot_state = BOT_STATE.TUTORIAL;
                    botProgram.tutorial_step = 1;
                    await botProgram.goToTutorialPage(callback_data.message);
                } catch(e){
                    console.log(e);
                }
                return;
            } else if(command == GENERAL_ACTION.TUTORIAL_PREV) {
                botProgram.tutorial_step--;
                if(botProgram.tutorial_step < 1) botProgram.tutorial_step = 1;
                await botProgram.goToTutorialPage(callback_data.message);
                return;
            } else if(command == GENERAL_ACTION.TUTORIAL_PREV) {
                botProgram.tutorial_step--;
                if(botProgram.tutorial_step < 1) botProgram.tutorial_step = 1;
                await botProgram.goToTutorialPage(callback_data.message);
                return;
            } else if(command == USER_ACTION.INVEST) {
                try {
                    await botProgram.gotoInvestPage(callback_data.message);  
                } catch (e){
                    console.log(e);
                }
                return;
            } else if(botProgram.bot_state == BOT_STATE.START) {
                switch(command) {
                    case USER_ACTION.DEPOSIT:
                        await botProgram.gotoDepositPage(callback_data.message);
                        return;

                    case USER_ACTION.WITHDRAW:
                        await botProgram.gotoWithdrawPage(callback_data.message);
                        return;
                    
                }    
            } else if(botProgram.bot_state == BOT_STATE.DEPOSIT) {
                let text = 'Please deposit to this wallet address\n'
                switch(command) {
                    case 'bitcoin':
                        botProgram.deposit_wallet = 'Bitcoin wallet: <code>' + process.env.BITCOIN_WALLET + '</code>';
                        break;
                    case 'litecoin':
                        botProgram.deposit_wallet = 'Litecoin wallet: <code>' + process.env.LITECOIN_WALLET + '</code>';
                        break;
                    case 'usdt-trc20':
                        botProgram.deposit_wallet = 'USDT-TRC20 wallet: <code>' + process.env.USDT_TRC20_WALLET + '</code>';
                        break;
                    case 'tron':
                        botProgram.deposit_wallet = 'TRON wallet: <code>' + process.env.TRON_WALLET + '</code>';
                        break;
                    case 'solana':
                        botProgram.deposit_wallet = 'Solana wallet: <code>' + process.env.SOLANA_WALLET + '</code>';
                        break;
                }
                text += botProgram.deposit_wallet;
                try {
                    await bot.sendMessage(callback_data.message.chat.id, text, {
                        parse_mode: "HTML",
                        reply_markup: JSON.stringify({
                            force_reply: false
                        })
                    });
                    setTimeout(async ()=>{
                        await bot.sendMessage(callback_data.message.chat.id, 'Have you deposited? If right, text "Yes".', {
                            parse_mode: "Markdown",
                            reply_markup: JSON.stringify({
                                force_reply: false
                            })
                        });
                    }, 1000);
                } catch (e) {
                    console.log(e);
                }
                return;
                
            } else if(botProgram.bot_state == BOT_STATE.INVEST) {
                if(command.startsWith("set_risk/")) {
                    let risk_level = command.replace('set_risk/', '');
                    let risk_percent = 0.2;
                    if(risk_level == 'medium') risk_percent = 0.5;
                    else if (risk_level == 'high') risk_percent = 1; 

                    botProgram.risk_level = risk_level;
                    botProgram.risk_percent = risk_percent;
                    await bot.sendMessage(callback_data.message.chat.id, 'You want investment risk to ' + risk_percent + '% per day?\nIf right, type "Yes".', {
                        reply_markup: JSON.stringify({
                            force_reply: false
                        })
                    });
                    return;
                }
            } else if(botProgram.bot_state == BOT_STATE.WITHDRAW) {
                botProgram.withdraw_type = command;
                await bot.sendMessage(callback_data.message.chat.id, `Please enter your ${botProgram.withdraw_type.toUpperCase()} address for withdraw`, {
                    reply_markup: JSON.stringify({
                        force_reply: true
                    })
                });
                return;
            }
            
        })
    },

    goToStartPage: async (message, is_start = true) => {
        // console.log(message.from.username);
        botProgram.chat_id = message.chat.id;
        botProgram.bot_state = BOT_STATE.START;
        const text = "💐 Welcome! 💐\n Please choose an option: Deposit, Withdraw, Invest.";
        const inlineButtons = [     // 💰💹💸💷💶💵💴📈📉📊♻️
            [{ text: ' 📜 Tutorial', callback_data: GENERAL_ACTION.TUTORIAL }],
            [{ text: ' 📈 Deposit (SOL Investment)', callback_data: USER_ACTION.DEPOSIT }],
            [{ text: ' 📉 Withdraw (SOL Investment)', callback_data: USER_ACTION.WITHDRAW }],
            [{ text: ' 💹 Copytrading', callback_data: USER_ACTION.INVEST }],
            [{ text: ' ❓ What is Swarrior', callback_data: GENERAL_ACTION.HELP }]
        ];
        if (is_start) await customSendMessage(bot, message, text, inlineButtons);
        else await customEditMessage(bot, message, text, inlineButtons);
        return;
    },

    goToHelpPage: async (message, is_start = true) => {
        const text = "Welcome to Swarrior.Io, the ultimate High Frequency Trading Bot! Our bot delivers daily returns of 0.2% to 1%, depending on your chosen risk level: low, medium, or high. Best of all, everyone can use Swarrior.Io for free! Copy all trades effortlessly and enjoy profitable trading with a simple profit split for us. Join now and start maximizing your trading potential!";
        const inlineButtons = [[{ text: ' 👈 BACk', callback_data: GENERAL_ACTION.BACK }]];
        if (is_start) await customSendMessage(bot, message, text, inlineButtons);
        else await customEditMessage(bot, message, text, inlineButtons);
        return;
    },

    goToTutorialPage: async (message) => {
        let text = '';
        let bg_url = '';
        let inlineButtons = [
            [{ text: ' ⬅️ Prev Step', callback_data: GENERAL_ACTION.TUTORIAL_PREV }, { text: ' ➡️ Next Step', callback_data: GENERAL_ACTION.TUTORIAL_NEXT }],
            [{ text: ' 👈 BACk', callback_data: GENERAL_ACTION.BACK }]
        ];
        switch(botProgram.tutorial_step) {
            case 1:
                text = "1. Register\n\nOpen this link\nhttps://my.roboforex.com/en/register/?a=xebw";
                bg_url = "./src/assets/tutorial1.jpg";
                inlineButtons = [
                    [{ text: ' ➡️ Next step', callback_data: GENERAL_ACTION.TUTORIAL_NEXT }],
                    [{ text: ' 👈 BACk', callback_data: GENERAL_ACTION.BACK }]
                ];
                break;
            
            case 2:
                text = "2. Verify documents\n\nOpen this link:\nhttps://my.roboforex.com/en/profile/verificationpersonal-data/";
                bg_url = "./src/assets/tutorial2.png";
                break;
        
            case 3:
                text = "3. Create Trading account\n\nOpen this link:\nhttps://my.roboforex.com/en/trading-account/opentrading-account/";
                bg_url = "./src/assets/tutorial3.png";
                break;
    
            case 4:
                text = "4. Deposit Money on Trading Account\n\nOpen this link:\nhttps://my.roboforex.com/en/trading-account/opentrading-account/";
                bg_url = "./src/assets/tutorial4.png";
                break;

            case 5:
                text = '5. Copy Our System\n\nAfter you deposited money, go back to the Bot to "Copytrading" and decide which Risk you want and click on the Link and Subscribe to Trader';
                bg_url = "./src/assets/tutorial5.png";
                inlineButtons = [
                    [{ text: ' ⬅️ Prev Step', callback_data: GENERAL_ACTION.TUTORIAL_PREV }],
                    [{ text: ' 👈 BACk', callback_data: GENERAL_ACTION.BACK }],
                    [{ text: ' 💹 Copytrading', callback_data: USER_ACTION.INVEST }]
                ];
                break;
        }

        await customSendMessage(bot, message, text, inlineButtons, bg_url);
        return;
    },

    gotoDepositPage: async (message, is_start = true) => {
        botProgram.bot_state = BOT_STATE.DEPOSIT;
        const text = `Select the coin that you want to deposit.`;
        const inlineButtons = [
            [{ text: ' 📈 Bitcoin', callback_data: 'bitcoin' }],
            [{ text: ' 📉 Litecoin', callback_data: 'litecoin' }],
            [{ text: ' 💹 USDT-TRC20', callback_data: 'usdt-trc20' }],
            [{ text: ' 💹 TRON', callback_data: 'tron' }],
            [{ text: ' 💹 Solana', callback_data: 'solana' }],
            [{ text: ' 👈 BACk', callback_data: GENERAL_ACTION.BACK }]
        ];

        if (is_start) await customSendMessage(bot, message, text, inlineButtons);
        else await customEditMessage(bot, message, text, inlineButtons);
        return;
    },

    gotoWithdrawPage: async (message, is_start = true) => {
        botProgram.bot_state = BOT_STATE.WITHDRAW;
        const text = `Select the coin that you want to withdraw.`;
        const inlineButtons = [
            [{ text: ' 📈 Bitcoin', callback_data: 'bitcoin' }],
            [{ text: ' 📉 Litecoin', callback_data: 'litecoin' }],
            [{ text: ' 💹 USDT-TRC20', callback_data: 'usdt-trc20' }],
            [{ text: ' 💹 TRON', callback_data: 'tron' }],
            [{ text: ' 💹 Solana', callback_data: 'solana' }],
            [{ text: ' 👈 BACk', callback_data: GENERAL_ACTION.BACK }]
        ];

        if (is_start) await customSendMessage(bot, message, text, inlineButtons);
        else await customEditMessage(bot, message, text, inlineButtons);
        return;
    },

    gotoInvestPage: async (message, is_start = false) => {
        botProgram.bot_state = BOT_STATE.INVEST;
        const text = `Select the invest option you want.`;
        const inlineButtons = [
            [{ text: ' 🟢 Low Risk: 0.2% per day', callback_data: 'set_risk/low' }],
            [{ text: ' 🟡 Medium Risk: 0.5% per day', callback_data: 'set_risk/medium' }],
            [{ text: ' 🔴 High Risk: 1% per day', callback_data: 'set_risk/high' }],
            [{ text: ' 👈 BACk', callback_data: GENERAL_ACTION.BACK }]
        ];

        if (is_start) await customSendMessage(bot, message, text, inlineButtons);
        else await customEditMessage(bot, message, text, inlineButtons);
        return;
    }
    
}


module.exports = botProgram;