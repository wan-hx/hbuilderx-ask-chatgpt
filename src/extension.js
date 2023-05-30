const hx = require("hbuilderx");
const runCommand = require('./main.js');

const getOpenPrompts = require('./data/open_prompts.js');
const showPluginPrompts = require('./libs/plugin_prompt.js');

let AskChatGPTView = hx.window.createWebView("AskChatGPTView", {
    enableScritps: true
});

function activate(context) {

    // 首次使用控制台提示
    setTimeout(() => {
        showPluginPrompts();
    }, 3000);
    
    // chatGPT webview视图
    let askChatGPT = hx.commands.registerCommand('askChatGPT.main', () => {
        AskChatGPTView._webView._html = '';
        AskChatGPTView._webView._msgListeners = [];
        runCommand("GPTWebView",AskChatGPTView);
    });
    context.subscriptions.push(askChatGPT);

    // 编程
    let chatGPTCoding = hx.commands.registerCommand('askChatGPT.coding', () => {
        runCommand("coding");
    });
    context.subscriptions.push(chatGPTCoding);

    // 修复Bug
    let fixBug = hx.commands.registerCommand('askChatGPT.fixBug', () => {
        runCommand("open_actions", '', "fixBug");
    });
    context.subscriptions.push(fixBug);

    // 解释代码
    let explainCode = hx.commands.registerCommand('askChatGPT.explainCode', () => {
        runCommand("open_actions", '' , "explainCode");
    });
    context.subscriptions.push(explainCode);

    // 生成测试用例
    let GenerateTestCases = hx.commands.registerCommand('askChatGPT.GenerateTestCases', () => {
        runCommand("open_actions", '' , "GenerateTestCases");
    });
    context.subscriptions.push(GenerateTestCases);

    // 通过jest生成测试用例
    let GenerateTestCasesUsingJest = hx.commands.registerCommand('askChatGPT.GenerateTestCasesUsingJest', () => {
        runCommand("open_actions", '' , "GenerateTestCasesUsingJest");
    });
    context.subscriptions.push(GenerateTestCasesUsingJest);

    // 设置
    let chatGPTSetting = hx.commands.registerCommand('askChatGPT.setting', () => {
        runCommand("setting");
    });
    context.subscriptions.push(chatGPTSetting);

    // 提示词
    let chatGPTPrompts = hx.commands.registerCommand('askChatGPT.prompts', () => {
        getOpenPrompts("", true);
    });
    context.subscriptions.push(chatGPTPrompts);

    // 打开快捷指令
    let openActions = hx.commands.registerCommand('askChatGPT.openActions', () => {
        runCommand("open_actions");
    });
    context.subscriptions.push(openActions);

    // 创建快捷指令
    let createActions = hx.commands.registerCommand('askChatGPT.createActions', () => {
        runCommand("create_actions");
    });
    context.subscriptions.push(createActions);

    // AI图像生成
    let imagesGenerations = hx.commands.registerCommand('askChatGPT.imagesGenerations', () => {
        runCommand("images_generations");
    });
    context.subscriptions.push(imagesGenerations);

    // 模拟计算token
    let simulateToken = hx.commands.registerCommand('askChatGPT.tokenizer', () => {
        runCommand("tokenizer");
    });
    context.subscriptions.push(simulateToken);

    let help = hx.commands.registerCommand('askChatGPT.help', () => {
        hx.env.openExternal('https://wan-dada.github.io/hbuilderx-ask-chatgpt-docs/');
    });
    context.subscriptions.push(help);

    let feedback = hx.commands.registerCommand('askChatGPT.feedback', () => {
        hx.env.openExternal('https://ext.dcloud.net.cn/plugin?id=11702#rating');
    });
    context.subscriptions.push(feedback);
};

function deactivate() {

};

module.exports = {
    activate,
    deactivate
}
